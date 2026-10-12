import type { Express, Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { ineditoLandingSettings } from "@shared/schema";
import { normalizeLandingContent } from "@shared/inedito-landing";
import { ensureIneditoLandingTables } from "./db/ensure-inedito-landing";

const TALENTO_ROLE = "talento";
const MAX_CONTENT_BYTES = 400_000;

function requireTalento(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user || req.user.role !== TALENTO_ROLE) {
    return res.status(403).json({ message: "Unauthorized: Talento y Bienestar access required" });
  }
  next();
}

async function getLandingSettingsRow() {
  await ensureIneditoLandingTables();
  const rows = await db.select().from(ineditoLandingSettings).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(ineditoLandingSettings)
    .values({ isEnabled: true })
    .returning();
  return created!;
}

function serializeLanding(row: typeof ineditoLandingSettings.$inferSelect) {
  return {
    id: row.id,
    isEnabled: row.isEnabled,
    customized: row.content != null,
    content: normalizeLandingContent(row.content),
    updatedAt: row.updatedAt,
  };
}

export function registerIneditoLandingRoutes(app: Express) {
  /** Público: estado y contenido de la landing (para gatear y pintar /inedito). */
  app.get("/api/inedito/landing", async (_req, res) => {
    try {
      const row = await getLandingSettingsRow();
      res.json({ isEnabled: row.isEnabled, content: normalizeLandingContent(row.content) });
    } catch (error) {
      console.error("GET /api/inedito/landing", error);
      res.status(500).json({ message: "No se pudo cargar el estado de la landing" });
    }
  });

  app.get("/api/talento/inedito/landing", requireTalento, async (_req, res) => {
    try {
      const row = await getLandingSettingsRow();
      res.json(serializeLanding(row));
    } catch (error) {
      console.error("GET /api/talento/inedito/landing", error);
      res.status(500).json({ message: "No se pudo cargar la configuración" });
    }
  });

  app.patch("/api/talento/inedito/landing", requireTalento, async (req, res) => {
    try {
      const body = z
        .object({
          isEnabled: z.boolean().optional(),
          /** Objeto = guardar; null = volver al diseño original. */
          content: z.unknown().optional(),
        })
        .parse(req.body);

      if (body.content !== undefined && body.content !== null) {
        if (JSON.stringify(body.content).length > MAX_CONTENT_BYTES) {
          return res.status(413).json({ message: "La landing es demasiado grande para guardarse." });
        }
      }

      const current = await getLandingSettingsRow();
      const [updated] = await db
        .update(ineditoLandingSettings)
        .set({
          ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
          ...(body.content !== undefined
            ? { content: body.content === null ? null : normalizeLandingContent(body.content) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(ineditoLandingSettings.id, current.id))
        .returning();

      res.json(serializeLanding(updated!));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
      }
      console.error("PATCH /api/talento/inedito/landing", error);
      res.status(500).json({ message: "No se pudo guardar la configuración" });
    }
  });
}
