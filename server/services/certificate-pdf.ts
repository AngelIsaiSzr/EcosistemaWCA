import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { Certificate } from "@shared/schema";

function formatDateEs(date: Date | string | null | undefined): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Genera un certificado PDF horizontal (A4 landscape). */
export async function buildCertificatePdf(cert: Certificate): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.12, 0.18, 0.28);
  const accent = rgb(0.35, 0.56, 0.82); // ~ #5b8fd4
  const muted = rgb(0.35, 0.4, 0.48);
  const cream = rgb(0.98, 0.98, 0.99);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: cream,
  });

  // Marco
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: accent,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: navy,
    borderWidth: 0.8,
  });

  // Barra superior
  page.drawRectangle({
    x: 36,
    y: height - 88,
    width: width - 72,
    height: 52,
    color: navy,
  });

  const brand = "Ecosistema WCA";
  const brandWidth = fontBold.widthOfTextAtSize(brand, 18);
  page.drawText(brand, {
    x: (width - brandWidth) / 2,
    y: height - 70,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const subtitle = "Certificado de finalizacion";
  const subW = font.widthOfTextAtSize(subtitle, 11);
  page.drawText(subtitle, {
    x: (width - subW) / 2,
    y: height - 120,
    size: 11,
    font,
    color: muted,
  });

  const grant = "Se otorga el presente reconocimiento a";
  const grantW = font.widthOfTextAtSize(grant, 12);
  page.drawText(grant, {
    x: (width - grantW) / 2,
    y: height - 165,
    size: 12,
    font,
    color: muted,
  });

  const name = cert.studentName || "Estudiante";
  let nameSize = 28;
  let nameW = fontBold.widthOfTextAtSize(name, nameSize);
  while (nameW > width - 120 && nameSize > 16) {
    nameSize -= 1;
    nameW = fontBold.widthOfTextAtSize(name, nameSize);
  }
  page.drawText(name, {
    x: (width - nameW) / 2,
    y: height - 210,
    size: nameSize,
    font: fontBold,
    color: navy,
  });

  // Línea bajo el nombre
  page.drawLine({
    start: { x: width / 2 - 140, y: height - 222 },
    end: { x: width / 2 + 140, y: height - 222 },
    thickness: 1,
    color: accent,
  });

  const by = "por haber completado satisfactoriamente el programa";
  const byW = font.widthOfTextAtSize(by, 12);
  page.drawText(by, {
    x: (width - byW) / 2,
    y: height - 255,
    size: 12,
    font,
    color: muted,
  });

  const program = cert.programTitle || "Programa";
  let progSize = 20;
  let progW = fontBold.widthOfTextAtSize(program, progSize);
  while (progW > width - 120 && progSize > 12) {
    progSize -= 1;
    progW = fontBold.widthOfTextAtSize(program, progSize);
  }
  page.drawText(program, {
    x: (width - progW) / 2,
    y: height - 290,
    size: progSize,
    font: fontBold,
    color: accent,
  });

  const dateLabel = `Fecha de emision: ${formatDateEs(cert.issuedAt)}`;
  const dateW = font.widthOfTextAtSize(dateLabel, 11);
  page.drawText(dateLabel, {
    x: (width - dateW) / 2,
    y: 120,
    size: 11,
    font,
    color: muted,
  });

  const codeLabel = `Codigo de verificacion: ${cert.code}`;
  const codeW = font.widthOfTextAtSize(codeLabel, 10);
  page.drawText(codeLabel, {
    x: (width - codeW) / 2,
    y: 98,
    size: 10,
    font,
    color: muted,
  });

  page.drawText("ecosistemawca.com", {
    x: 52,
    y: 52,
    size: 9,
    font,
    color: muted,
  });

  // Marca de agua sutil
  page.drawText("WCA", {
    x: width / 2 - 60,
    y: height / 2 - 40,
    size: 72,
    font: fontBold,
    color: rgb(0.92, 0.93, 0.95),
    rotate: degrees(-18),
  });

  return pdf.save();
}

export function makeCertificateCode(userId: number, courseId: number): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WCA-${courseId}-${userId}-${rand}`;
}
