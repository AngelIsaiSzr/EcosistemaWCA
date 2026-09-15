/** Enlace por defecto a la LXP (TechHuman / programas nuevos). */
export const DEFAULT_LXP_ENROLLMENT_URL = "https://lxp.ecosistemawca.com";

export function resolveLxpEnrollmentUrl(url: string | null | undefined): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return DEFAULT_LXP_ENROLLMENT_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
