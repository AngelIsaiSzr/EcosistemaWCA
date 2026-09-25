import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { z } from "zod";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import {
  DEFAULT_INTEGRATION_FORM,
  DEFAULT_INTEGRATION_SLUG,
  DEFAULT_MIEMBROS_SLUG,
  IntegrationFormDefinition,
  PHONE_COUNTRIES,
  buildSheetRow,
  createBlankIntegrationForm,
  extractSpreadsheetId,
  formatAnswerForGoogleSheet,
  formatAnswerForSheet,
  getAllFields,
  getSheetHeaders,
  isDisplayOnlyField,
  isFieldVisible,
  isValidEmail,
  isValidHttpUrl,
  isValidPhoneNumber,
  normalizeUrl,
  sheetTabFilename,
  slugify,
  type IntegrationFileAnswer,
} from "@shared/integration-form";
import { saveIntegrationRowToSheet, updateIntegrationCellInSheet } from "./services/google-sheets";
import { ensureIntegrationTables } from "./db/ensure-integration-tables";
import { sendTransactionalEmail } from "./services/email";
import { DIRECTOR_EMAIL_CONTACT } from "@shared/director-emails";
import type { IntegrationForm } from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

const TALENTO_ROLE = "talento";
const RESERVED_FORM_SLUGS = new Set([DEFAULT_INTEGRATION_SLUG, DEFAULT_MIEMBROS_SLUG]);

function requireTalento(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user || req.user.role !== TALENTO_ROLE) {
    return res.status(403).json({ message: "Unauthorized: Talento y Bienestar access required" });
  }
  next();
}

function asDefinition(schema: unknown): IntegrationFormDefinition {
  return schema as IntegrationFormDefinition;
}

function formAllowsMultiple(form: IntegrationForm) {
  return Boolean(form.allowMultipleSubmissions);
}

function canAccessRestrictedForm(form: IntegrationForm, req: Request): boolean {
  if (form.accessMode !== "restricted") return true;
  if (!req.isAuthenticated() || !req.user) return false;
  if (req.user.role === TALENTO_ROLE || req.user.role === "admin") return true;
  const allowed = Array.isArray(form.allowedUserIds) ? form.allowedUserIds : [];
  return allowed.includes(req.user.id);
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const submitSchema = z.object({
  answers: z.record(z.unknown()),
});

const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  schema: z.unknown().optional(),
  spreadsheetId: z.string().nullable().optional(),
  spreadsheetTab: z.string().optional(),
  isPublished: z.boolean().optional(),
  pinned: z.boolean().optional(),
  responseColumnWidths: z.record(z.number().positive()).optional(),
  accessMode: z.enum(["public", "restricted"]).optional(),
  allowedUserIds: z.array(z.number().int().positive()).optional(),
  allowMultipleSubmissions: z.boolean().optional(),
});

const createFormSchema = z.object({
  title: z.string().min(1).optional(),
});

