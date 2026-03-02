import nodemailer from 'nodemailer';

export interface EmailData {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  name: string;
}

// Configuración del transportador de correo
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('Error: Las credenciales de correo no están configuradas correctamente');
  console.error('SMTP_USER:', process.env.SMTP_USER ? 'Configurado' : 'No configurado');
  console.error('SMTP_PASS:', process.env.SMTP_PASS ? 'Configurado' : 'No configurado');
}

// Log de la configuración (sin mostrar la contraseña)
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
  debug: true, // Habilitar logs de debug
  logger: true // Habilitar logs del transportador
});

// Verificar la conexión
transporter.verify(function (err: Error | null, success: true) {
  if (err) {
    console.error('Error al verificar el transportador de correo:', err);
    const error = err as Error & { code?: string };
    if (error.code === 'EAUTH') {
      console.error('Error de autenticación. Verifica que las credenciales SMTP_USER y SMTP_PASS estén configuradas correctamente en las variables de entorno.');
      console.error('SMTP_USER:', process.env.SMTP_USER);
      console.error('SMTP_PASS:', process.env.SMTP_PASS ? '****' : 'No configurado');
    }
  } else {
    console.log('Servidor listo para enviar correos');
  }
});

export async function sendEmail(data: EmailData): Promise<void> {
  try {
    const mailOptions = {
      from: `"Ecosistema WCA" <${process.env.SMTP_USER || 'contacto@ecosistemawca.com'}>`,
      to: data.to,
      replyTo: data.from,
      subject: data.subject,
      text: `
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
    console.log('Configuración del correo:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.response);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    if (error instanceof Error) {
      console.error('Detalles del error:', {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        response: (error as any).response
      });
    }
    throw new Error('No se pudo enviar el correo electrónico');
  }
} 