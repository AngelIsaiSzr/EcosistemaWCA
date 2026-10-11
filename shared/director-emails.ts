export const DIRECTOR_EMAIL_CONTACT = "contacto@ecosistemawca.com";

export const DEFAULT_DIRECTOR_CAMPAIGN_START = "2026-09-14";

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
      "Correo oficial Tec (SMTP_TEC_USER / SMTP_TEC_PASS).",
    envUser: "SMTP_TEC_USER",
    envPass: "SMTP_TEC_PASS",
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
  },
];

export function getEmailSenderProfile(id: string | null | undefined): EmailSenderProfile {
  return EMAIL_SENDER_PROFILES.find((p) => p.id === id) ?? EMAIL_SENDER_PROFILES[0];
}

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
