export const DIRECTOR_EMAIL_CONTACT = "contacto@ecosistemawca.com";

/** Versión del seed de calendario; al subirla se re-sincronizan fechas en BD. */
export const EMAIL_CALENDAR_SEED_VERSION = 3;

export const DEFAULT_DIRECTOR_CAMPAIGN_START = "2026-09-14";

export type DirectorEmailTemplateSeed = {
  weekIndex: number;
  label: string;
  /** Fecha de envío YYYY-MM-DD (America/Mexico_City). */
  sendDate: string;
  enabled?: boolean;
  subject: string;
  bodyText: string;
  bodyHtml: string;
};

export type EmailSenderProfile = {
  id: string;
  label: string;
  fromEmail: string;
  description: string;
  /** Variables de entorno requeridas (además de las de contacto). */
  envUser?: string;
  envPass?: string;
  smtpHost: string;
  smtpPort: number;
};

/**
 * Remitentes disponibles.
 * - contacto: SMTP actual (Gmail / Workspace de WCA)
 * - tec_angel: cuenta Tec vía Microsoft 365 (requiere SMTP_TEC_USER / SMTP_TEC_PASS en Render)
 *
 * No se puede inventar "wca.a00844409@tec.mx" sin que TI del Tec cree ese alias.
 */
export const EMAIL_SENDER_PROFILES: EmailSenderProfile[] = [
  {
    id: "contacto",
    label: "contacto@ecosistemawca.com",
    fromEmail: "contacto@ecosistemawca.com",
    description: "Correo oficial WCA (SMTP_USER / SMTP_PASS).",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
  },
  {
    id: "tec_angel",
    label: "a00844409@tec.mx (Tec)",
    fromEmail: "a00844409@tec.mx",
    description:
      "Envío desde tu correo Tec (Outlook/M365). Configura SMTP_TEC_USER y SMTP_TEC_PASS en el servidor. Un alias tipo wca.a00844409@tec.mx solo lo puede crear TI del Tec.",
    envUser: "SMTP_TEC_USER",
    envPass: "SMTP_TEC_PASS",
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
  },
];

export function getEmailSenderProfile(id: string | null | undefined): EmailSenderProfile {
  return EMAIL_SENDER_PROFILES.find((p) => p.id === id) ?? EMAIL_SENDER_PROFILES[0];
}

const BASE_BULLETS = [
  "Revisar su correo de WCA",
  "Revisar que Ana o Ángel no les haya mandado mensaje por WhatsApp",
  "Revisar a su equipo y el desarrollo de sus actividades",
];

function buildBodyText(weekLabel: string): string {
  return [
    `Hola,`,
    ``,
    `Este es el recordatorio semanal de Ecosistema WCA (${weekLabel}).`,
    ``,
    `Por favor:`,
    ...BASE_BULLETS.map((b, i) => `${i + 1}. ${b}`),
    ``,
    `Gracias por tu compromiso.`,
    ``,
    `— Equipo Ecosistema WCA`,
  ].join("\n");
}

