export type ModuleVideoPart = {
  label: string;
  url: string;
};

type ModuleVideoSource = {
  videoUrl?: string | null;
  videoParts?: ModuleVideoPart[] | null;
};

/** Normaliza partes de vídeo; si no hay videoParts, usa videoUrl como Parte 1. */
export function resolveModuleVideoParts(module: ModuleVideoSource): ModuleVideoPart[] {
  const raw = Array.isArray(module.videoParts) ? module.videoParts : [];
  const cleaned = raw
    .map((part, index) => {
      const url = String(part?.url ?? "").trim();
      if (!url) return null;
      const label = String(part?.label ?? "").trim() || `Parte ${index + 1}`;
      return { label, url };
    })
    .filter((p): p is ModuleVideoPart => p != null);

  if (cleaned.length > 0) {
    return cleaned.map((part, index) => ({
      label: part.label || `Parte ${index + 1}`,
      url: part.url,
    }));
  }

  const single = String(module.videoUrl ?? "").trim();
  if (single) return [{ label: "Parte 1", url: single }];
  return [];
}

export function moduleHasVideo(module: ModuleVideoSource): boolean {
  return resolveModuleVideoParts(module).length > 0;
}

/** Prepara payload para guardar: limpia partes y sincroniza videoUrl = primera. */
export function serializeModuleVideoParts(
  parts: Array<{ label?: string; url?: string }>,
): { videoParts: ModuleVideoPart[]; videoUrl: string } {
  const videoParts = parts
    .map((part, index) => {
      const url = String(part?.url ?? "").trim();
      if (!url) return null;
      return {
        label: String(part?.label ?? "").trim() || `Parte ${index + 1}`,
        url,
      };
    })
    .filter((p): p is ModuleVideoPart => p != null);

  return {
    videoParts,
    videoUrl: videoParts[0]?.url ?? "",
  };
}
