import { randomBytes } from "crypto";
import { promises as dns } from "dns";
import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  ineditoRetoSettings,
  ineditoRetoTokens,
  type IneditoRetoTokenStatus,
} from "@shared/schema";
import {
  getSenderAvailability,
  isKnownSender,
  listSenderProfiles,
  sendTransactionalEmail,
} from "./services/email";
import { analyzeEmailList, EMAIL_PATTERN } from "@shared/email-list";
import {
  ensureIneditoRetoTables,
  DEFAULT_HTML,
  DEFAULT_SUBJECT,
  DEFAULT_TEXT,
} from "./db/ensure-inedito-reto";

const TALENTO_ROLE = "talento";

/** Alfabeto URL-safe con letras, números y símbolos (sin romper la ruta). */
const TOKEN_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_.~*$";

function requireTalento(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user || req.user.role !== TALENTO_ROLE) {
    return res.status(403).json({ message: "Unauthorized: Talento y Bienestar access required" });
  }
  next();
}

function generateRetoToken(length = 56): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
  }
  return out;
}

function publicBaseUrl(req: Request): string {
  const env = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (env) return env;
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{link\}\}/gi, vars.link ?? "")
    .replace(/\{\{email\}\}/gi, vars.email ?? "");
}

function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

async function getSettingsRow() {
  await ensureIneditoRetoTables();
  const rows = await db.select().from(ineditoRetoSettings).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(ineditoRetoSettings)
    .values({
      videoUrl: "",
      emailSubject: DEFAULT_SUBJECT,
      emailBodyText: DEFAULT_TEXT,
      emailBodyHtml: DEFAULT_HTML,
      linkTtlHours: 72,
    })
    .returning();
  return created!;
}

async function createToken(opts: {
  email: string;
  isTest: boolean;
  createdBy?: number | null;
  ttlHours: number;
}) {
  const token = generateRetoToken(56);
  const expiresAt =
    opts.ttlHours > 0 ? new Date(Date.now() + opts.ttlHours * 60 * 60 * 1000) : null;

  const [row] = await db
    .insert(ineditoRetoTokens)
    .values({
      token,
      email: opts.email.trim().toLowerCase(),
      status: "pending",
      isTest: opts.isTest,
      expiresAt,
      createdBy: opts.createdBy ?? null,
    })
    .returning();

  return row!;
}

function serializeSettings(row: typeof ineditoRetoSettings.$inferSelect) {
  return {
    ...row,
    senders: listSenderProfiles().map((s) => ({ id: s.id, label: s.label, fromEmail: s.fromEmail })),
    senderAvailability: getSenderAvailability(),
  };
}

/** Remitente efectivo: el configurado si existe y tiene credenciales; si no, contacto. */
function effectiveSender(senderId: string | null | undefined): string {
  const availability = getSenderAvailability();
  if (senderId && isKnownSender(senderId) && availability[senderId]) return senderId;
  return "contacto";
}

const MX_CACHE = new Map<string, { ok: boolean; at: number }>();

async function domainAcceptsMail(domain: string): Promise<boolean> {
  const cached = MX_CACHE.get(domain);
  if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) return cached.ok;
  const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 4000));
  let ok: boolean;
  try {
    const result = await Promise.race([dns.resolveMx(domain), timeout]);
    if (result === "timeout") return true;
    ok = result.length > 0;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      try {
        ok = (await dns.resolve4(domain)).length > 0;
      } catch {
        ok = false;
      }
    } else {
      return true;
    }
  }
  MX_CACHE.set(domain, { ok, at: Date.now() });
  return ok;
}

function serializeToken(row: typeof ineditoRetoTokens.$inferSelect, baseUrl: string) {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    status: row.status,
    isTest: row.isTest,
    expiresAt: row.expiresAt,
    openedAt: row.openedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    url: `${baseUrl}/reto/${encodeURIComponent(row.token)}`,
  };
}

