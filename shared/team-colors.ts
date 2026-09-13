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
  /** Clase de texto (accent-*) */
  textClass: string;
  /** Token CSS para swatch (hsl var) */
  swatchVar: string;
}[] = [
  {
    id: "blue-strong",
    label: "Azul fuerte",
    hint: "Como el de LinkedIn",
    textClass: "accent-blue-strong",
    swatchVar: "--accent-blue-strong",
  },
  {
    id: "purple",
    label: "Morado",
    hint: "Púrpura WCA",
    textClass: "accent-purple",
    swatchVar: "--accent-purple",
  },
  {
    id: "red",
    label: "Rojo fuerte",
    hint: "Rojo intenso",
    textClass: "accent-red",
    swatchVar: "--accent-red",
  },
  {
    id: "blue",
    label: "Azul WCA",
    hint: "Clásico más bajito",
    textClass: "accent-blue",
    swatchVar: "--accent-blue",
  },
  {
    id: "yellow",
    label: "Amarillo",
    hint: "Amarillo WCA",
    textClass: "accent-yellow",
    swatchVar: "--accent-yellow",
  },
  {
    id: "red-soft",
    label: "Rojo suave",
    hint: "Rojo más bajito",
    textClass: "accent-red-soft",
    swatchVar: "--accent-red-soft",
  },
  {
    id: "green",
    label: "Verde fuerte",
    hint: "Verde intenso",
    textClass: "accent-green",
    swatchVar: "--accent-green",
  },
  {
    id: "green-soft",
    label: "Verde suave",
    hint: "Verde más bajito",
    textClass: "accent-green-soft",
    swatchVar: "--accent-green-soft",
  },
  {
    id: "blue-dark",
    label: "Azul oscuro",
    hint: "Azul más oscurito",
    textClass: "accent-blue-dark",
    swatchVar: "--accent-blue-dark",
  },
];

export function isTeamRoleColorId(value: unknown): value is TeamRoleColorId {
  return typeof value === "string" && (TEAM_ROLE_COLOR_IDS as readonly string[]).includes(value);
}

export function getTeamRoleTextClass(colorId?: string | null): string {
  const found = TEAM_ROLE_COLORS.find((item) => item.id === colorId);
  return found?.textClass ?? "accent-blue";
}