function validateAnswers(definition: IntegrationFormDefinition, answers: Record<string, unknown>) {
  const errors: Record<string, string> = {};

  for (const field of getAllFields(definition)) {
    if (!isFieldVisible(field, answers)) continue;
    if (isDisplayOnlyField(field.type)) continue;

    const value = answers[field.id];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0) ||
      (field.type === "file" &&
        typeof value === "object" &&
        value !== null &&
        !(value as IntegrationFileAnswer).url);

    if (field.type === "checkbox") {
      if (field.required && value !== true && value !== "true") {
        errors[field.id] = "Debes aceptar para continuar.";
      }
      continue;
    }

    if (field.type === "phone") {
      const phone = value as { dial?: string; number?: string } | undefined;
      if (field.required && !phone?.number?.trim()) {
        errors[field.id] = "El teléfono es requerido.";
        continue;
      }
      if (phone?.number?.trim() && !isValidPhoneNumber(phone.number)) {
        errors[field.id] = "Ingresa un número de 8 a 15 dígitos, sin la lada.";
      }
      if (phone?.dial && !PHONE_COUNTRIES.some((c) => c.dial === phone.dial)) {
        errors[field.id] = "Selecciona una lada válida.";
      }
      continue;
    }

    if (field.required && empty) {
      errors[field.id] = "Este campo es requerido.";
      continue;
    }
    if (empty) continue;

    if (field.type === "email" && !isValidEmail(String(value))) {
      errors[field.id] = "Ingresa un correo válido, por ejemplo nombre@correo.com";
    }
    if (field.type === "url" && !isValidHttpUrl(String(value))) {
      errors[field.id] = "Ingresa un enlace válido (LinkedIn, Drive u otro).";
    }
    if (field.type === "number" || field.type === "rating") {
      const num = Number(value);
      if (Number.isNaN(num) || (field.type === "number" && !Number.isInteger(num))) {
        errors[field.id] = field.type === "rating" ? "Elige una calificación." : "Ingresa un número entero.";
      } else {
        const min = field.min ?? (field.type === "rating" ? 1 : 0);
        const max = field.max ?? (field.type === "rating" ? 5 : 100);
        if (num < min || num > max) {
          errors[field.id] = `El valor debe estar entre ${min} y ${max}.`;
        }
      }
    }
    if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      errors[field.id] = "Ingresa una fecha válida.";
    }
    if (field.type === "time" && !/^\d{2}:\d{2}$/.test(String(value))) {
      errors[field.id] = "Ingresa una hora válida.";
    }
    if (field.type === "yes_no" && value !== "si" && value !== "no") {
      errors[field.id] = "Elige Sí o No.";
    }
    if (
      (field.type === "single_choice" || field.type === "dropdown") &&
      field.options?.length &&
      !field.options.some((o) => o.value === value) &&
      !(field.allowOther && value)
    ) {
      errors[field.id] = "Elige una opción válida.";
    }
    if (field.type === "image_upload" && typeof value === "string" && !value.startsWith("/")) {
      if (!isValidHttpUrl(value) && !value.startsWith("data:")) {
        errors[field.id] = "La imagen no es válida.";
      }
    }
  }

  return errors;
}

async function ensureTalentoAccount() {
  const TALENTO_EMAIL = "talento@ecosistemawca.com";
  const TALENTO_PASSWORD = "TalentoWCA@0";
  const hashedPassword = await hashPassword(TALENTO_PASSWORD);
  const existing = await storage.getUserByEmail(TALENTO_EMAIL);

  if (existing) {
    await storage.updateUser(existing.id, {
      password: hashedPassword,
      role: TALENTO_ROLE,
      username: existing.username || "talento",
      name: existing.name || "Talento y Bienestar",
    });
    return;
  }

  await storage.createUser({
    email: TALENTO_EMAIL,
    username: "talento",
    name: "Talento y Bienestar",
    password: hashedPassword,
    role: TALENTO_ROLE,
    profileImage:
      "https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png",
    bio: "Cuenta de Dirección de Talento y Bienestar (RH).",
  });
  console.log("Created talento user: talento@ecosistemawca.com");
}

async function resolveFormBySlugParam(slugParam: string) {
  const raw = decodeURIComponent(slugParam || "").trim();
  if (!raw || raw === DEFAULT_INTEGRATION_SLUG) {
    return storage.getOrCreateDefaultIntegrationForm();
  }
  return (await storage.getIntegrationFormBySlug(raw)) ?? undefined;
}

