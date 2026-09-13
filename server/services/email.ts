import nodemailer from 'nodemailer';

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
}

export type SendRecipientResult = {
  to: string;
  ok: boolean;
  response?: string;
  rejected?: string[];
  error?: string;
};

// Configuración del transportador de correo
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('Error: Las credenciales de correo no están configuradas correctamente');
  console.error('SMTP_USER:', process.env.SMTP_USER ? 'Configurado' : 'No configurado');
  console.error('SMTP_PASS:', process.env.SMTP_PASS ? 'Configurado' : 'No configurado');
}

console.log('Configuración SMTP:', {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS ? '****' : 'No configurado',
  host: 'smtp.gmail.com',
  port: 587
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  debug: true,
  logger: true
});

transporter.verify(function (err: Error | null, _success: true) {
  if (err) {
    console.error('Error al verificar el transportador de correo:', err);
    const error = err as Error & { code?: string };
    if (error.code === 'EAUTH') {
      console.error('Error de autenticación. Verifica SMTP_USER y SMTP_PASS.');
    }
  } else {
    console.log('Servidor listo para enviar correos');
  }
});

const smtpFromAddress = () => process.env.SMTP_USER || 'contacto@ecosistemawca.com';

const defaultFrom = () => `"Ecosistema WCA" <${smtpFromAddress()}>`;

/**
 * Envía de a un destinatario (mejor entrega a dominios institucionales como @tec.mx).
 * Un fallo parcial no oculta los éxitos.
 */
export async function sendTransactionalEmail(
  data: TransactionalEmailData,
): Promise<{ results: SendRecipientResult[] }> {
  const list = (Array.isArray(data.to) ? data.to : [data.to])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean);

  if (list.length === 0) {
    throw new Error('No hay destinatarios');
  }

  const from = data.fromName
    ? `"${data.fromName}" <${smtpFromAddress()}>`
    : defaultFrom();

  const results: SendRecipientResult[] = [];

  for (const to of list) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: data.replyTo || smtpFromAddress(),
        subject: data.subject,
        text: data.text,
        html: data.html ?? data.text.replace(/\n/g, '<br>'),
        // Envelope explícito: evita que Gmail agrupe mal destinatarios institucionales
        envelope: {
          from: smtpFromAddress(),
          to: [to],
        },
      });

      const rejected = Array.isArray(info.rejected)
        ? info.rejected.map(String)
        : [];
      const ok = rejected.length === 0;
      results.push({
        to,
        ok,
        response: info.response,
        rejected,
        error: ok ? undefined : `Rechazado por SMTP: ${rejected.join(', ')}`,
      });
      console.log(
        ok ? 'Correo aceptado para' : 'Correo rechazado para',
        to,
        info.response,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error al enviar a', to, error);
      results.push({ to, ok: false, error: message });
    }
  }

  const anyOk = results.some((r) => r.ok);
  if (!anyOk) {
    throw new Error(
      `No se pudo enviar el correo: ${results.map((r) => `${r.to}: ${r.error}`).join(' | ')}`,
    );
  }

  return { results };
}

export async function sendEmail(data: EmailData): Promise<void> {
  try {
    const mailOptions = {
      from: defaultFrom(),
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
      html: data.html || `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.from}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${data.text.replace(/\n/g, '<br>')}</p>
      `,
    };

    console.log('Intentando enviar correo a:', data.to);
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.response);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw new Error('No se pudo enviar el correo electrónico');
  }
}
