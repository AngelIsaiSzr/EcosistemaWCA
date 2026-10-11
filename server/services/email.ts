import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import {
  EMAIL_SENDER_PROFILES,
  getEmailSenderProfile,
  type EmailSenderProfile,
} from "@shared/director-emails";

export interface EmailData {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  name: string;
}

export interface TransactionalEmailData {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  fromName?: string;
  /** contacto | tec_angel | id de SMTP_EXTRA_SENDERS */
  senderId?: string;
  /** Con CC/CCO se envía un solo correo a todos los destinatarios (Para visible entre ellos). */
  cc?: string[];
  bcc?: string[];
}

export type SendRecipientResult = {
  to: string;
  ok: boolean;
  response?: string;
  rejected?: string[];
  error?: string;
};

type ResolvedSmtp = {
  profile: EmailSenderProfile;
  user: string;
  pass: string;
  fromAddress: string;
};

type ExtraSender = EmailSenderProfile & { user: string; pass: string };

/**
 * Remitentes extra desde Render, sin tocar código. Formato (JSON en una línea):
 * SMTP_EXTRA_SENDERS=[{"id":"talento","email":"talento@ecosistemawca.com","pass":"app-password",
 *   "label":"Talento","host":"smtp.gmail.com","port":587,"user":"opcional"}]
 */
function loadExtraSenders(): ExtraSender[] {
  const raw = process.env.SMTP_EXTRA_SENDERS;
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("debe ser un arreglo");
    const reserved = new Set(EMAIL_SENDER_PROFILES.map((p) => p.id));
    const out: ExtraSender[] = [];
    for (const item of parsed) {
      const email = String(item?.email ?? "").trim().toLowerCase();
      const id = String(item?.id ?? "").trim() || email;
      if (!email || !id || reserved.has(id) || out.some((s) => s.id === id)) continue;
      const host = String(item?.host ?? "").trim() || "smtp.gmail.com";
      out.push({
        id,
        label: String(item?.label ?? "").trim() || email,
        fromEmail: email,
        description: `Remitente adicional (${host}).`,
        smtpHost: host,
        smtpPort: Number(item?.port) || 587,
        user: String(item?.user ?? "").trim() || email,
        pass: String(item?.pass ?? ""),
      });
    }
    return out;
  } catch (error) {
    console.error("SMTP_EXTRA_SENDERS inválido:", error);
    return [];
  }
}

const EXTRA_SENDERS = loadExtraSenders();

/** Todos los remitentes que se pueden elegir en el sitio (sin credenciales). */
export function listSenderProfiles(): EmailSenderProfile[] {
  return [
    ...EMAIL_SENDER_PROFILES,
    ...EXTRA_SENDERS.map(({ user: _u, pass: _p, ...profile }) => profile),
  ];
}

export function isKnownSender(id: string | null | undefined): boolean {
  return !!id && listSenderProfiles().some((p) => p.id === id);
}

function resolveSmtp(senderId?: string): ResolvedSmtp {
  const extra = EXTRA_SENDERS.find((s) => s.id === senderId);
  if (extra) {
    if (!extra.pass) {
      throw new Error(`Falta la contraseña de ${extra.fromEmail} en SMTP_EXTRA_SENDERS.`);
    }
    const { user, pass, ...profile } = extra;
    return { profile, user, pass, fromAddress: extra.fromEmail };
  }

  const profile = getEmailSenderProfile(senderId);

  if (profile.id === "tec_angel") {
    const user = process.env.SMTP_TEC_USER || profile.fromEmail;
    const pass = process.env.SMTP_TEC_PASS || "";
    if (!pass) {
      throw new Error(
        "Falta SMTP_TEC_PASS en el servidor para enviar desde a00844409@tec.mx. Agrégalo en Render (contraseña de la cuenta Tec o app password de Microsoft 365).",
      );
    }
    return { profile, user, pass, fromAddress: profile.fromEmail };
  }

  const user = process.env.SMTP_USER || profile.fromEmail;
  const pass = process.env.SMTP_PASS || "";
  if (!user || !pass) {
    throw new Error("Faltan SMTP_USER / SMTP_PASS para el correo de contacto.");
  }
  return {
    profile,
    user,
    pass,
    fromAddress: process.env.SMTP_USER || profile.fromEmail,
  };
}

