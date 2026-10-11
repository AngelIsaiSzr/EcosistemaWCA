import type { Express, Request, Response, NextFunction } from "express";
import { and, asc, count, desc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  emailAutomationLogs,
  emailAutomationSettings,
  emailGroups,
  emailWeekTemplates,
} from "@shared/schema";
import { isValidRecipientEmail, parseRecipientList } from "@shared/director-emails";
import { ensureEmailAutomationTables } from "./db/ensure-email-automation";
import {
  getMexicoCalendarParts,
  resolveTemplateRecipients,
  sendDirectorTemplateEmail,
  startDirectorEmailScheduler,
} from "./services/director-email-scheduler";
import { getSenderAvailability, isKnownSender, listSenderProfiles } from "./services/email";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized: Admin access required" });
  }
  next();
}

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const recipientsInput = z.union([z.array(z.string()), z.string()]);

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  recipients: recipientsInput.optional(),
  ccRecipients: recipientsInput.optional(),
  bccRecipients: recipientsInput.optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  senderId: z.string().refine(isKnownSender, "Remitente no válido").optional(),
});

const GROUP_COLORS = ["blue", "purple", "green", "amber", "rose", "cyan"] as const;

const groupSchema = z.object({
  name: z.string().trim().min(1, "Ponle nombre al grupo").max(60),
  kind: z.enum(["semester", "event"]).default("semester"),
  color: z.enum(GROUP_COLORS).default("blue"),
  startDate: dateIso.nullable().optional(),
  endDate: dateIso.nullable().optional(),
});

const templateFields = z.object({
  label: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  sendDate: dateIso.nullable(),
  subject: z.string().trim().min(1, "El asunto es obligatorio").max(300),
  bodyText: z.string().trim().min(1, "Falta el texto plano"),
  bodyHtml: z.string().trim().min(1, "Falta el diseño del correo"),
  enabled: z.boolean(),
  groupId: z.number().int().positive().nullable(),
  presetKey: z.string().max(20).nullable(),
  recipientsOverride: recipientsInput.nullable(),
  sendHour: z.number().int().min(0).max(23).nullable(),
});

const createTemplateSchema = templateFields.partial({
  enabled: true,
  groupId: true,
  presetKey: true,
  recipientsOverride: true,
  sendHour: true,
  sendDate: true,
});

const createTemplatesSchema = z.union([
  createTemplateSchema,
  z.object({ items: z.array(createTemplateSchema).min(1).max(40) }),
]);

const updateTemplateSchema = templateFields.partial();

const testSchema = z
  .object({
    templateId: z.number().int().positive().optional(),
    draft: z
      .object({
        subject: z.string().min(1),
        bodyText: z.string().min(1),
        bodyHtml: z.string().min(1),
      })
      .optional(),
    to: z.string().min(3).optional(),
  })
  .refine((v) => v.templateId || v.draft, "Falta la plantilla");

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Datos inválidos";
}

function normalizeOverride(value: string | string[] | null | undefined) {
  if (value === undefined) return undefined;
  const list = parseRecipientList(value ?? []);
  return list.length > 0 ? list : null;
}

async function loadSettings() {
  const [settings] = await db.select().from(emailAutomationSettings).limit(1);
  return settings ?? null;
}

