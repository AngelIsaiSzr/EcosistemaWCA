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

/**
 * Anclas en píxeles de la plantilla 1024×791 (Y desde arriba).
 * Medidas con rejilla sobre la plantilla:
 * - "Por haber completado…": baseline ≈ 470
 * - "Fecha de emisión:": baseline ≈ 520
 * - Hueco del programa: 470–520 → centro ≈ 495
 */
const LAYOUT = {
  nameLineY: 432,
  /** Hueco 470–520; un poco más abajo en el centro */
  programY: 500,
  dateY: 524,
  /** Pegado al final de "Fecha de emisión:" */
  dateX: 505,
} as const;

/** Genera el PDF usando la plantilla oficial WCA + CECyTE. */
export async function buildCertificatePdf(cert: Certificate): Promise<Uint8Array> {
  const templatePath = resolveTemplatePath();
  const templateBytes = fs.readFileSync(templatePath);
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

  // Página = tamaño nativo de la plantilla (1 punto ≈ 1 px) para alinear textos
  const pageWidth = image.width;
  const pageHeight = image.height;
  const page = pdf.addPage([pageWidth, pageHeight]);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  const ink = rgb(0.12, 0.14, 0.18);
  const blue = rgb(0.15, 0.35, 0.75);

  // yImg (desde arriba) → yPdf (desde abajo). Baseline ≈ ancla.
  const yPdf = (yImg: number) => pageHeight - yImg;

  const name = toWinAnsiSafe((cert.studentName || "Estudiante").trim());
  const nameFit = fitCenteredText(name, fontSerifBold, pageWidth * 0.74, 36, 16);
  page.drawText(name, {
    x: (pageWidth - nameFit.width) / 2,
    y: yPdf(LAYOUT.nameLineY),
    size: nameFit.size,
    font: fontSerifBold,
    color: ink,
  });

  const program = toWinAnsiSafe((cert.programTitle || "Programa").trim());
  const progFit = fitCenteredText(program, fontSerifBold, pageWidth * 0.58, 20, 11);
  page.drawText(program, {
    x: (pageWidth - progFit.width) / 2,
    y: yPdf(LAYOUT.programY),
    size: progFit.size,
    font: fontSerifBold,
    color: ink,
  });

  const dateText = toWinAnsiSafe(formatDateEs(cert.issuedAt));
  const dateSize = 13;
  page.drawText(dateText, {
    x: LAYOUT.dateX,
    y: yPdf(LAYOUT.dateY),
    size: dateSize,
    font: fontSerif,
    color: ink,
  });

  const code = toWinAnsiSafe(`Código: ${cert.code}`);
  const codeSize = 9;
  const codeW = fontSans.widthOfTextAtSize(code, codeSize);
  page.drawText(code, {
    x: (pageWidth - codeW) / 2,
    y: 26,
    size: codeSize,
    font: fontSans,
    color: blue,
  });

  return pdf.save();
}

export function makeCertificateCode(userId: number, courseId: number): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WCA-${courseId}-${userId}-${rand}`;
}
