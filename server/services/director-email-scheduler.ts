import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  emailAutomationLogs,
  emailAutomationSettings,
  emailWeekTemplates,
  type EmailAutomationSettings,
  type EmailWeekTemplate,
} from "@shared/schema";
import { parseRecipientList } from "@shared/director-emails";
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
  sendDate?: string | null;
  recipients: string[];
  subject: string;
  status: "sent" | "error" | "partial";
  errorMessage?: string;
}) {
  await db.insert(emailAutomationLogs).values({
    kind: params.kind,
    weekIndex: params.weekIndex ?? null,
    templateId: params.templateId ?? null,
    sendDate: params.sendDate ?? null,
    recipients: params.recipients,
    subject: params.subject,
    status: params.status,
    errorMessage: params.errorMessage ?? null,
  });
}

/** Destinatarios efectivos de un correo: los propios si tiene, si no la lista general. */
export function resolveTemplateRecipients(
  template: Pick<EmailWeekTemplate, "recipientsOverride">,
  settings: Pick<EmailAutomationSettings, "recipients"> | null | undefined,
) {
  const own = parseRecipientList(template.recipientsOverride ?? []);
  return own.length > 0 ? own : parseRecipientList(settings?.recipients);
}

type SendableTemplate = Pick<EmailWeekTemplate, "subject" | "bodyText" | "bodyHtml"> &
  Partial<Pick<EmailWeekTemplate, "id" | "weekIndex" | "sendDate">>;

export async function sendDirectorTemplateEmail(opts: {
  template: SendableTemplate;
  recipients: string[];
  kind: "weekly" | "test" | "manual";
  senderId?: string;
  cc?: string[];
  bcc?: string[];
}) {
  const recipients = parseRecipientList(opts.recipients);
  if (recipients.length === 0) {
    throw new Error("No hay destinatarios válidos");
  }

  const subject =
    opts.kind === "test" ? `[PRUEBA] ${opts.template.subject}` : opts.template.subject;

  let senderId = opts.senderId;
  if (!senderId) {
    const settings = await getSettings();
    senderId = settings.senderId || "contacto";
  }

  try {
    const { results } = await sendTransactionalEmail({
      to: recipients,
      subject,
      text: opts.template.bodyText,
      html: opts.template.bodyHtml,
      replyTo: undefined,
      senderId,
      cc: opts.cc,
      bcc: opts.bcc,
    });

    const failed = results.filter((r) => !r.ok);
    const okList = results.filter((r) => r.ok).map((r) => r.to);
    const status = failed.length === 0 ? "sent" : "partial";

    await logSend({
      kind: opts.kind,
      weekIndex: opts.template.weekIndex ?? null,
      templateId: opts.template.id ?? null,
      sendDate: opts.template.sendDate ?? null,
      recipients: okList.length ? okList : recipients,
      subject: opts.template.subject,
      status,
      errorMessage:
        failed.length > 0
          ? failed.map((f) => `${f.to}: ${f.error ?? "falló"}`).join(" | ")
          : undefined,
    });

    if (failed.length > 0 && okList.length === 0) {
      throw new Error(failed.map((f) => `${f.to}: ${f.error}`).join(" | "));
    }

    return { results, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await logSend({
      kind: opts.kind,
      weekIndex: opts.template.weekIndex ?? null,
      templateId: opts.template.id ?? null,
      sendDate: opts.template.sendDate ?? null,
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

  const local = getMexicoCalendarParts(now);

  const templates = await db
    .select()
    .from(emailWeekTemplates)
    .where(eq(emailWeekTemplates.enabled, true));

  const due = templates.filter(
    (t) => t.sendDate && t.sendDate === local.dateIso && local.hour >= (t.sendHour ?? settings.sendHour),
  );
  if (due.length === 0) {
    return { ran: false, reason: "no-template-due" };
  }

  let sentAny = false;
  for (const template of due) {
    const recipients = resolveTemplateRecipients(template, settings);
    if (recipients.length === 0) continue;

    // Ya enviado ese día (automático o con "Enviar ahora"), aunque haya sido parcial.
    const already = await db
      .select({ id: emailAutomationLogs.id })
      .from(emailAutomationLogs)
      .where(
        and(
          inArray(emailAutomationLogs.kind, ["weekly", "manual"]),
          eq(emailAutomationLogs.templateId, template.id),
          eq(emailAutomationLogs.sendDate, template.sendDate!),
          inArray(emailAutomationLogs.status, ["sent", "partial"]),
        ),
      )
      .limit(1);

    if (already.length > 0) {
      continue;
    }

    await sendDirectorTemplateEmail({
      template,
      recipients,
      kind: "weekly",
      senderId: settings.senderId || "contacto",
      cc: parseRecipientList(settings.ccRecipients),
      bcc: parseRecipientList(settings.bccRecipients),
    });
    sentAny = true;
  }

  return sentAny ? { ran: true } : { ran: false, reason: "already-sent" };
}

let schedulerStarted = false;

export function startDirectorEmailScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const tick = async () => {
    try {
      const result = await runDirectorWeeklyEmailJob();
      if (result.ran) {
        console.log("[email-automation] Recordatorio programado enviado");
      }
    } catch (error) {
      console.error("[email-automation] Error en job semanal:", error);
    }
  };

  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), 5 * 60 * 1000);
  }, 30_000);

  console.log("[email-automation] Scheduler de recordatorios a directores iniciado");
}
