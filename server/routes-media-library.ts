import type { Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { db } from "./db";
import { orgChartPeople } from "@shared/schema";
import { eq } from "drizzle-orm";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);

function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.role !== "talento")) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
}

function walkMediaDir(dir: string, baseUrl: string, out: { url: string; label: string; source: string }[]) {
  if (!fs.existsSync(dir)) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMediaDir(full, `${baseUrl}/${entry.name}`, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    out.push({
      url: `${baseUrl}/${entry.name}`.replace(/\\/g, "/"),
      label: entry.name,
      source: "media",
    });
  }
}

function pushUrl(
  out: Map<string, { url: string; label: string; source: string }>,
  url: string | null | undefined,
  label: string,
  source: string,
) {
  const u = (url || "").trim();
  if (!u) return;
  if (!out.has(u)) out.set(u, { url: u, label, source });
}

export function registerMediaLibraryRoutes(app: Express) {
  app.get("/api/media/library", requireStaff, async (_req, res) => {
    try {
      const byUrl = new Map<string, { url: string; label: string; source: string }>();

      const mediaRoots = [
        path.resolve(process.cwd(), "client", "public", "media"),
        path.resolve(process.cwd(), "dist", "public", "media"),
        path.resolve(process.cwd(), "public", "media"),
      ];
      const fileItems: { url: string; label: string; source: string }[] = [];
      for (const root of mediaRoots) {
        walkMediaDir(root, "/media", fileItems);
      }
      for (const item of fileItems) {
        if (!byUrl.has(item.url)) byUrl.set(item.url, item);
      }

      try {
        const team = await storage.getAllTeamMembers();
        for (const m of team) {
          pushUrl(byUrl, m.image, m.name, "equipo");
        }
      } catch {
        /* ignore */
      }

      try {
        const cards = await storage.getAllPresentationCards();
        for (const c of cards) {
          pushUrl(byUrl, c.image, c.name, "tarjeta");
          const bg = (c.theme as { backgroundImage?: string } | null)?.backgroundImage;
          pushUrl(byUrl, bg, `${c.name} (fondo)`, "tarjeta");
        }
      } catch {
        /* ignore */
      }

      try {
        const testimonials = await storage.getAllTestimonials();
        for (const t of testimonials) {
          pushUrl(byUrl, t.image, t.name, "testimonio");
        }
      } catch {
        /* ignore */
      }

      try {
        const allies = await storage.getAllAllies();
        for (const a of allies) {
          pushUrl(byUrl, a.image, a.name, "aliado");
        }
      } catch {
        /* ignore */
      }

      try {
        const people = await db
          .select({ name: orgChartPeople.name, photoUrl: orgChartPeople.photoUrl })
          .from(orgChartPeople)
          .where(eq(orgChartPeople.isActive, true));
        for (const p of people) {
          pushUrl(byUrl, p.photoUrl, p.name, "organigrama");
        }
      } catch {
        /* ignore */
      }

      const items = Array.from(byUrl.values()).sort((a, b) =>
        a.label.localeCompare(b.label, "es"),
      );
      res.json({ items });
    } catch (error) {
      console.error("GET /api/media/library", error);
      res.status(500).json({ message: "No se pudo cargar la biblioteca" });
    }
  });
}