export function registerIneditoRetoRoutes(app: Express) {
  // ——— Público ———
  app.get("/api/reto/:token", async (req, res) => {
    try {
      await ensureIneditoRetoTables();
      const raw = decodeURIComponent(String(req.params.token || ""));
      const [row] = await db
        .select()
        .from(ineditoRetoTokens)
        .where(eq(ineditoRetoTokens.token, raw))
        .limit(1);

      if (!row) {
        return res.status(404).json({ message: "Enlace no válido", status: "invalid" });
      }

      if (row.status === "revoked") {
        return res.status(410).json({ message: "Este enlace fue revocado", status: "revoked" });
      }

      if (row.status === "completed") {
        return res.status(410).json({
          message: "Página no encontrada",
          status: "completed",
        });
      }

      if (isExpired(row.expiresAt) || row.status === "expired") {
        if (row.status !== "expired") {
          await db
            .update(ineditoRetoTokens)
            .set({ status: "expired" })
            .where(eq(ineditoRetoTokens.id, row.id));
        }
        return res.status(410).json({
          message: "Este enlace temporal ha expirado.",
          status: "expired",
        });
      }

      const settings = await getSettingsRow();
      if (!settings.videoUrl?.trim()) {
        return res.status(503).json({
          message: "El reto aún no tiene vídeo configurado.",
          status: "unavailable",
        });
      }

      return res.json({
        status: row.status,
        email: row.email || null,
        isTest: row.isTest,
        videoUrl: settings.videoUrl.trim(),
        expiresAt: row.expiresAt,
      });
    } catch (error) {
      console.error("GET /api/reto/:token", error);
      return res.status(500).json({ message: "Error al validar el enlace" });
    }
  });

  app.post("/api/reto/:token/open", async (req, res) => {
    try {
      await ensureIneditoRetoTables();
      const raw = decodeURIComponent(String(req.params.token || ""));
      const [row] = await db
        .select()
        .from(ineditoRetoTokens)
        .where(eq(ineditoRetoTokens.token, raw))
        .limit(1);

      if (!row) return res.status(404).json({ message: "Enlace no válido" });
      if (row.status === "completed" || row.status === "revoked") {
        return res.status(410).json({ message: "Enlace ya no disponible", status: row.status });
      }
      if (isExpired(row.expiresAt)) {
        await db
          .update(ineditoRetoTokens)
          .set({ status: "expired" })
          .where(eq(ineditoRetoTokens.id, row.id));
        return res.status(410).json({ message: "Enlace expirado", status: "expired" });
      }

      if (row.status === "pending") {
        await db
          .update(ineditoRetoTokens)
          .set({ status: "opened", openedAt: new Date() })
          .where(eq(ineditoRetoTokens.id, row.id));
      }

      return res.json({ ok: true, status: "opened" });
    } catch (error) {
      console.error("POST /api/reto/:token/open", error);
      return res.status(500).json({ message: "No se pudo registrar la apertura" });
    }
  });

  app.post("/api/reto/:token/complete", async (req, res) => {
    try {
      await ensureIneditoRetoTables();
      const raw = decodeURIComponent(String(req.params.token || ""));
      const [row] = await db
        .select()
        .from(ineditoRetoTokens)
        .where(eq(ineditoRetoTokens.token, raw))
        .limit(1);

      if (!row) return res.status(404).json({ message: "Enlace no válido" });
      if (row.status === "completed") {
        return res.json({ ok: true, status: "completed" });
      }
      if (row.status === "revoked" || row.status === "expired") {
        return res.status(410).json({ message: "Enlace ya no disponible", status: row.status });
      }

      await db
        .update(ineditoRetoTokens)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(ineditoRetoTokens.id, row.id));

      return res.json({ ok: true, status: "completed" });
    } catch (error) {
      console.error("POST /api/reto/:token/complete", error);
      return res.status(500).json({ message: "No se pudo cerrar el enlace" });
    }
  });

  // ——— Talento ———
  app.get("/api/talento/reto/settings", requireTalento, async (_req, res) => {
    try {
      const settings = await getSettingsRow();
      return res.json(serializeSettings(settings));
    } catch (error) {
      console.error("GET /api/talento/reto/settings", error);
      return res.status(500).json({ message: "No se pudo cargar la configuración" });
    }
  });

  app.patch("/api/talento/reto/settings", requireTalento, async (req, res) => {
    try {
      const settings = await getSettingsRow();
      const body = z
        .object({
          videoUrl: z.string().optional(),
          emailSubject: z.string().min(1).optional(),
          emailBodyText: z.string().optional(),
          emailBodyHtml: z.string().optional(),
          linkTtlHours: z.number().int().min(1).max(24 * 60).optional(),
          senderId: z.string().optional(),
          fromName: z.string().trim().min(1, "Escribe el nombre del remitente").max(80).optional(),
        })
        .parse(req.body);

      if (body.senderId !== undefined && !isKnownSender(body.senderId)) {
        return res.status(400).json({ message: "Ese remitente no existe." });
      }

      const [updated] = await db
        .update(ineditoRetoSettings)
        .set({
          videoUrl: body.videoUrl ?? settings.videoUrl,
          emailSubject: body.emailSubject ?? settings.emailSubject,
          emailBodyText: body.emailBodyText ?? settings.emailBodyText,
          emailBodyHtml: body.emailBodyHtml ?? settings.emailBodyHtml,
          linkTtlHours: body.linkTtlHours ?? settings.linkTtlHours,
          senderId: body.senderId ?? settings.senderId,
          fromName: body.fromName ?? settings.fromName,
          updatedAt: new Date(),
        })
        .where(eq(ineditoRetoSettings.id, settings.id))
        .returning();

      return res.json(serializeSettings(updated!));
    } catch (error) {
      console.error("PATCH /api/talento/reto/settings", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Datos inválidos" });
      }
      return res.status(500).json({ message: "No se pudo guardar" });
    }
  });

  app.get("/api/talento/reto/tokens", requireTalento, async (req, res) => {
    try {
      await ensureIneditoRetoTables();
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
      const onlyTest = req.query.test === "1" || req.query.test === "true";
      const baseUrl = publicBaseUrl(req);

      const rows = onlyTest
        ? await db
            .select()
            .from(ineditoRetoTokens)
            .where(eq(ineditoRetoTokens.isTest, true))
            .orderBy(desc(ineditoRetoTokens.createdAt))
            .limit(limit)
        : await db
            .select()
            .from(ineditoRetoTokens)
            .orderBy(desc(ineditoRetoTokens.createdAt))
            .limit(limit);

      const counts = await db
        .select({
          status: ineditoRetoTokens.status,
          n: sql<number>`count(*)::int`,
        })
        .from(ineditoRetoTokens)
        .groupBy(ineditoRetoTokens.status);

      return res.json({
        tokens: rows.map((r) => serializeToken(r, baseUrl)),
        counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
      });
    } catch (error) {
      console.error("GET /api/talento/reto/tokens", error);
      return res.status(500).json({ message: "No se pudieron listar los enlaces" });
    }
  });

  app.post("/api/talento/reto/test-link", requireTalento, async (req, res) => {
    try {
      const settings = await getSettingsRow();
      if (!settings.videoUrl?.trim()) {
        return res.status(400).json({
          message: "Configura primero la URL del vídeo del reto.",
        });
      }

      const body = z
        .object({
          email: z.string().email().optional().or(z.literal("")),
          label: z.string().optional(),
        })
        .parse(req.body ?? {});

      const email =
        (body.email && body.email.trim()) ||
        `prueba+${Date.now()}@inedito.test`;

      const row = await createToken({
        email,
        isTest: true,
        createdBy: req.user?.id ?? null,
        ttlHours: settings.linkTtlHours,
      });

      const baseUrl = publicBaseUrl(req);
      return res.status(201).json(serializeToken(row, baseUrl));
    } catch (error) {
      console.error("POST /api/talento/reto/test-link", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Datos inválidos" });
      }
      return res.status(500).json({ message: "No se pudo crear el enlace de prueba" });
    }
  });

  app.post("/api/talento/reto/send", requireTalento, async (req, res) => {
    try {
      const settings = await getSettingsRow();
      if (!settings.videoUrl?.trim()) {
        return res.status(400).json({ message: "Configura primero la URL del vídeo del reto." });
      }

      const body = z
        .object({
          emails: z.array(z.string()).min(1).max(500),
          dryRun: z.boolean().optional(),
        })
        .parse(req.body);

      const analysis = analyzeEmailList(body.emails);
      const emails = analysis.valid;

      if (emails.length === 0) {
        return res.status(400).json({ message: "No hay correos válidos" });
      }

      const senderId = effectiveSender(settings.senderId);
      const results: Array<{
        email: string;
        ok: boolean;
        url?: string;
        error?: string;
      }> = [];

      // La simulación no crea enlaces: solo confirma a quién se enviaría.
      if (body.dryRun) {
        for (const email of emails) results.push({ email, ok: true });
        return res.json({
          dryRun: true,
          sent: results.length,
          failed: 0,
          results,
          skipped: { duplicates: analysis.duplicates.length, invalid: analysis.invalid },
          senderId,
        });
      }

      const baseUrl = publicBaseUrl(req);
      for (const email of emails) {
        let rowId: number | null = null;
        try {
          const row = await createToken({
            email,
            isTest: false,
            createdBy: req.user?.id ?? null,
            ttlHours: settings.linkTtlHours,
          });
          rowId = row.id;
          const url = `${baseUrl}/reto/${encodeURIComponent(row.token)}`;
          const vars = { link: url, email };
          const sent = await sendTransactionalEmail({
            to: email,
            subject: applyTemplate(settings.emailSubject, vars),
            text: applyTemplate(settings.emailBodyText || DEFAULT_TEXT, vars),
            html: applyTemplate(settings.emailBodyHtml || DEFAULT_HTML, vars),
            fromName: settings.fromName || "WCA | INÉDITO",
            senderId,
          });
          const failed = sent.results.find((r) => !r.ok);
          if (failed) throw new Error(failed.error || "Rechazado por el servidor de correo");
          results.push({ email, ok: true, url });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          // Sin correo enviado el enlace no sirve: se borra para no dejar pendientes fantasma.
          if (rowId != null) {
            await db.delete(ineditoRetoTokens).where(eq(ineditoRetoTokens.id, rowId)).catch(() => undefined);
          }
          results.push({ email, ok: false, error: message });
        }
      }

      return res.json({
        dryRun: false,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
        skipped: { duplicates: analysis.duplicates.length, invalid: analysis.invalid },
        senderId,
      });
    } catch (error) {
      console.error("POST /api/talento/reto/send", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Datos inválidos" });
      }
      return res.status(500).json({ message: "No se pudo completar el envío" });
    }
  });

  /** Comprueba que los dominios de la lista existan y reciban correo (registros MX). */
  app.post("/api/talento/reto/validate-emails", requireTalento, async (req, res) => {
    try {
      const body = z.object({ emails: z.array(z.string()).max(500) }).parse(req.body);
      const valid = analyzeEmailList(body.emails).valid;
      const domains = Array.from(new Set(valid.map((e) => e.slice(e.lastIndexOf("@") + 1)))).slice(0, 80);
      const checks = await Promise.all(domains.map(async (d) => [d, await domainAcceptsMail(d)] as const));
      const badDomains = new Set(checks.filter(([, ok]) => !ok).map(([d]) => d));
      return res.json({
        checkedDomains: domains.length,
        undeliverable: valid.filter((e) => badDomains.has(e.slice(e.lastIndexOf("@") + 1))),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos" });
      }
      console.error("POST /api/talento/reto/validate-emails", error);
      return res.status(500).json({ message: "No se pudieron verificar los dominios" });
    }
  });

  /** Envío real de prueba a un solo correo, con la configuración guardada o con un borrador. */
  app.post("/api/talento/reto/test-email", requireTalento, async (req, res) => {
    let rowId: number | null = null;
    try {
      const settings = await getSettingsRow();
      if (!settings.videoUrl?.trim()) {
        return res.status(400).json({ message: "Configura primero la URL del vídeo del reto." });
      }
      const body = z
        .object({
          to: z.string().trim().toLowerCase().regex(EMAIL_PATTERN, "Correo de prueba inválido"),
          draft: z
            .object({
              emailSubject: z.string().optional(),
              emailBodyText: z.string().optional(),
              emailBodyHtml: z.string().optional(),
              senderId: z.string().optional(),
              fromName: z.string().max(80).optional(),
            })
            .optional(),
        })
        .parse(req.body);

      const draft = body.draft ?? {};
      const requestedSender = draft.senderId ?? settings.senderId;
      if (!isKnownSender(requestedSender)) {
        return res.status(400).json({ message: "Ese remitente no existe." });
      }
      if (!getSenderAvailability()[requestedSender]) {
        return res.status(400).json({
          message: "Ese remitente no tiene contraseña SMTP configurada en el servidor. Elige otro o configúralo en Render.",
        });
      }

      const row = await createToken({
        email: body.to,
        isTest: true,
        createdBy: req.user?.id ?? null,
        ttlHours: settings.linkTtlHours,
      });
      rowId = row.id;
      const baseUrl = publicBaseUrl(req);
      const url = `${baseUrl}/reto/${encodeURIComponent(row.token)}`;
      const vars = { link: url, email: body.to };
      const subject = draft.emailSubject?.trim() || settings.emailSubject;

      const sent = await sendTransactionalEmail({
        to: body.to,
        subject: `[PRUEBA] ${applyTemplate(subject, vars)}`,
        text: applyTemplate(draft.emailBodyText ?? (settings.emailBodyText || DEFAULT_TEXT), vars),
        html: applyTemplate(draft.emailBodyHtml ?? (settings.emailBodyHtml || DEFAULT_HTML), vars),
        fromName: draft.fromName?.trim() || settings.fromName || "WCA | INÉDITO",
        senderId: requestedSender,
      });
      const failed = sent.results.find((r) => !r.ok);
      if (failed) throw new Error(failed.error || "Rechazado por el servidor de correo");

      return res.json({
        ok: true,
        to: body.to,
        fromAddress: sent.fromAddress,
        token: serializeToken(row, baseUrl),
      });
    } catch (error) {
      if (rowId != null) {
        await db.delete(ineditoRetoTokens).where(eq(ineditoRetoTokens.id, rowId)).catch(() => undefined);
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Datos inválidos" });
      }
      console.error("POST /api/talento/reto/test-email", error);
      const message = error instanceof Error ? error.message : "No se pudo enviar la prueba";
      return res.status(502).json({ message: `No se pudo enviar la prueba: ${message}` });
    }
  });

  app.post("/api/talento/reto/tokens/:id/revoke", requireTalento, async (req, res) => {
    try {
      await ensureIneditoRetoTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

      const [updated] = await db
        .update(ineditoRetoTokens)
        .set({ status: "revoked" satisfies IneditoRetoTokenStatus })
        .where(and(eq(ineditoRetoTokens.id, id)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Enlace no encontrado" });
      return res.json({ ok: true, token: updated });
    } catch (error) {
      console.error("POST revoke reto token", error);
      return res.status(500).json({ message: "No se pudo revocar" });
    }
  });

  app.delete("/api/talento/reto/tokens/:id", requireTalento, async (req, res) => {
    try {
      await ensureIneditoRetoTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

      const [row] = await db
        .select()
        .from(ineditoRetoTokens)
        .where(eq(ineditoRetoTokens.id, id))
        .limit(1);

      if (!row) return res.status(404).json({ message: "Enlace no encontrado" });

      if (row.status !== "revoked" && row.status !== "completed" && row.status !== "expired") {
        return res.status(400).json({
          message: "Solo se pueden eliminar enlaces revocados, completados o expirados. Revócalo primero.",
        });
      }

      await db.delete(ineditoRetoTokens).where(eq(ineditoRetoTokens.id, id));
      return res.json({ ok: true });
    } catch (error) {
      console.error("DELETE reto token", error);
      return res.status(500).json({ message: "No se pudo eliminar" });
    }
  });
}