async function uniqueFormSlug(baseTitle: string) {
  const base = slugify(baseTitle) || `formulario-${Date.now().toString(36)}`;
  let candidate = base;
  let n = 1;
  while (
    RESERVED_FORM_SLUGS.has(candidate) ||
    (await storage.getIntegrationFormBySlug(candidate))
  ) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

async function applyFormPatch(formId: number, currentSlug: string, body: unknown) {
  const parsed = updateFormSchema.safeParse(body);
  if (!parsed.success) {
    return { error: { status: 400 as const, message: "Datos inválidos" } };
  }

  const current = await storage.getIntegrationFormById(formId);
  if (!current) {
    return { error: { status: 404 as const, message: "Formulario no encontrado" } };
  }
  const currentDefinition = asDefinition(current.schema);

  const patch: Record<string, unknown> = { ...parsed.data };
  delete patch.pinned;
  delete patch.responseColumnWidths;

  if (typeof parsed.data.pinned === "boolean") {
    patch.pinnedAt = parsed.data.pinned ? new Date() : null;
  }

  if (typeof parsed.data.slug === "string") {
    if (RESERVED_FORM_SLUGS.has(currentSlug)) {
      delete patch.slug;
    } else {
      patch.slug = slugify(parsed.data.slug) || currentSlug;
      if (RESERVED_FORM_SLUGS.has(String(patch.slug))) {
        return { error: { status: 400 as const, message: "Ese enlace está reservado" } };
      }
      if (patch.slug !== currentSlug) {
        const taken = await storage.getIntegrationFormBySlug(String(patch.slug));
        if (taken) {
          return { error: { status: 400 as const, message: "Ese enlace ya está en uso" } };
        }
      }
    }
  }

  if (typeof parsed.data.spreadsheetId === "string") {
    const extracted = extractSpreadsheetId(parsed.data.spreadsheetId);
    if (!extracted) {
      return { error: { status: 400 as const, message: "El ID o URL de Google Sheets no es válido" } };
    }
    patch.spreadsheetId = extracted;
  }

  if (parsed.data.schema) {
    const nextSchema = { ...(parsed.data.schema as IntegrationFormDefinition) };
    if (!nextSchema.sections || !Array.isArray(nextSchema.sections)) {
      return { error: { status: 400 as const, message: "El JSON del formulario no es válido" } };
    }
    // Conservar anchos de columnas si el editor no los envía
    if (!nextSchema.responseColumnWidths && currentDefinition.responseColumnWidths) {
      nextSchema.responseColumnWidths = currentDefinition.responseColumnWidths;
    }
    patch.schema = nextSchema;
    if (!parsed.data.title && nextSchema.title) {
      patch.title = nextSchema.title;
    }
  }

  if (parsed.data.responseColumnWidths) {
    const base =
      (patch.schema as IntegrationFormDefinition | undefined) ??
      currentDefinition;
    patch.schema = {
      ...base,
      responseColumnWidths: parsed.data.responseColumnWidths,
    };
  }

  const updated = await storage.updateIntegrationForm(formId, patch);
  return { updated };
}

function publicFormPayload(form: Awaited<ReturnType<typeof storage.getOrCreateDefaultIntegrationForm>>) {
  return {
    title: form.title,
    slug: form.slug,
    schema: form.schema ?? DEFAULT_INTEGRATION_FORM,
  };
}

export function registerTalentoRoutes(app: Express) {
  ensureIntegrationTables()
    .then(() => ensureTalentoAccount())
    .then(() => storage.getOrCreateDefaultIntegrationForm())
    .then(() => storage.getOrCreateMiembrosForm())
    .catch((error) => {
      console.error("No se pudo inicializar Talento y Bienestar:", error);
    });

  const FORM_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "form-files");
  fs.mkdirSync(FORM_UPLOAD_ROOT, { recursive: true });
  app.use("/media/form-files", express.static(FORM_UPLOAD_ROOT, { maxAge: "7d" }));

  const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post(
    "/api/integration/public/:slug/upload",
    memoryUpload.single("file"),
    async (req, res) => {
      try {
        await ensureIntegrationTables();
        const form = await resolveFormBySlugParam(req.params.slug);
        if (!form || !form.isPublished) {
          return res.status(404).json({ message: "Formulario no encontrado" });
        }
        if (!canAccessRestrictedForm(form, req)) {
          return res.status(403).json({ message: "Acceso restringido" });
        }
        const file = req.file;
        if (!file) return res.status(400).json({ message: "No se recibió archivo" });

        const kind = String(req.query.kind || req.body?.kind || "file");
        const isImage = kind === "image" || file.mimetype.startsWith("image/");
        const allowedImages = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        const allowedFiles = [
          ...allowedImages,
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ];

        if (isImage) {
          if (!allowedImages.includes(file.mimetype)) {
            return res.status(400).json({ message: "Formato de imagen no permitido" });
          }
          if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ message: "La imagen no puede superar 5 MB" });
          }
        } else if (!allowedFiles.includes(file.mimetype)) {
          return res.status(400).json({ message: "Tipo de archivo no permitido" });
        }

        const dir = path.join(FORM_UPLOAD_ROOT, String(form.id));
        fs.mkdirSync(dir, { recursive: true });
        const rawExt = path.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 12);
        const ext = rawExt ? (rawExt.startsWith(".") ? rawExt : `.${rawExt}`) : "";
        const safeName = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
        fs.writeFileSync(path.join(dir, safeName), file.buffer);
        const url = `/media/form-files/${form.id}/${safeName}`;
        res.json({
          url,
          name: file.originalname,
          size: file.size,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "No se pudo subir el archivo" });
      }
    },
  );

  app.get("/api/integration/public", async (req, res) => {
    try {
      await ensureIntegrationTables();
      const form = await storage.getOrCreateDefaultIntegrationForm();
      if (!form.isPublished) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }
      if (!canAccessRestrictedForm(form, req)) {
        return res.status(403).json({
          message: "Este formulario requiere acceso autorizado",
          code: "FORM_ACCESS_RESTRICTED",
          requiresAuth: !req.isAuthenticated(),
        });
      }
      void storage.incrementIntegrationFormViews(form.id);
      res.json(publicFormPayload(form));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cargar el formulario" });
    }
  });

  app.get("/api/integration/public/:slug", async (req, res) => {
    try {
      await ensureIntegrationTables();
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form || !form.isPublished) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }
      if (!canAccessRestrictedForm(form, req)) {
        return res.status(403).json({
          message: "Este formulario requiere acceso autorizado",
          code: "FORM_ACCESS_RESTRICTED",
          requiresAuth: !req.isAuthenticated(),
        });
      }
      void storage.incrementIntegrationFormViews(form.id);
      res.json(publicFormPayload(form));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cargar el formulario" });
    }
  });

  app.post("/api/integration/public/:slug/submit", async (req, res) => {
    try {
      await ensureIntegrationTables();
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form || !form.isPublished) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }
      if (!canAccessRestrictedForm(form, req)) {
        return res.status(403).json({
          message: "Este formulario requiere acceso autorizado",
          code: "FORM_ACCESS_RESTRICTED",
          requiresAuth: !req.isAuthenticated(),
        });
      }

      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Respuesta inválida" });
      }

      const definition = asDefinition(form.schema ?? DEFAULT_INTEGRATION_FORM);
      const answers = { ...parsed.data.answers } as Record<string, unknown>;
      for (const field of getAllFields(definition)) {
        if (field.type === "url" && typeof answers[field.id] === "string" && String(answers[field.id]).trim()) {
          answers[field.id] = normalizeUrl(String(answers[field.id]));
        }
        if (field.type === "email" && typeof answers[field.id] === "string") {
          answers[field.id] = String(answers[field.id]).trim().toLowerCase();
        }
      }
      const errors = validateAnswers(definition, answers);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ message: "Por favor completa los campos requeridos", errors });
      }

      const email = String(answers.email ?? "").trim().toLowerCase();
      if (!isValidEmail(email)) {
        return res.status(400).json({
          message: "El formulario necesita un correo válido",
          errors: { email: "Ingresa un correo válido" },
        });
      }
      if (!formAllowsMultiple(form)) {
        const existing = await storage.getIntegrationResponseByEmail(form.id, email);
        if (existing) {
          return res.status(409).json({
            message:
              "Este correo ya envió el formulario. Si necesitas actualizar tu postulación, escribe a Talento y Bienestar.",
          });
        }
      }

      const response = await storage.createIntegrationResponse({
        formId: form.id,
        email,
        answers,
      });

      try {
        const fields = getAllFields(definition);
        const rows = fields
          .map((field) => {
            const value = formatAnswerForSheet(field, answers[field.id]);
            if (value === "" || value == null) return null;
            return { label: field.label, value: String(value) };
          })
          .filter((x): x is { label: string; value: string } => x !== null);

        const textLines = [
          `Nueva respuesta en el formulario: ${form.title}`,
          `ID: ${response.id}`,
          `Correo: ${email}`,
          ``,
          ...rows.map((r) => `${r.label}: ${r.value}`),
        ].join("\n");

        const htmlRows = rows
          .map(
            (r) =>
              `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;vertical-align:top;">${r.label}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${r.value.replace(/</g, "&lt;")}</td></tr>`,
          )
          .join("");

        await sendTransactionalEmail({
          to: DIRECTOR_EMAIL_CONTACT,
          replyTo: email,
          subject: `Nueva respuesta · ${form.title}`,
          text: textLines,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:640px;">
              <h2 style="margin:0 0 8px;">Nueva respuesta</h2>
              <p style="margin:0 0 16px;color:#6b7280;">Formulario: <strong>${form.title}</strong> · ID ${response.id}</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">${htmlRows}</table>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Error al notificar postulación por correo:", emailError);
      }

      if (form.spreadsheetId) {
        try {
          const submittedAt = response.submittedAt ?? new Date();
          const submissionId = `WCA-INT-${response.id}`;
          await saveIntegrationRowToSheet(
            form.spreadsheetId,
            form.spreadsheetTab || "Respuestas",
            getSheetHeaders(definition),
            buildSheetRow(definition, answers, submittedAt, submissionId),
          );
        } catch (sheetError) {
          console.error("Error al guardar postulación en Google Sheets:", sheetError);
        }
      }

      res.status(201).json({ message: "Respuesta enviada", id: response.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo enviar la respuesta" });
    }
  });

  app.get("/api/talento/forms", requireTalento, async (_req, res) => {
    try {
      await ensureIntegrationTables();
      await storage.getOrCreateDefaultIntegrationForm();
      await storage.getOrCreateMiembrosForm();
      const forms = await storage.listIntegrationForms();
      res.json(forms);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cargar los formularios" });
    }
  });

  app.post("/api/talento/forms", requireTalento, async (req, res) => {
    try {
      await ensureIntegrationTables();
      const parsed = createFormSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: "Datos inválidos" });
      }
      const title = parsed.data.title?.trim() || "Formulario sin título";
      const slug = await uniqueFormSlug(title);
      const schema = createBlankIntegrationForm(title);
      const created = await storage.createIntegrationForm({
        title,
        slug,
        schema,
        isPublished: true,
        spreadsheetTab: "Respuestas",
        spreadsheetId: null,
        pinnedAt: null,
        viewCount: 0,
      });
      res.status(201).json(created);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo crear el formulario" });
    }
  });

  app.get("/api/talento/forms/:slug", requireTalento, async (req, res) => {
    try {
      await ensureIntegrationTables();
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
      res.json({
        ...form,
        googleServiceEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cargar el formulario" });
    }
  });

  app.patch("/api/talento/forms/:slug", requireTalento, async (req, res) => {
    try {
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
      const result = await applyFormPatch(form.id, form.slug, req.body);
      if ("error" in result && result.error) {
        return res.status(result.error.status).json({ message: result.error.message });
      }
      res.json(result.updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo guardar el formulario" });
    }
  });

  app.delete("/api/talento/forms/:slug", requireTalento, async (req, res) => {
    try {
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
      if (RESERVED_FORM_SLUGS.has(form.slug)) {
        return res.status(400).json({ message: "Este formulario no se puede eliminar" });
      }
      const ok = await storage.deleteIntegrationForm(form.id);
      if (!ok) return res.status(400).json({ message: "No se pudo eliminar" });
      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo eliminar el formulario" });
    }
  });

  app.get("/api/talento/users-basic", requireTalento, async (_req, res) => {
    try {
      const users = await storage.getUsersBasic();
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudieron cargar las cuentas" });
    }
  });

  app.get("/api/talento/forms/:slug/responses", requireTalento, async (req, res) => {
    try {
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      const responses = await storage.getIntegrationResponses(form.id, search);
      res.json(responses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cargar las respuestas" });
    }
  });

  app.get("/api/talento/forms/:slug/template.csv", requireTalento, async (req, res) => {
    try {
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
      const definition = asDefinition(form.schema ?? DEFAULT_INTEGRATION_FORM);
      const headers = getSheetHeaders(definition);
      const csv = "\uFEFF" + headers.map(csvEscape).join(",") + "\n";
      const tab =
        typeof req.query.tab === "string" && req.query.tab.trim()
          ? req.query.tab
          : form.spreadsheetTab || "Respuestas";
      const filename = sheetTabFilename(tab);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo generar la plantilla" });
    }
  });

  app.get("/api/talento/forms/:slug/export.csv", requireTalento, async (req, res) => {
    try {
      const form = await resolveFormBySlugParam(req.params.slug);
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
      const definition = asDefinition(form.schema ?? DEFAULT_INTEGRATION_FORM);
      const headers = getSheetHeaders(definition);
      const responses = await storage.getIntegrationResponses(form.id);
      const lines = [
        headers.map(csvEscape).join(","),
        ...responses.map((item) => {
          const submittedAt = item.submittedAt ?? new Date();
          const row = buildSheetRow(
            definition,
            item.answers as Record<string, unknown>,
            submittedAt,
            `WCA-INT-${item.id}`,
          );
          return row.map(csvEscape).join(",");
        }),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="respuestas-${form.slug}.csv"`,
      );
      res.send("\uFEFF" + lines.join("\n"));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo exportar" });
    }
  });

  app.get("/api/talento/form", requireTalento, async (_req, res) => {
    try {
      await ensureIntegrationTables();
      const form = await storage.getOrCreateDefaultIntegrationForm();
      res.json({
        ...form,
        googleServiceEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cargar el formulario" });
    }
  });

  app.patch("/api/talento/form", requireTalento, async (req, res) => {
    try {
      const form = await storage.getOrCreateDefaultIntegrationForm();
      const result = await applyFormPatch(form.id, form.slug, req.body);
      if ("error" in result && result.error) {
        return res.status(result.error.status).json({ message: result.error.message });
      }
      res.json(result.updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo guardar el formulario" });
    }
  });

  app.get("/api/talento/responses", requireTalento, async (req, res) => {
    try {
      const form = await storage.getOrCreateDefaultIntegrationForm();
      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      const responses = await storage.getIntegrationResponses(form.id, search);
      res.json(responses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al cargar las respuestas" });
    }
  });

  app.patch("/api/talento/responses/:id", requireTalento, async (req, res) => {
    try {
      const responseId = Number(req.params.id);
      if (!Number.isFinite(responseId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const fieldId = typeof req.body?.fieldId === "string" ? req.body.fieldId : "";
      if (!fieldId) {
        return res.status(400).json({ message: "Falta el campo a editar" });
      }

      const existing = await storage.getIntegrationResponseById(responseId);
      if (!existing) {
        return res.status(404).json({ message: "Respuesta no encontrada" });
      }

      const form = await storage.getIntegrationFormById(existing.formId);
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      const definition = asDefinition(form.schema ?? DEFAULT_INTEGRATION_FORM);
      const fields = getAllFields(definition);
      const field = fields.find((item) => item.id === fieldId);
      if (!field) {
        return res.status(400).json({ message: "Campo desconocido" });
      }

      let nextValue = req.body?.value as unknown;
      if (field.type === "phone" && typeof nextValue === "string") {
        const match = nextValue.trim().match(/^(\+\d{1,4})?\s*(.*)$/);
        nextValue = {
          dial: match?.[1] || "+52",
          number: (match?.[2] || "").replace(/[^\d\s-]/g, "").trim(),
        };
      } else if (field.type === "checkbox") {
        const raw = String(nextValue ?? "").trim().toLowerCase();
        nextValue = raw === "sí" || raw === "si" || raw === "true" || raw === "1";
      } else if (field.type === "multiple_choice" && typeof nextValue === "string") {
        const parts = nextValue
          .split("|")
          .map((part: string) => part.trim())
          .filter(Boolean);
        nextValue = parts.map((label: string) => {
          const option = field.options?.find(
            (opt) => opt.label === label || opt.value === label,
          );
          return option?.value ?? label;
        });
      } else if (field.type === "single_choice" && typeof nextValue === "string") {
        const option = field.options?.find(
          (opt) => opt.label === nextValue || opt.value === nextValue,
        );
        nextValue = option?.value ?? nextValue;
      } else if (field.type === "number") {
        nextValue = nextValue === "" || nextValue === null ? "" : Number(nextValue);
      }

      const answers = {
        ...(existing.answers as Record<string, unknown>),
        [fieldId]: nextValue,
      };

      let email = existing.email;
      if (fieldId === "email" || field.type === "email") {
        email = String(nextValue ?? "").trim().toLowerCase();
        if (!isValidEmail(email)) {
          return res.status(400).json({ message: "Correo inválido" });
        }
        const taken = await storage.getIntegrationResponseByEmail(form.id, email);
        if (taken && taken.id !== existing.id) {
          return res.status(409).json({ message: "Ese correo ya está en otra postulación" });
        }
      }

      const updated = await storage.updateIntegrationResponse(responseId, { email, answers });
      if (!updated) {
        return res.status(500).json({ message: "No se pudo guardar" });
      }

      let sheetUpdated = false;
      if (form.spreadsheetId) {
        try {
          const fieldIndex = fields.findIndex((item) => item.id === fieldId);
          const columnIndex = fieldIndex + 2;
          await updateIntegrationCellInSheet(
            form.spreadsheetId,
            form.spreadsheetTab || "Respuestas",
            `WCA-INT-${responseId}`,
            columnIndex,
            formatAnswerForGoogleSheet(field, (answers as Record<string, unknown>)[fieldId]),
          );
          sheetUpdated = true;
        } catch (sheetError) {
          console.error("Error al actualizar celda en Google Sheets:", sheetError);
        }
      }

      res.json({ ...updated, sheetUpdated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo actualizar la respuesta" });
    }
  });

  app.get("/api/talento/template.csv", requireTalento, async (req, res) => {
    try {
      const form = await storage.getOrCreateDefaultIntegrationForm();
      const definition = asDefinition(form.schema ?? DEFAULT_INTEGRATION_FORM);
      const headers = getSheetHeaders(definition);
      const csv = "\uFEFF" + headers.map(csvEscape).join(",") + "\n";
      const tab =
        typeof req.query.tab === "string" && req.query.tab.trim()
          ? req.query.tab
          : form.spreadsheetTab || "Respuestas";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${sheetTabFilename(tab)}"`);
      res.send(csv);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo generar la plantilla" });
    }
  });

  app.get("/api/talento/export.csv", requireTalento, async (_req, res) => {
    try {
      const form = await storage.getOrCreateDefaultIntegrationForm();
      const definition = asDefinition(form.schema ?? DEFAULT_INTEGRATION_FORM);
      const headers = getSheetHeaders(definition);
      const responses = await storage.getIntegrationResponses(form.id);
      const lines = [
        headers.map(csvEscape).join(","),
        ...responses.map((item) => {
          const submittedAt = item.submittedAt ?? new Date();
          const row = buildSheetRow(
            definition,
            item.answers as Record<string, unknown>,
            submittedAt,
            `WCA-INT-${item.id}`,
          );
          return row.map(csvEscape).join(",");
        }),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="respuestas-integracion-wca.csv"');
      res.send("\uFEFF" + lines.join("\n"));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "No se pudo exportar" });
    }
  });
}
