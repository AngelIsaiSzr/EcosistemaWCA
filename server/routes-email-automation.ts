import type { Express, Request, Response, NextFunction } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  emailAutomationLogs,
  emailAutomationSettings,
  emailWeekTemplates,
} from "@shared/schema";
import {
  getCampaignWeekIndex,
  parseRecipientList,
} from "@shared/director-emails";
import { ensureEmailAutomationTables } from "./db/ensure-email-automation";
import {
  sendDirectorTemplateEmail,
  startDirectorEmailScheduler,
  getMexicoCalendarParts,
} from "./services/director-email-scheduler";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized: Admin access required" });
  }
  next();
}

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  recipients: z.union([z.array(z.string()), z.string()]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  sendWeekday: z.number().int().min(1).max(7).optional(),
});

const templateSchema = z.object({
  label: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  bodyText: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const testSchema = z.object({
  templateId: z.number().int().positive(),
  to: z.string().email().optional(),
});

export function registerEmailAutomationRoutes(app: Express) {
  ensureEmailAutomationTables().catch((err) => {
    console.error("No se pudieron crear tablas de automatización de correos:", err);
  });
  startDirectorEmailScheduler();

  app.get("/api/admin/email-automation", requireAdmin, async (_req, res) => {
    try {
      await ensureEmailAutomationTables();
      const [settings] = await db.select().from(emailAutomationSettings).limit(1);
      const templates = await db
        .select()
        .from(emailWeekTemplates)
        .orderBy(asc(emailWeekTemplates.weekIndex));
      const logs = await db
        .select()
        .from(emailAutomationLogs)
        .orderBy(desc(emailAutomationLogs.createdAt))
        .limit(30);

      const localNow = getMexicoCalendarParts();
      const weekIndex = settings
        ? getCampaignWeekIndex(settings.startDate, localNow.dateIso)
        : null;

      res.json({
        settings,
        templates,
        logs,
        preview: {
          currentWeekIndex: weekIndex,
          timezone: "America/Mexico_City",
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo cargar la automatización" });
    }
  });

  app.patch("/api/admin/email-automation/settings", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const parsed = settingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
      }

      const [settings] = await db.select().from(emailAutomationSettings).limit(1);
      if (!settings) {
        return res.status(404).json({ message: "Configuración no encontrada" });
      }

      const recipients =
        parsed.data.recipients !== undefined
          ? parseRecipientList(parsed.data.recipients)
          : undefined;

      const [updated] = await db
        .update(emailAutomationSettings)
        .set({
          ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
          ...(recipients !== undefined ? { recipients } : {}),
          ...(parsed.data.startDate !== undefined ? { startDate: parsed.data.startDate } : {}),
          ...(parsed.data.sendHour !== undefined ? { sendHour: parsed.data.sendHour } : {}),
          ...(parsed.data.sendWeekday !== undefined ? { sendWeekday: parsed.data.sendWeekday } : {}),
          updatedAt: new Date(),
        })
        .where(eq(emailAutomationSettings.id, settings.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo guardar la configuración" });
    }
  });

  app.patch("/api/admin/email-automation/templates/:id", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const parsed = templateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos" });
      }

      const [updated] = await db
        .update(emailWeekTemplates)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(emailWeekTemplates.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo actualizar la plantilla" });
    }
  });

  app.post("/api/admin/email-automation/test", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const parsed = testSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos" });
      }

      const [template] = await db
        .select()
        .from(emailWeekTemplates)
        .where(eq(emailWeekTemplates.id, parsed.data.templateId))
        .limit(1);

      if (!template) {
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }

      const [settings] = await db.select().from(emailAutomationSettings).limit(1);
      const recipients = parsed.data.to
        ? [parsed.data.to]
        : parseRecipientList(settings?.recipients);

      if (recipients.length === 0) {
        return res.status(400).json({
          message: "Indica un correo de prueba o configura destinatarios",
        });
      }

      await sendDirectorTemplateEmail({
        template,
        recipients,
        kind: "test",
      });

      res.json({ message: "Correo de prueba enviado", recipients });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "No se pudo enviar la prueba",
      });
    }
  });
}
