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

transporter.verify(function (err: Error | null, success: true) {
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

const defaultFrom = () =>
  `"Ecosistema WCA" <${process.env.SMTP_USER || 'contacto@ecosistemawca.com'}>`;

export async function sendTransactionalEmail(data: TransactionalEmailData): Promise<void> {
  try {
    const to = Array.isArray(data.to) ? data.to.join(', ') : data.to;
    const mailOptions = {
      from: data.fromName
        ? `"${data.fromName}" <${process.env.SMTP_USER || 'contacto@ecosistemawca.com'}>`
        : defaultFrom(),
      to,
      replyTo: data.replyTo,
      subject: data.subject,
      text: data.text,
      html: data.html ?? data.text.replace(/\n/g, '<br>'),
    };

    console.log('Enviando correo transaccional a:', to, '|', data.subject);
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.response);
  } catch (error) {
    console.error('Error al enviar correo transaccional:', error);
    throw new Error('No se pudo enviar el correo electrónico');
  }
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