function buildBodyHtml(weekLabel: string): string {
  const items = BASE_BULLETS.map((b) => `<li style="margin-bottom:8px;">${b}</li>`).join("");
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1f2937;max-width:560px;">
      <p>Hola,</p>
      <p>Este es el recordatorio semanal de <strong>Ecosistema WCA</strong> (<strong>${weekLabel}</strong>).</p>
      <p>Por favor:</p>
      <ol style="padding-left:20px;">${items}</ol>
      <p>Gracias por tu compromiso.</p>
      <p style="color:#6b7280;">— Equipo Ecosistema WCA</p>
    </div>
  `.trim();
}

function withBodies(
  items: Array<{ weekIndex: number; label: string; sendDate: string; enabled?: boolean }>,
): DirectorEmailTemplateSeed[] {
  return items.map((item) => ({
    ...item,
    enabled: item.enabled !== false,
    subject: `Recordatorio directores · ${item.label} | Ecosistema WCA`,
    bodyText: buildBodyText(item.label),
    bodyHtml: buildBodyHtml(item.label),
  }));
}

/**
 * Calendario Tec Profesional AD26 (ago–dic 2026):
 * - Clases: 10 ago → 4 dic 2026
 * - Estructura: Periodo 1 (5 sem) → Semana Tec #1 → Periodo 2 (5) → Semana Tec #2 → Periodo 3 (5)
 * - Semanas Tec (patrón sem. 6 y 12): 14 sep y 26 oct
 * - Cierre / posada WCA: lunes 7 dic 2026 (evento 7–11 dic)
 *
 * Correos activos (recordatorios a directores): Tec #1 + Periodo 2 (5) + Tec #2 + Cierre.
 */
export const AD26_DIRECTOR_EMAIL_TEMPLATES = withBodies([
  { weekIndex: 1, label: "Semana Tec #1", sendDate: "2026-09-14" },
  { weekIndex: 2, label: "Periodo 2 · Semana 1", sendDate: "2026-09-21" },
  { weekIndex: 3, label: "Periodo 2 · Semana 2", sendDate: "2026-09-28" },
  { weekIndex: 4, label: "Periodo 2 · Semana 3", sendDate: "2026-10-05" },
  { weekIndex: 5, label: "Periodo 2 · Semana 4", sendDate: "2026-10-12" },
  { weekIndex: 6, label: "Periodo 2 · Semana 5", sendDate: "2026-10-19" },
  { weekIndex: 7, label: "Semana Tec #2", sendDate: "2026-10-26" },
  { weekIndex: 8, label: "Cierre de semestre AD26", sendDate: "2026-12-07" },
]);

/**
 * Calendario Tec Profesional FJ26 (feb–jun 2026):
 * - Clases: 9 feb → 12 jun 2026
 * - Semana Tec #1 ≈ 16 mar (sem. 6), #2 ≈ 27 abr (sem. 12)
 */
export const FJ26_DIRECTOR_EMAIL_TEMPLATES = withBodies([
  { weekIndex: 1, label: "Semana Tec #1", sendDate: "2026-03-16", enabled: false },
  { weekIndex: 2, label: "Periodo 2 · Semana 1", sendDate: "2026-03-23", enabled: false },
  { weekIndex: 3, label: "Periodo 2 · Semana 2", sendDate: "2026-03-30", enabled: false },
  { weekIndex: 4, label: "Periodo 2 · Semana 3", sendDate: "2026-04-06", enabled: false },
  { weekIndex: 5, label: "Periodo 2 · Semana 4", sendDate: "2026-04-13", enabled: false },
  { weekIndex: 6, label: "Periodo 2 · Semana 5", sendDate: "2026-04-20", enabled: false },
  { weekIndex: 7, label: "Semana Tec #2", sendDate: "2026-04-27", enabled: false },
  { weekIndex: 8, label: "Cierre de semestre FJ26", sendDate: "2026-06-15", enabled: false },
]);

export type SemesterCalendarId = "AD26" | "FJ26";

export const SEMESTER_CALENDARS: Record<
  SemesterCalendarId,
  {
    id: SemesterCalendarId;
    label: string;
    classStart: string;
    classEnd: string;
    templates: DirectorEmailTemplateSeed[];
  }
> = {
  AD26: {
    id: "AD26",
    label: "AD26 · Agosto–Diciembre 2026",
    classStart: "2026-08-10",
    classEnd: "2026-12-04",
    templates: AD26_DIRECTOR_EMAIL_TEMPLATES,
  },
  FJ26: {
    id: "FJ26",
    label: "FJ26 · Febrero–Junio 2026",
    classStart: "2026-02-09",
    classEnd: "2026-06-12",
    templates: FJ26_DIRECTOR_EMAIL_TEMPLATES,
  },
};

/** Semestre activo por defecto (ahora). */
export const DEFAULT_ACTIVE_SEMESTER: SemesterCalendarId = "AD26";

export const DEFAULT_DIRECTOR_EMAIL_TEMPLATES = AD26_DIRECTOR_EMAIL_TEMPLATES;

export function parseDateOnly(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? "").trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const date = new Date(y, m, d);
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
  return date;
}

export function parseRecipientList(raw: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(raw)
    ? raw
    : String(raw ?? "")
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const unique = new Set<string>();
  for (const part of parts) {
    const email = part.toLowerCase();
    if (emailRe.test(email)) unique.add(email);
  }
  return Array.from(unique);
}

export function isValidRecipientEmail(value: string): boolean {
  return parseRecipientList(value).length === 1;
}
