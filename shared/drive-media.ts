/** Utilidades para incrustar vídeos/PDF de Google Drive u otros hosts. */

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

export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com/i.test(url.trim());
}

/** Vista embebible de archivo Drive (vídeo o PDF). */
export function toGoogleDrivePreviewUrl(url: string): string | null {
  const id = extractGoogleDriveFileId(url);
  if (!id) return null;
  if (/\/folders\//i.test(url)) {
    return `https://drive.google.com/embeddedfolderview?id=${id}#list`;
  }
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function isDirectVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(u) ||
    u.startsWith("/media/") ||
    u.includes("files.catbox.moe")
  );
}

export type MediaKind = "drive-embed" | "video" | "iframe" | "link" | "empty";

export function resolveLessonMedia(url: string | null | undefined): {
  kind: MediaKind;
  src: string;
} {
  const trimmed = (url || "").trim();
  if (!trimmed) return { kind: "empty", src: "" };
  if (isGoogleDriveUrl(trimmed)) {
    const preview = toGoogleDrivePreviewUrl(trimmed);
    return { kind: "drive-embed", src: preview || trimmed };
  }
  if (isDirectVideoUrl(trimmed)) return { kind: "video", src: trimmed };
  if (/\.pdf(\?|$)/i.test(trimmed)) return { kind: "iframe", src: trimmed };
  return { kind: "link", src: trimmed };
}
