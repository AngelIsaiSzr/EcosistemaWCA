/** Utilidades para incrustar vídeos / presentaciones de Google Drive, Slides u otros hosts. */

export function extractGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch?.[1]) return fileMatch[1];
  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch?.[1]) return openMatch[1];
  const folders = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folders?.[1]) return folders[1];
  return null;
}

/** ID de Google Slides (/presentation/d/ID/...). */
export function extractGoogleSlidesId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com/i.test(url.trim());
}

export function isGoogleSlidesUrl(url: string): boolean {
  return /docs\.google\.com\/presentation/i.test(url.trim());
}

/** Embed de Google Slides (presentación interactiva). */
export function toGoogleSlidesEmbedUrl(url: string): string | null {
  const id = extractGoogleSlidesId(url);
  if (!id) return null;
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=5000`;
}

/** Vista embebible de archivo Drive (vídeo o PDF) o carpeta. */
export function toGoogleDrivePreviewUrl(url: string): string | null {
  if (isGoogleSlidesUrl(url)) return toGoogleSlidesEmbedUrl(url);

  const id = extractGoogleDriveFileId(url);
  if (!id) return null;
  if (/\/folders\//i.test(url)) {
    return `https://drive.google.com/embeddedfolderview?id=${id}#list`;
  }
  // /preview es el player oficial de Drive para vídeo/PDF
  return `https://drive.google.com/file/d/${id}/preview`;
}

/** Enlace “abrir en Drive/Slides” para cuando el embed falle. */
export function toGoogleOpenUrl(url: string): string {
  const trimmed = url.trim();
  if (isGoogleSlidesUrl(trimmed)) {
    const id = extractGoogleSlidesId(trimmed);
    if (id) return `https://docs.google.com/presentation/d/${id}/present`;
  }
  const id = extractGoogleDriveFileId(trimmed);
  if (id && !/\/folders\//i.test(trimmed)) {
    return `https://drive.google.com/file/d/${id}/view`;
  }
  return trimmed;
}

export function isDirectVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(u) ||
    u.startsWith("/media/") ||
    u.includes("files.catbox.moe")
  );
}

export type MediaKind =
  | "drive-embed"
  | "slides-embed"
  | "video"
  | "iframe"
  | "link"
  | "empty";

export function resolveLessonMedia(url: string | null | undefined): {
  kind: MediaKind;
  src: string;
} {
  const trimmed = (url || "").trim();
  if (!trimmed) return { kind: "empty", src: "" };

  if (isGoogleSlidesUrl(trimmed)) {
    const embed = toGoogleSlidesEmbedUrl(trimmed);
    return { kind: "slides-embed", src: embed || trimmed };
  }

  if (isGoogleDriveUrl(trimmed)) {
    const preview = toGoogleDrivePreviewUrl(trimmed);
    return { kind: "drive-embed", src: preview || trimmed };
  }

  if (isDirectVideoUrl(trimmed)) return { kind: "video", src: trimmed };
  if (/\.pdf(\?|$)/i.test(trimmed)) return { kind: "iframe", src: trimmed };
  return { kind: "link", src: trimmed };
}

/** Resuelve presentación: Slides, Drive PDF, PDF directo o link. */
export function resolvePresentationMedia(url: string | null | undefined): {
  kind: MediaKind;
  src: string;
} {
  return resolveLessonMedia(url);
}
