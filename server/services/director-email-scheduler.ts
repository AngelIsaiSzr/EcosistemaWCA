import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  emailAutomationLogs,
  emailAutomationSettings,
  emailWeekTemplates,
  type EmailAutomationSettings,
  type EmailWeekTemplate,
} from "@shared/schema";
import {
  getCampaignWeekIndex,
  parseRecipientList,
} from "@shared/director-emails";
import { ensureEmailAutomationTables } from "../db/ensure-email-automation";
import { sendTransactionalEmail } from "./email";

const TIMEZONE = "America/Mexico_City";

export function getMexicoCalendarParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return {
    dateIso: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

function mexicoParts(now = new Date()) {
  return getMexicoCalendarParts(now);
}

async function getSettings(): Promise<EmailAutomationSettings> {
  await ensureEmailAutomationTables();
  const [row] = await db.select().from(emailAutomationSettings).limit(1);
  if (!row) throw new Error("Falta configuración de automatización de correos");
  return row;
}

async function logSend(params: {
  kind: string;
  weekIndex?: number | null;
  templateId?: number | null;
  recipients: string[];
  subject: string;
  status: "sent" | "error";
  errorMessage?: string;
}) {
  await db.insert(emailAutomationLogs).values({
    kind: params.kind,
    weekIndex: params.weekIndex ?? null,
    templateId: params.templateId ?? null,
    recipients: params.recipients,
    subject: params.subject,
    status: params.status,
    errorMessage: params.errorMessage ?? null,
  });
}

export async function sendDirectorTemplateEmail(opts: {
  template: EmailWeekTemplate;
  recipients: string[];
  kind: "weekly" | "test";
}) {
  const recipients = parseRecipientList(opts.recipients);
  if (recipients.length === 0) {
    throw new Error("No hay destinatarios válidos");
  }

  try {
    await sendTransactionalEmail({
      to: recipients,
      subject: opts.kind === "test" ? `[PRUEBA] ${opts.template.subject}` : opts.template.subject,
      text: opts.template.bodyText,
      html: opts.template.bodyHtml,
      replyTo: process.env.SMTP_USER || "contacto@ecosistemawca.com",
    });
    await logSend({
      kind: opts.kind,
      weekIndex: opts.template.weekIndex,
      templateId: opts.template.id,
      recipients,
      subject: opts.template.subject,
      status: "sent",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await logSend({
      kind: opts.kind,
      weekIndex: opts.template.weekIndex,
      templateId: opts.template.id,
      recipients,
      subject: opts.template.subject,
      status: "error",
      errorMessage: message,
    });
    throw error;
  }
}

export async function runDirectorWeeklyEmailJob(now = new Date()): Promise<{
  ran: boolean;
  reason?: string;
}> {
  await ensureEmailAutomationTables();
  const settings = await getSettings();
  if (!settings.enabled) {
    return { ran: false, reason: "disabled" };
  }

  const recipients = parseRecipientList(settings.recipients);
  if (recipients.length === 0) {
    return { ran: false, reason: "no-recipients" };
  }

  const local = mexicoParts(now);
  if (local.weekday !== settings.sendWeekday) {
    return { ran: false, reason: "wrong-weekday" };
  }
  if (local.hour < settings.sendHour) {
    return { ran: false, reason: "too-early" };
  }

  const weekIndex = getCampaignWeekIndex(settings.startDate, local.dateIso);
  if (!weekIndex) {
    return { ran: false, reason: "before-start" };
  }

  const [template] = await db
    .select()
    .from(emailWeekTemplates)
    .where(and(eq(emailWeekTemplates.weekIndex, weekIndex), eq(emailWeekTemplates.enabled, true)))
    .limit(1);

  if (!template) {
    return { ran: false, reason: "no-template" };
  }

  const already = await db
    .select({ id: emailAutomationLogs.id })
    .from(emailAutomationLogs)
    .where(
      and(
        eq(emailAutomationLogs.kind, "weekly"),
        eq(emailAutomationLogs.weekIndex, weekIndex),
        eq(emailAutomationLogs.status, "sent"),
      ),
    )
    .limit(1);

  if (already.length > 0) {
    return { ran: false, reason: "already-sent" };
  }

  await sendDirectorTemplateEmail({ template, recipients, kind: "weekly" });
  return { ran: true };
}

let schedulerStarted = false;

export function startDirectorEmailScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const tick = async () => {
    try {
      const result = await runDirectorWeeklyEmailJob();
      if (result.ran) {
        console.log("[email-automation] Recordatorio semanal enviado");
      }
    } catch (error) {
      console.error("[email-automation] Error en job semanal:", error);
    }
  };

  // Primera pasada a los 30s; luego cada 5 min
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), 5 * 60 * 1000);
  }, 30_000);

  console.log("[email-automation] Scheduler de recordatorios a directores iniciado");
}