export function registerEmailAutomationRoutes(app: Express) {
  ensureEmailAutomationTables().catch((err) => {
    console.error("No se pudieron crear tablas de automatización de correos:", err);
  });
  startDirectorEmailScheduler();

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
      console.error("Error al cargar estadísticas de correos:", error);
      res.status(500).json({ message: "No se pudieron cargar las estadísticas" });
    }
  });

  app.get("/api/admin/email-automation", requireAdmin, async (_req, res) => {
    try {
      await ensureEmailAutomationTables();
      const settings = await loadSettings();
      const templates = await db
        .select()
        .from(emailWeekTemplates)
        .orderBy(asc(emailWeekTemplates.sendDate), asc(emailWeekTemplates.id));
      const groups = await db.select().from(emailGroups).orderBy(asc(emailGroups.startDate), asc(emailGroups.id));
      const logs = await db
        .select()
        .from(emailAutomationLogs)
        .orderBy(desc(emailAutomationLogs.createdAt))
        .limit(60);

      const officialLogs = await db
        .select({
          templateId: emailAutomationLogs.templateId,
          sendDate: emailAutomationLogs.sendDate,
          status: emailAutomationLogs.status,
          createdAt: emailAutomationLogs.createdAt,
        })
        .from(emailAutomationLogs)
        .where(
          and(
            inArray(emailAutomationLogs.kind, ["weekly", "manual"]),
            inArray(emailAutomationLogs.status, ["sent", "partial"]),
          ),
        );

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

      res.json({
        settings,
        templates,
        groups,
        logs,
        sent: officialLogs,
        stats: { officialSent: Number(officialCount?.value ?? 0) },
        senders: listSenderProfiles(),
        senderAvailability: getSenderAvailability(),
        preview: {
          today: localNow.dateIso,
          hour: localNow.hour,
          timezone: "America/Mexico_City",
          next: upcoming
            ? {
                id: upcoming.id,
                label: upcoming.label,
                sendDate: upcoming.sendDate,
                sendHour: upcoming.sendHour ?? settings?.sendHour ?? 9,
              }
            : null,
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
        return res.status(400).json({ message: firstIssue(parsed.error) });
      }

      const settings = await loadSettings();
      if (!settings) {
        return res.status(404).json({ message: "Configuración no encontrada" });
      }

      if (parsed.data.senderId && !getSenderAvailability()[parsed.data.senderId]) {
        return res.status(400).json({
          message:
            parsed.data.senderId === "tec_angel"
              ? "El correo Tec aún no está configurado. Agrega SMTP_TEC_PASS (y opcional SMTP_TEC_USER) en Render."
              : "Ese remitente aún no está configurado en el servidor.",
        });
      }

      const [updated] = await db
        .update(emailAutomationSettings)
        .set({
          ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
          ...(parsed.data.recipients !== undefined
            ? { recipients: parseRecipientList(parsed.data.recipients) }
            : {}),
          ...(parsed.data.ccRecipients !== undefined
            ? { ccRecipients: parseRecipientList(parsed.data.ccRecipients) }
            : {}),
          ...(parsed.data.bccRecipients !== undefined
            ? { bccRecipients: parseRecipientList(parsed.data.bccRecipients) }
            : {}),
          ...(parsed.data.sendHour !== undefined ? { sendHour: parsed.data.sendHour } : {}),
          ...(parsed.data.senderId !== undefined ? { senderId: parsed.data.senderId } : {}),
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

  /* ───────────── Grupos ───────────── */

  app.post("/api/admin/email-automation/groups", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const parsed = groupSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
      const [group] = await db
        .insert(emailGroups)
        .values({
          name: parsed.data.name,
          kind: parsed.data.kind,
          color: parsed.data.color,
          startDate: parsed.data.startDate ?? null,
          endDate: parsed.data.endDate ?? null,
        })
        .returning();
      res.status(201).json(group);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo crear el grupo" });
    }
  });

  app.patch("/api/admin/email-automation/groups/:id", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const id = Number(req.params.id);
      const parsed = groupSchema.partial().safeParse(req.body);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });
      if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
      const [group] = await db.update(emailGroups).set(parsed.data).where(eq(emailGroups.id, id)).returning();
      if (!group) return res.status(404).json({ message: "Grupo no encontrado" });
      res.json(group);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo actualizar el grupo" });
    }
  });

  /** Borra el grupo; sus correos quedan "sin grupo" salvo que se pida borrarlos también. */
  app.delete("/api/admin/email-automation/groups/:id", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });
      if (req.query.withEmails === "1") {
        await db.delete(emailWeekTemplates).where(eq(emailWeekTemplates.groupId, id));
      } else {
        await db.update(emailWeekTemplates).set({ groupId: null }).where(eq(emailWeekTemplates.groupId, id));
      }
      await db.delete(emailGroups).where(eq(emailGroups.id, id));
      res.json({ message: "Grupo eliminado" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo eliminar el grupo" });
    }
  });

  /* ───────────── Correos ───────────── */

  app.post("/api/admin/email-automation/templates", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const parsed = createTemplatesSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
      const items = "items" in parsed.data ? parsed.data.items : [parsed.data];

      const [{ value: currentMax }] = await db.select({ value: max(emailWeekTemplates.weekIndex) }).from(emailWeekTemplates);
      let nextIndex = Number(currentMax ?? 0) + 1;

      const created = await db
        .insert(emailWeekTemplates)
        .values(
          items.map((item) => ({
            weekIndex: nextIndex++,
            label: item.label,
            sendDate: item.sendDate ?? null,
            subject: item.subject,
            bodyText: item.bodyText,
            bodyHtml: item.bodyHtml,
            enabled: item.enabled ?? true,
            groupId: item.groupId ?? null,
            presetKey: item.presetKey ?? null,
            recipientsOverride: normalizeOverride(item.recipientsOverride) ?? null,
            sendHour: item.sendHour ?? null,
          })),
        )
        .returning();

      res.status(201).json({ templates: created });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo crear el correo" });
    }
  });

  app.patch("/api/admin/email-automation/templates/:id", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

      const parsed = updateTemplateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

      const { recipientsOverride, ...rest } = parsed.data;
      const override = normalizeOverride(recipientsOverride);
      const [updated] = await db
        .update(emailWeekTemplates)
        .set({
          ...rest,
          ...(override !== undefined ? { recipientsOverride: override } : {}),
          updatedAt: new Date(),
        })
        .where(eq(emailWeekTemplates.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Correo no encontrado" });
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo actualizar el correo" });
    }
  });

  app.delete("/api/admin/email-automation/templates/:id", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });
      const [deleted] = await db.delete(emailWeekTemplates).where(eq(emailWeekTemplates.id, id)).returning();
      if (!deleted) return res.status(404).json({ message: "Correo no encontrado" });
      res.json({ message: "Correo eliminado" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo eliminar el correo" });
    }
  });

  /** Envía un correo guardado en este momento a sus destinatarios (además de su fecha programada). */
  app.post("/api/admin/email-automation/templates/:id/send-now", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });
      const [template] = await db.select().from(emailWeekTemplates).where(eq(emailWeekTemplates.id, id)).limit(1);
      if (!template) return res.status(404).json({ message: "Correo no encontrado" });

      const settings = await loadSettings();
      const recipients = resolveTemplateRecipients(template, settings);
      if (recipients.length === 0) {
        return res.status(400).json({ message: "Este correo no tiene destinatarios válidos." });
      }

      const result = await sendDirectorTemplateEmail({
        template: { ...template, sendDate: getMexicoCalendarParts().dateIso },
        recipients,
        kind: "manual",
        senderId: settings?.senderId || "contacto",
        cc: parseRecipientList(settings?.ccRecipients),
        bcc: parseRecipientList(settings?.bccRecipients),
      });
      const failed = result.results.filter((r) => !r.ok);
      res.json({
        message: failed.length === 0 ? "Correo enviado" : "Envío parcial: algunos destinatarios fallaron",
        recipients,
        results: result.results,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error instanceof Error ? error.message : "No se pudo enviar" });
    }
  });

  app.post("/api/admin/email-automation/test", requireAdmin, async (req, res) => {
    try {
      await ensureEmailAutomationTables();
      const parsed = testSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

      let template:
        | { id?: number; weekIndex?: number; sendDate?: string | null; subject: string; bodyText: string; bodyHtml: string }
        | undefined = parsed.data.draft;
      if (!template && parsed.data.templateId) {
        const [row] = await db
          .select()
          .from(emailWeekTemplates)
          .where(eq(emailWeekTemplates.id, parsed.data.templateId))
          .limit(1);
        template = row;
      }
      if (!template) return res.status(404).json({ message: "Plantilla no encontrada" });

      if (!parsed.data.to || !isValidRecipientEmail(parsed.data.to.trim())) {
        return res.status(400).json({ message: "Escribe un solo correo de prueba válido" });
      }
      const recipients = parseRecipientList(parsed.data.to);

      const settings = await loadSettings();
      const result = await sendDirectorTemplateEmail({
        template,
        recipients,
        kind: "test",
        senderId: settings?.senderId || "contacto",
        cc: [],
        bcc: [],
      });

      const failed = result.results.filter((r) => !r.ok);
      res.json({
        message: failed.length === 0 ? "Correo de prueba enviado" : "Envío parcial: algunos destinatarios fallaron",
        recipients,
        results: result.results,
        status: result.status,
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
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

      const [log] = await db.select().from(emailAutomationLogs).where(eq(emailAutomationLogs.id, id)).limit(1);
      if (!log) return res.status(404).json({ message: "Registro no encontrado" });
      if (log.kind !== "test") {
        return res.status(400).json({ message: "Solo se pueden eliminar envíos de prueba del historial" });
      }

      await db.delete(emailAutomationLogs).where(eq(emailAutomationLogs.id, id));
      res.json({ message: "Eliminado" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo eliminar el registro" });
    }
  });
}
