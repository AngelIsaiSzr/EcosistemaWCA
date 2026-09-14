import type { Express, Request, Response, NextFunction } from "express";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  emailAutomationLogs,
  emailAutomationSettings,
  emailWeekTemplates,
} from "@shared/schema";
import {
  EMAIL_SENDER_PROFILES,
  isValidRecipientEmail,
  parseRecipientList,
  SEMESTER_CALENDARS,
  type SemesterCalendarId,
} from "@shared/director-emails";
import {
  applySemesterCalendar,
  ensureEmailAutomationTables,
} from "./db/ensure-email-automation";
import {
  sendDirectorTemplateEmail,
  startDirectorEmailScheduler,
  getMexicoCalendarParts,
} from "./services/director-email-scheduler";
import { getSenderAvailability } from "./services/email";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized: Admin access required" });
  }
  next();
}

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  recipients: z.union([z.array(z.string()), z.string()]).optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  senderId: z.enum(["contacto", "tec_angel"]).optional(),
  activeSemester: z.enum(["AD26", "FJ26"]).optional(),
});

const templateSchema = z.object({
  label: z.string().min(1).optional(),
  sendDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .nullable()
    .optional(),
  subject: z.string().min(1).optional(),
  bodyText: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const testSchema = z.object({
  templateId: z.number().int().positive(),
  to: z.string().min(3).optional(),
});

const applySemesterSchema = z.object({
  semesterId: z.enum(["AD26", "FJ26"]),
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
        .limit(40);

      const [officialCount] = await db
        .select({ value: count() })
        .from(emailAutomationLogs)
        .where(
          and(
            eq(emailAutomationLogs.kind, "weekly"),
            inArray(emailAutomationLogs.status, ["sent", "partial"]),
          ),
        );

      const localNow = getMexicoCalendarParts();
      const upcoming = templates
        .filter((t) => t.enabled && t.sendDate && t.sendDate >= localNow.dateIso)
        .sort((a, b) => String(a.sendDate).localeCompare(String(b.sendDate)))[0];
      const dueToday = templates.find(
        (t) => t.enabled && t.sendDate === localNow.dateIso,
      );

      const semesterId = (settings?.activeSemester === "FJ26" ? "FJ26" : "AD26") as SemesterCalendarId;

      res.json({
        settings,
        templates,
        logs,
        stats: {
          officialSent: Number(officialCount?.value ?? 0),
        },
        senders: EMAIL_SENDER_PROFILES,
        senderAvailability: getSenderAvailability(),
        semesters: Object.values(SEMESTER_CALENDARS).map((s) => ({
          id: s.id,
          label: s.label,
          classStart: s.classStart,
          classEnd: s.classEnd,
        })),
        preview: {
          today: localNow.dateIso,
          timezone: "America/Mexico_City",
          activeSemester: semesterId,
          semesterMeta: SEMESTER_CALENDARS[semesterId],
          dueToday: dueToday
            ? { id: dueToday.id, label: dueToday.label, sendDate: dueToday.sendDate }
            : null,
          next: upcoming
            ? { id: upcoming.id, label: upcoming.label, sendDate: upcoming.sendDate }
            : null,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo cargar la automatización" });
    }
  });

  app.get("/api/admin/email-automation/stats", requireAdmin, async (_req, res) => {
    try {
      await ensureEmailAutomationTables();
      const [officialCount] = await db
        .select({ value: count() })
        .from(emailAutomationLogs)
        .where(
          and(
            eq(emailAutomationLogs.kind, "weekly"),
            inArray(emailAutomationLogs.status, ["sent", "partial"]),
          ),
        );
      res.json({ officialSent: Number(officialCount?.value ?? 0) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudieron cargar estadísticas" });
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

      if (parsed.data.senderId === "tec_angel" && !getSenderAvailability().tec_angel) {
        return res.status(400).json({
          message:
            "El correo Tec aún no está configurado. Agrega SMTP_TEC_PASS (y opcional SMTP_TEC_USER) en Render.",
        });
      }

      const [updated] = await db
        .update(emailAutomationSettings)
        .set({
          ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
          ...(recipients !== undefined ? { recipients } : {}),
          ...(parsed.data.sendHour !== undefined ? { sendHour: parsed.data.sendHour } : {}),
          ...(parsed.data.senderId !== undefined ? { senderId: parsed.data.senderId } : {}),
          ...(parsed.data.activeSemester !== undefined
            ? { activeSemester: parsed.data.activeSemester }
            : {}),
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

  app.post("/api/admin/email-automation/apply-semester", requireAdmin, async (req, res) => {
    try {
      const parsed = applySemesterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Semestre inválido" });
      }
      const calendar = await applySemesterCalendar(parsed.data.semesterId);
      const templates = await db
        .select()
        .from(emailWeekTemplates)
        .orderBy(asc(emailWeekTemplates.weekIndex));
      res.json({
        message: `Calendario ${calendar.label} aplicado`,
        calendar: {
          id: calendar.id,
          label: calendar.label,
          classStart: calendar.classStart,
          classEnd: calendar.classEnd,
        },
        templates,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo aplicar el calendario del semestre" });
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
        ? parseRecipientList(parsed.data.to)
        : parseRecipientList(settings?.recipients);

      if (recipients.length === 0) {
        return res.status(400).json({
          message: "Indica un correo de prueba válido (incluye @tec.mx) o configura destinatarios",
        });
      }

      if (parsed.data.to && !isValidRecipientEmail(parsed.data.to.trim())) {
        return res.status(400).json({
          message: "El correo de prueba no es válido",
        });
      }

      const result = await sendDirectorTemplateEmail({
        template,
        recipients,
        kind: "test",
        senderId: settings?.senderId || "contacto",
      });

      const failed = result.results.filter((r) => !r.ok);
      res.json({
        message:
          failed.length === 0
            ? "Correo de prueba enviado"
            : "Envío parcial: algunos destinatarios fallaron",
        recipients,
        results: result.results,
        status: result.status,
        senderId: settings?.senderId || "contacto",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "No se pudo enviar la prueba",
      });
    }
  });

  app.delete("/api/admin/email-automation/logs/:id", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const [log] = await db
        .select()
        .from(emailAutomationLogs)
        .where(eq(emailAutomationLogs.id, id))
        .limit(1);

      if (!log) {
        return res.status(404).json({ message: "Registro no encontrado" });
      }
      if (log.kind !== "test") {
        return res.status(400).json({
          message: "Solo se pueden eliminar envíos de prueba del historial",
        });
      }

      await db.delete(emailAutomationLogs).where(eq(emailAutomationLogs.id, id));
      res.json({ message: "Eliminado" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo eliminar el registro" });
    }
  });
}
