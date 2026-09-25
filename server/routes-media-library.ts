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
import type { IntegrationFormDefinition } from "@shared/integration-form";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);
const UPLOAD_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const UPLOAD_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

type LibraryItem = { url: string; label: string; source: string };

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
  out: LibraryItem[],
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
  out: Map<string, LibraryItem>,
  url: string | null | undefined,
  label: string,
  source: string,
) {
  const u = (url || "").trim();
  if (!u) return;
  if (!out.has(u)) out.set(u, { url: u, label, source });
}

function isInsideRoot(root: string, resolved: string) {
  const normalizedRoot = path.resolve(root);
  const normalized = path.resolve(resolved);
  return normalized === normalizedRoot || normalized.startsWith(normalizedRoot + path.sep);
}

function resolveUnderRoot(root: string, relative: string): string | null {
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) return null;
  const resolved = path.resolve(root, relative);
  if (!isInsideRoot(root, resolved)) return null;
  return resolved;
}

type ManagedRoots = {
  libraryRoot: string;
  formFilesRoot: string;
  publicMediaRoots: string[];
};

function resolveManagedFile(url: string, roots: ManagedRoots): string | null {
  const trimmed = (url || "").trim().split("?")[0] || "";
  if (!trimmed.startsWith("/media/")) return null;

  if (trimmed.startsWith("/media/library/")) {
    return resolveUnderRoot(roots.libraryRoot, trimmed.slice("/media/library/".length));
  }
  if (trimmed.startsWith("/media/form-files/")) {
    return resolveUnderRoot(roots.formFilesRoot, trimmed.slice("/media/form-files/".length));
  }
  // Sitio estático: /media/foo.png
  const relative = trimmed.slice("/media/".length);
  for (const root of roots.publicMediaRoots) {
    const resolved = resolveUnderRoot(root, relative);
    if (resolved && fs.existsSync(resolved)) return resolved;
  }
  // Prefer first public root even if missing (for overwrite create)
  if (roots.publicMediaRoots[0]) {
    return resolveUnderRoot(roots.publicMediaRoots[0], relative);
  }
  return null;
}

async function rewriteImageReferences(oldUrl: string, newUrl: string | null) {
  const old = oldUrl.trim();
  if (!old) return;
  const next = (newUrl ?? "").trim();

  try {
    const team = await storage.getAllTeamMembers();
    for (const m of team) {
      if ((m.image || "").trim() === old) {
        await storage.updateTeamMember(m.id, { image: next });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const cards = await storage.getAllPresentationCards();
    for (const c of cards) {
      const patch: Record<string, unknown> = {};
      if ((c.image || "").trim() === old) patch.image = next;
      const theme = (c.theme || {}) as { backgroundImage?: string };
      if ((theme.backgroundImage || "").trim() === old) {
        patch.theme = { ...theme, backgroundImage: next };
      }
      if (Object.keys(patch).length) {
        await storage.updatePresentationCard(c.id, patch as never);
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const testimonials = await storage.getAllTestimonials();
    for (const t of testimonials) {
      if ((t.image || "").trim() === old) {
        await storage.updateTestimonial(t.id, { image: next });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const allies = await storage.getAllAllies();
    for (const a of allies) {
      if ((a.image || "").trim() === old) {
        await storage.updateAlly(a.id, { image: next });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const people = await db.select().from(orgChartPeople);
    for (const p of people) {
      if ((p.photoUrl || "").trim() === old) {
        await db
          .update(orgChartPeople)
          .set({ photoUrl: next || null, updatedAt: new Date() })
          .where(eq(orgChartPeople.id, p.id));
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const forms = await storage.listIntegrationForms();
    for (const form of forms) {
      const schema = (form.schema || {}) as IntegrationFormDefinition;
      const bg = schema.theme?.backgroundImage?.trim() || "";
      if (bg !== old) continue;
      const nextSchema: IntegrationFormDefinition = {
        ...schema,
        theme: {
          ...schema.theme,
          backgroundImage: next,
        },
      };
      await storage.updateIntegrationForm(form.id, { schema: nextSchema });
    }
  } catch {
    /* ignore */
  }
}

export function registerMediaLibraryRoutes(app: Express) {
  const LIBRARY_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "media-library");
  const FORM_FILES_ROOT = path.resolve(process.cwd(), "uploads", "form-files");
  const PUBLIC_MEDIA_ROOTS = [
    path.resolve(process.cwd(), "client", "public", "media"),
    path.resolve(process.cwd(), "dist", "public", "media"),
    path.resolve(process.cwd(), "public", "media"),
  ];
  fs.mkdirSync(LIBRARY_UPLOAD_ROOT, { recursive: true });
  fs.mkdirSync(FORM_FILES_ROOT, { recursive: true });
  app.use("/media/library", express.static(LIBRARY_UPLOAD_ROOT, { maxAge: "7d" }));

  const roots: ManagedRoots = {
    libraryRoot: LIBRARY_UPLOAD_ROOT,
    formFilesRoot: FORM_FILES_ROOT,
    publicMediaRoots: PUBLIC_MEDIA_ROOTS,
  };

  const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
  });

  app.get("/api/media/library", requireStaff, async (_req, res) => {
    try {
      const byUrl = new Map<string, LibraryItem>();

      const fileItems: LibraryItem[] = [];
      for (const root of PUBLIC_MEDIA_ROOTS) {
        walkMediaDir(root, "/media", fileItems, "media");
      }
      walkMediaDir(LIBRARY_UPLOAD_ROOT, "/media/library", fileItems, "subida");
      walkMediaDir(FORM_FILES_ROOT, "/media/form-files", fileItems, "formularios");
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

      try {
        const forms = await storage.listIntegrationForms();
        for (const form of forms) {
          const schema = form.schema as IntegrationFormDefinition | null;
          const bg = schema?.theme?.backgroundImage;
          pushUrl(byUrl, bg, `${form.title} (fondo)`, "formularios");
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
      if (!url) {
        return res.status(400).json({ message: "Falta la URL de la imagen" });
      }
      const filePath = resolveManagedFile(url, roots);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await rewriteImageReferences(url, "");
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
        if (!url) {
          return res.status(400).json({ message: "Falta la URL de la imagen" });
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

        const existingPath = resolveManagedFile(url, roots);
        if (existingPath && (fs.existsSync(existingPath) || url.startsWith("/media/"))) {
          const dir = path.dirname(existingPath);
          fs.mkdirSync(dir, { recursive: true });
          // Conservar la misma URL pública cuando el archivo vive en /media/...
          fs.writeFileSync(existingPath, file.buffer);
          await rewriteImageReferences(url, url);
          return res.json({
            url,
            label: path.basename(existingPath),
            replaced: true,
          });
        }

        // URL externa u oriunda no local: subir a biblioteca y reescribir referencias.
        const safeBase = path
          .basename(file.originalname, ext)
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 60)
          .replace(/^-|-$/g, "") || "imagen";
        const safeName = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeBase}${ext}`;
        const nextUrl = `/media/library/${safeName}`;
        fs.writeFileSync(path.join(LIBRARY_UPLOAD_ROOT, safeName), file.buffer);
        await rewriteImageReferences(url, nextUrl);
        res.json({ url: nextUrl, label: file.originalname || safeName, replaced: true });
      } catch (error) {
        console.error("POST /api/media/library/replace", error);
        res.status(500).json({ message: "No se pudo reemplazar la imagen" });
      }
    },
  );
}
