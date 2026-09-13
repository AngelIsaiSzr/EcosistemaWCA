export const CARD_DIRECTION_IDS = [
  "direccion-sede",
  "operaciones-logistica",
  "academia-innovacion",
  "comunicacion-experiencia",
  "talento-bienestar",
  "desarrollo-tecnologico",
  "estrategia-finanzas",
  "investigacion-informacion",
] as const;

export type CardDirectionId = (typeof CARD_DIRECTION_IDS)[number];

export const CARD_DIRECTIONS: {
  id: CardDirectionId;
  label: string;
  /** HSL sin envolver */
  hsl: string;
  swatchVar: string;
  hint?: string;
}[] = [
  {
    id: "direccion-sede",
    label: "Dirección de Sede",
    hsl: "215 78% 58%",
    swatchVar: "--accent-blue-strong",
    hint: "Director (azul fuerte) / Subdirección (morado)",
  },
  {
    id: "operaciones-logistica",
    label: "Dirección de Operaciones y Logística",
    hsl: "355 100% 62%",
    swatchVar: "--accent-red",
  },
  {
    id: "academia-innovacion",
    label: "Dirección de Academia e Innovación Educativa",
    hsl: "215 49.4% 65.9%",
    swatchVar: "--accent-blue",
  },
  {
    id: "comunicacion-experiencia",
    label: "Dirección de Comunicación y Experiencia",
    hsl: "50 100% 50%",
    swatchVar: "--accent-yellow",
  },
  {
    id: "talento-bienestar",
    label: "Dirección de Talento y Bienestar",
    hsl: "142 50% 58%",
    swatchVar: "--accent-green-soft",
  },
  {
    id: "desarrollo-tecnologico",
    label: "Dirección de Desarrollo Tecnológico e Innovación",
    hsl: "215 65% 48%",
    swatchVar: "--accent-blue-dark",
  },
  {
    id: "estrategia-finanzas",
    label: "Dirección de Estrategia y Finanzas",
    hsl: "355 75% 72%",
    swatchVar: "--accent-red-soft",
  },
  {
    id: "investigacion-informacion",
    label: "Dirección de Investigación e Información",
    hsl: "142 70% 45%",
    swatchVar: "--accent-green",
  },
];

export const DEFAULT_CARD_DIRECTION: CardDirectionId = "direccion-sede";

export function isCardDirectionId(value: unknown): value is CardDirectionId {
  return typeof value === "string" && (CARD_DIRECTION_IDS as readonly string[]).includes(value);
}

export function getCardDirectionMeta(id?: string | null) {
  return (
    CARD_DIRECTIONS.find((d) => d.id === id) ??
    CARD_DIRECTIONS.find((d) => d.id === DEFAULT_CARD_DIRECTION)!
  );
}

export function getCardDirectionCssColor(id?: string | null): string {
  return `hsl(${getCardDirectionMeta(id).hsl})`;
}

/** Slugs que no pueden usarse para tarjetas públicas en la raíz. */
export const RESERVED_CARD_SLUGS = new Set([
  "admin",
  "auth",
  "programs",
  "about",
  "contact",
  "merch",
  "terms",
  "privacy",
  "cookies",
  "integracion",
  "f",
  "editor",
  "profile",
  "talento",
  "mi-tarjeta",
  "api",
  "assets",
  "src",
  "static",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "convocatoria",
]);

export function normalizeCardSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isReservedCardSlug(slug: string): boolean {
  return RESERVED_CARD_SLUGS.has(slug.toLowerCase());
}

export type PresentationCardLink = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  style?: "solid" | "outline" | "soft";
  order: number;
  enabled: boolean;
};

