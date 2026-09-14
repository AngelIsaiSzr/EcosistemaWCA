import { randomBytes } from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  ineditoRetoSettings,
  ineditoRetoTokens,
  type IneditoRetoTokenStatus,
} from "@shared/schema";
import { sendTransactionalEmail } from "./services/email";
import {
  ensureIneditoRetoTables,
  DEFAULT_HTML,
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
      linkTtlHours: 168,
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
          message: "Este reto ya fue completado. El enlace ya no está disponible.",
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
      return res.json(settings);
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
        })
        .parse(req.body);

      const [updated] = await db
        .update(ineditoRetoSettings)
        .set({
          videoUrl: body.videoUrl ?? settings.videoUrl,
          emailSubject: body.emailSubject ?? settings.emailSubject,
          emailBodyText: body.emailBodyText ?? settings.emailBodyText,
          emailBodyHtml: body.emailBodyHtml ?? settings.emailBodyHtml,
          linkTtlHours: body.linkTtlHours ?? settings.linkTtlHours,
          updatedAt: new Date(),
        })
        .where(eq(ineditoRetoSettings.id, settings.id))
        .returning();

      return res.json(updated);
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
          emails: z.array(z.string()).min(1),
          dryRun: z.boolean().optional(),
        })
        .parse(req.body);

      const emails = [
        ...new Set(
          body.emails
            .map((e) => e.trim().toLowerCase())
            .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
        ),
      ];

      if (emails.length === 0) {
        return res.status(400).json({ message: "No hay correos válidos" });
      }

      const baseUrl = publicBaseUrl(req);
      const results: Array<{
        email: string;
        ok: boolean;
        url?: string;
        error?: string;
      }> = [];

      for (const email of emails) {
        try {
          const row = await createToken({
            email,
            isTest: false,
            createdBy: req.user?.id ?? null,
            ttlHours: settings.linkTtlHours,
          });
          const url = `${baseUrl}/reto/${encodeURIComponent(row.token)}`;

          if (body.dryRun) {
            results.push({ email, ok: true, url });
            continue;
          }

          const vars = { link: url, email };
          await sendTransactionalEmail({
            to: email,
            subject: applyTemplate(settings.emailSubject, vars),
            text: applyTemplate(settings.emailBodyText || DEFAULT_TEXT, vars),
            html: applyTemplate(settings.emailBodyHtml || DEFAULT_HTML, vars),
            fromName: "WCA | INÉDITO",
            senderId: "contacto",
          });
          results.push({ email, ok: true, url });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          results.push({ email, ok: false, error: message });
        }
      }

      return res.json({
        dryRun: !!body.dryRun,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      });
    } catch (error) {
      console.error("POST /api/talento/reto/send", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Datos inválidos" });
      }
      return res.status(500).json({ message: "No se pudo completar el envío" });
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
}
