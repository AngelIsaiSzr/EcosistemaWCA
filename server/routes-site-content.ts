import type { Express } from "express";
import { pool } from "./db";
import { SITE_CONTENT_SCHEMAS, isSiteContentKey } from "@shared/site-content";

let ensured = false;

async function ensureSiteContentTable() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_by TEXT
    )
  `);
  ensured = true;
}

type SiteContentRow = { key: string; data: unknown; updated_at: Date; updated_by: string | null };

export function registerSiteContentRoutes(app: Express) {
  app.get("/api/site-content", async (_req, res) => {
    try {
      await ensureSiteContentTable();
      const { rows } = await pool.query<SiteContentRow>(
        "SELECT key, data, updated_at, updated_by FROM site_content",
      );
      const content: Record<string, unknown> = {};
      const meta: Record<string, { updatedAt: string; updatedBy: string | null }> = {};
      for (const row of rows) {
        if (!isSiteContentKey(row.key)) continue;
        content[row.key] = row.data;
        meta[row.key] = { updatedAt: new Date(row.updated_at).toISOString(), updatedBy: row.updated_by };
      }
      res.json({ content, meta });
    } catch (error) {
      console.error("[site-content] Error al leer:", error);
      res.status(500).json({ message: "No se pudo cargar el contenido del sitio" });
    }
  });

  app.put("/api/site-content/:key", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      const { key } = req.params;
      if (!isSiteContentKey(key)) {
        return res.status(404).json({ message: "Sección desconocida" });
      }
      const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(req.body?.data);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return res.status(400).json({ message: issue?.message ?? "Datos inválidos" });
      }
      await ensureSiteContentTable();
      const updatedBy = req.user.email ?? req.user.username ?? null;
      const { rows } = await pool.query<SiteContentRow>(
        `INSERT INTO site_content (key, data, updated_at, updated_by)
         VALUES ($1, $2::jsonb, NOW(), $3)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW(), updated_by = EXCLUDED.updated_by
         RETURNING key, data, updated_at, updated_by`,
        [key, JSON.stringify(parsed.data), updatedBy],
      );
      const row = rows[0];
      res.json({
        key: row.key,
        data: row.data,
        updatedAt: new Date(row.updated_at).toISOString(),
        updatedBy: row.updated_by,
      });
    } catch (error) {
      console.error("[site-content] Error al guardar:", error);
      res.status(500).json({ message: "No se pudo guardar el contenido" });
    }
  });

  app.delete("/api/site-content/:key", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      const { key } = req.params;
      if (!isSiteContentKey(key)) {
        return res.status(404).json({ message: "Sección desconocida" });
      }
      await ensureSiteContentTable();
      await pool.query("DELETE FROM site_content WHERE key = $1", [key]);
      res.json({ ok: true });
    } catch (error) {
      console.error("[site-content] Error al restaurar:", error);
      res.status(500).json({ message: "No se pudo restaurar el contenido" });
    }
  });
}