export type PresentationCardTheme = {
  accentColor?: string;
  /** Override sede: blue-strong | purple */
  sedeAccent?: "blue-strong" | "purple";
  backgroundStyle?: "solid" | "gradient" | "mesh";
  buttonStyle?: "rounded" | "pill" | "square";
  showBrand?: boolean;
  /** Cómo mostrar redes fijas por defecto */
  socialDisplayDefault?: "circle" | "button";
  /** Override por red: circle = iconos, button = estilo Linktree */
  socialDisplay?: Partial<
    Record<
      | "linkedIn"
      | "instagram"
      | "twitter"
      | "github"
      | "youtube"
      | "tiktok"
      | "whatsapp"
      | "email"
      | "website",
      "circle" | "button"
    >
  >;
};

export const DEFAULT_CARD_THEME: PresentationCardTheme = {
  backgroundStyle: "gradient",
  buttonStyle: "rounded",
  showBrand: true,
  socialDisplayDefault: "circle",
};

export const CARD_SOCIAL_KEYS = [
  "linkedIn",
  "instagram",
  "twitter",
  "github",
  "youtube",
  "tiktok",
  "whatsapp",
  "email",
  "website",
] as const;

export type CardSocialKey = (typeof CARD_SOCIAL_KEYS)[number];

export const CARD_FA_ICONS: { className: string; label: string }[] = [
  { className: "fas fa-link", label: "Enlace" },
  { className: "fas fa-globe", label: "Web" },
  { className: "fas fa-envelope", label: "Email" },
  { className: "fas fa-phone", label: "Teléfono" },
  { className: "fas fa-calendar", label: "Calendario" },
  { className: "fas fa-map-marker-alt", label: "Ubicación" },
  { className: "fas fa-book", label: "Libro" },
  { className: "fas fa-graduation-cap", label: "Educación" },
  { className: "fas fa-briefcase", label: "Trabajo" },
  { className: "fas fa-user", label: "Usuario" },
  { className: "fas fa-users", label: "Equipo" },
  { className: "fas fa-heart", label: "Corazón" },
  { className: "fas fa-star", label: "Estrella" },
  { className: "fas fa-bolt", label: "Rayo" },
  { className: "fas fa-rocket", label: "Cohete" },
  { className: "fas fa-lightbulb", label: "Idea" },
  { className: "fas fa-code", label: "Código" },
  { className: "fas fa-laptop-code", label: "Laptop" },
  { className: "fas fa-camera", label: "Cámara" },
  { className: "fas fa-video", label: "Video" },
  { className: "fas fa-music", label: "Música" },
  { className: "fas fa-podcast", label: "Podcast" },
  { className: "fas fa-newspaper", label: "Noticia" },
  { className: "fas fa-file-alt", label: "Documento" },
  { className: "fas fa-download", label: "Descarga" },
  { className: "fas fa-share-alt", label: "Compartir" },
  { className: "fas fa-comments", label: "Chat" },
  { className: "fas fa-hand-holding-heart", label: "Apoyo" },
  { className: "fas fa-handshake", label: "Alianza" },
  { className: "fas fa-trophy", label: "Trofeo" },
  { className: "fas fa-chart-line", label: "Crecimiento" },
  { className: "fas fa-store", label: "Tienda" },
  { className: "fas fa-shopping-bag", label: "Compras" },
  { className: "fas fa-ticket-alt", label: "Ticket" },
  { className: "fas fa-qrcode", label: "QR" },
  { className: "fab fa-linkedin-in", label: "LinkedIn" },
  { className: "fab fa-instagram", label: "Instagram" },
  { className: "fab fa-twitter", label: "Twitter" },
  { className: "fab fa-x-twitter", label: "X" },
  { className: "fab fa-github", label: "GitHub" },
  { className: "fab fa-youtube", label: "YouTube" },
  { className: "fab fa-tiktok", label: "TikTok" },
  { className: "fab fa-whatsapp", label: "WhatsApp" },
  { className: "fab fa-facebook-f", label: "Facebook" },
  { className: "fab fa-discord", label: "Discord" },
  { className: "fab fa-telegram", label: "Telegram" },
  { className: "fab fa-spotify", label: "Spotify" },
  { className: "fab fa-behance", label: "Behance" },
  { className: "fab fa-dribbble", label: "Dribbble" },
  { className: "fab fa-medium", label: "Medium" },
];

