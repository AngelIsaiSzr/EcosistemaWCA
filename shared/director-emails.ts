export const DIRECTOR_EMAIL_CONTACT = "contacto@ecosistemawca.com";

/** Lunes 14 de septiembre 2026 (inicio del ciclo). */
export const DEFAULT_DIRECTOR_CAMPAIGN_START = "2026-09-14";

export type DirectorEmailTemplateSeed = {
  weekIndex: number;
  label: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
};

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

export const DEFAULT_DIRECTOR_EMAIL_TEMPLATES: DirectorEmailTemplateSeed[] = [
  { weekIndex: 1, label: "Semana 1" },
  { weekIndex: 2, label: "Semana 2" },
  { weekIndex: 3, label: "Semana 3" },
  { weekIndex: 4, label: "Semana 4" },
  { weekIndex: 5, label: "Semana 5" },
  { weekIndex: 6, label: "Semana Tec" },
  { weekIndex: 7, label: "Semana de cierre" },
].map((item) => ({
  ...item,
  subject: `Recordatorio directores · ${item.label} | Ecosistema WCA`,
  bodyText: buildBodyText(item.label),
  bodyHtml: buildBodyHtml(item.label),
}));

/** Calcula el índice de semana (1-based) desde fechas calendario YYYY-MM-DD. */
export function getCampaignWeekIndex(startDateIso: string, todayOrNow: Date | string = new Date()): number | null {
  const start = parseDateOnly(startDateIso);
  if (!start) return null;
  const today =
    typeof todayOrNow === "string"
      ? parseDateOnly(todayOrNow)
      : new Date(todayOrNow.getFullYear(), todayOrNow.getMonth(), todayOrNow.getDate());
  if (!today) return null;
  const diffMs = today.getTime() - start.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function parseDateOnly(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
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
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const unique = new Set<string>();
  for (const part of parts) {
    const email = part.toLowerCase();
    if (emailRe.test(email)) unique.add(email);
  }
  return Array.from(unique);
}