function createTransport(resolved: ResolvedSmtp) {
  const options: SMTPTransport.Options = {
    host: resolved.profile.smtpHost,
    port: resolved.profile.smtpPort,
    secure: false,
    auth: {
      user: resolved.user,
      pass: resolved.pass,
    },
  };
  return nodemailer.createTransport(options);
}

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("SMTP_USER / SMTP_PASS no configurados (correo contacto).");
} else {
  console.log("SMTP contacto listo:", process.env.SMTP_USER);
}
if (process.env.SMTP_TEC_PASS) {
  console.log("SMTP Tec configurado:", process.env.SMTP_TEC_USER || "a00844409@tec.mx");
} else {
  console.log("SMTP Tec no configurado (opcional: SMTP_TEC_USER / SMTP_TEC_PASS).");
}

if (EXTRA_SENDERS.length > 0) {
  console.log("Remitentes extra:", EXTRA_SENDERS.map((s) => s.fromEmail).join(", "));
}

export function getSenderAvailability(): Record<string, boolean> {
  const availability: Record<string, boolean> = {
    contacto: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    tec_angel: !!(process.env.SMTP_TEC_PASS),
  };
  for (const s of EXTRA_SENDERS) availability[s.id] = !!s.pass;
  return availability;
}

export async function sendTransactionalEmail(
  data: TransactionalEmailData,
): Promise<{ results: SendRecipientResult[]; fromAddress: string }> {
  const list = (Array.isArray(data.to) ? data.to : [data.to])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean);

  if (list.length === 0) {
    throw new Error("No hay destinatarios");
  }

  const resolved = resolveSmtp(data.senderId);
  const transporter = createTransport(resolved);
  const from = data.fromName
    ? `"${data.fromName}" <${resolved.fromAddress}>`
    : `"Ecosistema WCA" <${resolved.fromAddress}>`;

  const results: SendRecipientResult[] = [];
  const normalize = (arr?: string[]) =>
    (arr ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  const cc = normalize(data.cc).filter((e) => !list.includes(e));
  const bcc = normalize(data.bcc).filter((e) => !list.includes(e) && !cc.includes(e));

  if (cc.length > 0 || bcc.length > 0) {
    const all = [...list, ...cc, ...bcc];
    try {
      const info = await transporter.sendMail({
        from,
        to: list,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        replyTo: data.replyTo || resolved.fromAddress,
        subject: data.subject,
        text: data.text,
        html: data.html ?? data.text.replace(/\n/g, "<br>"),
      });
      const rejected = new Set(
        (Array.isArray(info.rejected) ? info.rejected : []).map((r) => String(r).toLowerCase()),
      );
      for (const to of all) {
        const ok = !rejected.has(to);
        results.push({
          to,
          ok,
          response: info.response,
          error: ok ? undefined : "Rechazado por SMTP",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error al enviar correo con CC/CCO", error);
      for (const to of all) results.push({ to, ok: false, error: message });
    }

    if (!results.some((r) => r.ok)) {
      throw new Error(
        `No se pudo enviar el correo: ${results.map((r) => `${r.to}: ${r.error}`).join(" | ")}`,
      );
    }
    return { results, fromAddress: resolved.fromAddress };
  }

  for (const to of list) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: data.replyTo || resolved.fromAddress,
        subject: data.subject,
        text: data.text,
        html: data.html ?? data.text.replace(/\n/g, "<br>"),
        envelope: {
          from: resolved.fromAddress,
          to: [to],
        },
      });

      const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];
      const ok = rejected.length === 0;
      results.push({
        to,
        ok,
        response: info.response,
        rejected,
        error: ok ? undefined : `Rechazado por SMTP: ${rejected.join(", ")}`,
      });
      console.log(ok ? "Correo aceptado para" : "Correo rechazado para", to, info.response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error al enviar a", to, error);
      results.push({ to, ok: false, error: message });
    }
  }

  if (!results.some((r) => r.ok)) {
    throw new Error(
      `No se pudo enviar el correo: ${results.map((r) => `${r.to}: ${r.error}`).join(" | ")}`,
    );
  }

  return { results, fromAddress: resolved.fromAddress };
}

/** Contacto legacy (formulario público). */
export async function sendEmail(data: EmailData): Promise<void> {
  const resolved = resolveSmtp("contacto");
  const transporter = createTransport(resolved);
  try {
    await transporter.sendMail({
      from: `"Ecosistema WCA" <${resolved.fromAddress}>`,
      to: data.to,
      replyTo: data.from,
      subject: data.subject,
      text: data.html
        ? data.text
        : `
Nuevo mensaje de contacto:
Nombre: ${data.name}
Email: ${data.from}
Mensaje:
${data.text}
      `,
      html:
        data.html ||
        `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.from}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${data.text.replace(/\n/g, "<br>")}</p>
      `,
    });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    throw new Error("No se pudo enviar el correo electrónico");
  }
}
