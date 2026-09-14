import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import {
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
  /** contacto | tec_angel */
  senderId?: string;
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

function resolveSmtp(senderId?: string): ResolvedSmtp {
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

export function getSenderAvailability() {
  return {
    contacto: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    tec_angel: !!(process.env.SMTP_TEC_PASS),
  };
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
