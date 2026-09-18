import type { Express, Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { ineditoLandingSettings } from "@shared/schema";
import { ensureIneditoLandingTables } from "./db/ensure-inedito-landing";

const TALENTO_ROLE = "talento";

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
    updatedAt: row.updatedAt,
  };
}

export function registerIneditoLandingRoutes(app: Express) {
  /** Público: estado de la landing (para gatear /inedito en el cliente). */
  app.get("/api/inedito/landing", async (_req, res) => {
    try {
      const row = await getLandingSettingsRow();
      res.json({ isEnabled: row.isEnabled });
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
          isEnabled: z.boolean(),
        })
        .parse(req.body);

      const current = await getLandingSettingsRow();
      const [updated] = await db
        .update(ineditoLandingSettings)
        .set({
          isEnabled: body.isEnabled,
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
