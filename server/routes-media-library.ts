import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { orgChartPeople } from "@shared/schema";
import { eq } from "drizzle-orm";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);
const UPLOAD_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const UPLOAD_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.role !== "talento")) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized: Admin access required" });
  }
  next();
}

function walkMediaDir(
  dir: string,
  baseUrl: string,
  out: { url: string; label: string; source: string }[],
  source = "media",
) {
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
      walkMediaDir(full, `${baseUrl}/${entry.name}`, out, source);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    out.push({
      url: `${baseUrl}/${entry.name}`.replace(/\\/g, "/"),
      label: entry.name,
      source,
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

function resolveLibraryFile(libraryRoot: string, url: string): string | null {
  const trimmed = (url || "").trim();
  const prefix = "/media/library/";
  if (!trimmed.startsWith(prefix)) return null;
  const relative = trimmed.slice(prefix.length);
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) return null;
  const resolved = path.resolve(libraryRoot, relative);
  if (!resolved.startsWith(libraryRoot + path.sep) && resolved !== libraryRoot) return null;
  return resolved;
}

export function registerMediaLibraryRoutes(app: Express) {
  const LIBRARY_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "media-library");
  fs.mkdirSync(LIBRARY_UPLOAD_ROOT, { recursive: true });
  app.use("/media/library", express.static(LIBRARY_UPLOAD_ROOT, { maxAge: "7d" }));

  const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
  });

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
        walkMediaDir(root, "/media", fileItems, "media");
      }
      walkMediaDir(LIBRARY_UPLOAD_ROOT, "/media/library", fileItems, "subida");
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

  app.post(
    "/api/media/library/upload",
    requireStaff,
    memoryUpload.single("file"),
    async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No se recibió archivo" });
        }
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (!UPLOAD_MIME.has(file.mimetype) || !UPLOAD_EXT.has(ext)) {
          return res.status(400).json({
            message: "Solo se permiten imágenes PNG, JPEG o WebP",
          });
        }
        const safeBase = path
          .basename(file.originalname, ext)
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 60)
          .replace(/^-|-$/g, "") || "imagen";
        const safeName = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeBase}${ext}`;
        fs.writeFileSync(path.join(LIBRARY_UPLOAD_ROOT, safeName), file.buffer);
        const url = `/media/library/${safeName}`;
        res.json({ url, label: file.originalname || safeName });
      } catch (error) {
        console.error("POST /api/media/library/upload", error);
        res.status(500).json({ message: "No se pudo subir la imagen" });
      }
    },
  );

  app.delete("/api/media/library", requireAdmin, async (req, res) => {
    try {
      const url = String(req.body?.url || "").trim();
      const filePath = resolveLibraryFile(LIBRARY_UPLOAD_ROOT, url);
      if (!filePath) {
        return res.status(400).json({
          message: "Solo se pueden borrar imágenes subidas a /media/library/",
        });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Archivo no encontrado" });
      }
      fs.unlinkSync(filePath);
      res.json({ message: "Imagen eliminada", url });
    } catch (error) {
      console.error("DELETE /api/media/library", error);
      res.status(500).json({ message: "No se pudo eliminar la imagen" });
    }
  });

  app.post(
    "/api/media/library/replace",
    requireAdmin,
    memoryUpload.single("file"),
    async (req, res) => {
      try {
        const url = String(req.body?.url || req.query.url || "").trim();
        const filePath = resolveLibraryFile(LIBRARY_UPLOAD_ROOT, url);
        if (!filePath) {
          return res.status(400).json({
            message: "Solo se pueden reemplazar imágenes subidas a /media/library/",
          });
        }
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: "Archivo no encontrado" });
        }
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No se recibió archivo" });
        }
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (!UPLOAD_MIME.has(file.mimetype) || !UPLOAD_EXT.has(ext)) {
          return res.status(400).json({
            message: "Solo se permiten imágenes PNG, JPEG o WebP",
          });
        }
        // Conservar la misma URL pública (mismo nombre de archivo).
        fs.writeFileSync(filePath, file.buffer);
        res.json({
          url,
          label: path.basename(filePath),
          replaced: true,
        });
      } catch (error) {
        console.error("POST /api/media/library/replace", error);
        res.status(500).json({ message: "No se pudo reemplazar la imagen" });
      }
    },
  );
}
