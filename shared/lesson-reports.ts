export const LESSON_REPORT_REASONS = [
  { id: "error", label: "Error técnico" },
  { id: "bug", label: "Bug / fallo de la plataforma" },
  { id: "missing", label: "Contenido faltante" },
  { id: "damaged", label: "Contenido dañado o ilegible" },
  { id: "video", label: "El vídeo no se reproduce" },
  { id: "slides", label: "La presentación no carga" },
  { id: "resources", label: "Recursos incorrectos o inaccesibles" },
  { id: "other", label: "Otro" },
] as const;

export type LessonReportReasonId = (typeof LESSON_REPORT_REASONS)[number]["id"];

export const LESSON_REPORT_REASON_IDS = LESSON_REPORT_REASONS.map((r) => r.id);

export function labelsForReportReasons(ids: string[]): string[] {
  return ids.map((id) => LESSON_REPORT_REASONS.find((r) => r.id === id)?.label ?? id);
}
