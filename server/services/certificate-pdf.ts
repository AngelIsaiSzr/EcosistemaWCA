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
  const names = ["certificate-template.jpg", "certificate-template.jpeg", "certificate-template.png"];
  const bases = [
    path.join(process.cwd(), "server", "assets"),
    path.join(process.cwd(), "dist", "assets"),
    path.join(process.cwd(), "assets"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "assets"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "assets"),
  ];

  for (const base of bases) {
    for (const name of names) {
      const candidate = path.join(base, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  throw new Error(
    "No se encontró la plantilla del certificado (server/assets/certificate-template.jpg)",
  );
}

function isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Buffer): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

/** StandardFonts solo soportan WinAnsi; normaliza caracteres fuera de rango. */
function toWinAnsiSafe(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[–—]/g, "-")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
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

  const fontSerif = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const fontSans = await pdf.embedFont(StandardFonts.Helvetica);

  const image = isJpeg(templateBytes)
    ? await pdf.embedJpg(templateBytes)
    : isPng(templateBytes)
      ? await pdf.embedPng(templateBytes)
      : (() => {
          throw new Error("La plantilla del certificado no es JPEG ni PNG válido");
        })();

  // Misma proporción que la plantilla (evita desfase de textos vs líneas)
  const pageWidth = 842;
  const pageHeight = (pageWidth * image.height) / image.width;
  const page = pdf.addPage([pageWidth, pageHeight]);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  const ink = rgb(0.12, 0.14, 0.18);
  const blue = rgb(0.15, 0.35, 0.75);

  // Nombre: ya calibrado sobre la línea
  const name = toWinAnsiSafe((cert.studentName || "Estudiante").trim());
  const nameFit = fitCenteredText(name, fontSerifBold, pageWidth * 0.74, 32, 16);
  page.drawText(name, {
    x: (pageWidth - nameFit.width) / 2,
    y: pageHeight * 0.455,
    size: nameFit.size,
    font: fontSerifBold,
    color: ink,
  });

  // Programa: centro del hueco entre "el programa:" (~524) y "Fecha de emisión:" (~565)
  const program = toWinAnsiSafe((cert.programTitle || "Programa").trim());
  const progFit = fitCenteredText(program, fontSerifBold, pageWidth * 0.58, 17, 10);
  page.drawText(program, {
    x: (pageWidth - progFit.width) / 2,
    y: pageHeight * 0.312,
    size: progFit.size,
    font: fontSerifBold,
    color: ink,
  });

  // Fecha: misma línea que el rótulo, justo después de "Fecha de emisión:"
  const dateText = toWinAnsiSafe(formatDateEs(cert.issuedAt));
  page.drawText(dateText, {
    x: pageWidth * 0.548,
    y: pageHeight * 0.29,
    size: 12,
    font: fontSerif,
    color: ink,
  });

  // Código discreto (el sitio lo llama certificado; la plantilla dice constancia)
  const code = toWinAnsiSafe(`Código: ${cert.code}`);
  const codeW = fontSans.widthOfTextAtSize(code, 8);
  page.drawText(code, {
    x: (pageWidth - codeW) / 2,
    y: pageHeight * 0.035,
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
