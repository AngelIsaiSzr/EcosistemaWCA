import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Certificate } from "@shared/schema";

function formatDateEs(date: Date | string | null | undefined): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function resolveTemplatePath(): string {
  const candidates = [
    path.join(process.cwd(), "server", "assets", "certificate-template.png"),
    path.join(process.cwd(), "assets", "certificate-template.png"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "certificate-template.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    "No se encontró la plantilla del certificado (server/assets/certificate-template.png)",
  );
}

function fitCenteredText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  maxWidth: number,
  startSize: number,
  minSize: number,
): { size: number; width: number } {
  let size = startSize;
  let width = font.widthOfTextAtSize(text, size);
  while (width > maxWidth && size > minSize) {
    size -= 0.5;
    width = font.widthOfTextAtSize(text, size);
  }
  return { size, width };
}

/** Genera el PDF usando la plantilla oficial WCA + CECyTE. */
export async function buildCertificatePdf(cert: Certificate): Promise<Uint8Array> {
  const templateBytes = fs.readFileSync(resolveTemplatePath());
  const pdf = await PDFDocument.create();

  // A4 landscape
  const pageWidth = 842;
  const pageHeight = 595;
  const page = pdf.addPage([pageWidth, pageHeight]);

  const png = await pdf.embedPng(templateBytes);
  page.drawImage(png, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  const fontSerif = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const fontSans = await pdf.embedFont(StandardFonts.Helvetica);

  const ink = rgb(0.12, 0.14, 0.18);
  const blue = rgb(0.15, 0.35, 0.75);

  // Coordenadas calibradas sobre la plantilla (origen abajo-izquierda)
  const name = (cert.studentName || "Estudiante").trim();
  const nameFit = fitCenteredText(name, fontSerifBold, pageWidth * 0.72, 22, 12);
  page.drawText(name, {
    x: (pageWidth - nameFit.width) / 2,
    y: pageHeight * 0.505,
    size: nameFit.size,
    font: fontSerifBold,
    color: ink,
  });

  const program = (cert.programTitle || "Programa").trim();
  const progFit = fitCenteredText(program, fontSerifBold, pageWidth * 0.55, 16, 10);
  page.drawText(program, {
    x: (pageWidth - progFit.width) / 2,
    y: pageHeight * 0.398,
    size: progFit.size,
    font: fontSerifBold,
    color: ink,
  });

  const dateText = formatDateEs(cert.issuedAt);
  // A la derecha de "Fecha de emisión:" en la plantilla
  page.drawText(dateText, {
    x: pageWidth * 0.445,
    y: pageHeight * 0.348,
    size: 12,
    font: fontSerif,
    color: ink,
  });

  // Código discreto (el sitio lo llama certificado; la plantilla dice constancia)
  const code = `Código: ${cert.code}`;
  const codeW = fontSans.widthOfTextAtSize(code, 8);
  page.drawText(code, {
    x: (pageWidth - codeW) / 2,
    y: 22,
    size: 8,
    font: fontSans,
    color: blue,
  });

  return pdf.save();
}

export function makeCertificateCode(userId: number, courseId: number): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WCA-${courseId}-${userId}-${rand}`;
}
