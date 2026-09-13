export const TEAM_ROLE_COLOR_IDS = [
  "blue-strong",
  "purple",
  "red",
  "blue",
  "yellow",
  "red-soft",
  "green",
  "green-soft",
  "blue-dark",
] as const;

export type TeamRoleColorId = (typeof TEAM_ROLE_COLOR_IDS)[number];

export const DEFAULT_TEAM_ROLE_COLOR: TeamRoleColorId = "blue";

export const TEAM_ROLE_COLORS: {
  id: TeamRoleColorId;
  label: string;
  hint: string;
  /** Clase de texto (accent-*) para el sitio público */
  textClass: string;
  /** Token CSS para swatch */
  swatchVar: string;
  /** HSL sin envolver: "H S% L%" — color visible en claro/oscuro */
  hsl: string;
}[] = [
  {
    id: "blue-strong",
    label: "Azul fuerte",
    hint: "Como el de LinkedIn",
    textClass: "accent-blue-strong",
    swatchVar: "--accent-blue-strong",
    hsl: "215 78% 58%",
  },
  {
    id: "purple",
    label: "Morado",
    hint: "Púrpura WCA",
    textClass: "accent-purple",
    swatchVar: "--accent-purple",
    hsl: "270 95% 68%",
  },
  {
    id: "red",
    label: "Rojo fuerte",
    hint: "Rojo intenso",
    textClass: "accent-red",
    swatchVar: "--accent-red",
    hsl: "355 100% 62%",
  },
  {
    id: "blue",
    label: "Azul WCA",
    hint: "Clásico más bajito",
    textClass: "accent-blue",
    swatchVar: "--accent-blue",
    hsl: "215 49.4% 65.9%",
  },
  {
    id: "yellow",
    label: "Amarillo",
    hint: "Amarillo WCA",
    textClass: "accent-yellow",
    swatchVar: "--accent-yellow",
    hsl: "50 100% 50%",
  },
  {
    id: "red-soft",
    label: "Rojo suave",
    hint: "Rojo más bajito",
    textClass: "accent-red-soft",
    swatchVar: "--accent-red-soft",
    hsl: "355 75% 72%",
  },
  {
    id: "green",
    label: "Verde fuerte",
    hint: "Verde intenso",
    textClass: "accent-green",
    swatchVar: "--accent-green",
    // Más claro que el token histórico (25%) para que se lea en fondos oscuros
    hsl: "142 70% 45%",
  },
  {
    id: "green-soft",
    label: "Verde suave",
    hint: "Verde más bajito",
    textClass: "accent-green-soft",
    swatchVar: "--accent-green-soft",
    hsl: "142 50% 58%",
  },
  {
    id: "blue-dark",
    label: "Azul oscuro",
    hint: "Azul más oscurito",
    textClass: "accent-blue-dark",
    swatchVar: "--accent-blue-dark",
    hsl: "215 65% 48%",
  },
];

export function isTeamRoleColorId(value: unknown): value is TeamRoleColorId {
  return typeof value === "string" && (TEAM_ROLE_COLOR_IDS as readonly string[]).includes(value);
}

export function getTeamRoleColorMeta(colorId?: string | null) {
  return (
    TEAM_ROLE_COLORS.find((item) => item.id === colorId) ??
    TEAM_ROLE_COLORS.find((item) => item.id === DEFAULT_TEAM_ROLE_COLOR)!
  );
}

export function getTeamRoleTextClass(colorId?: string | null): string {
  return getTeamRoleColorMeta(colorId).textClass;
}

export function getTeamRoleCssColor(colorId?: string | null): string {
  return `hsl(${getTeamRoleColorMeta(colorId).hsl})`;
}
