/**
 * Contenido editable de la landing pública /inedito.
 *
 * La landing es una lista de secciones; cada sección tiene un tipo (hero, tarjetas, FAQ…),
 * contenido (textos, imágenes, botones, elementos) y estilo (fondo, espaciado, tarjetas…).
 * `DEFAULT_LANDING_CONTENT` reproduce el diseño original, que se usa mientras no se guarde nada.
 *
 * Texto enriquecido (títulos y párrafos): **negritas**, *cursiva*, ==color de acento==.
 * Una línea en blanco separa párrafos.
 */

export const LANDING_ICONS = [
  "compass",
  "layers",
  "flame",
  "sparkles",
  "map",
  "calendar",
  "clock",
  "check",
  "rocket",
  "heart",
  "users",
  "lightbulb",
  "target",
  "star",
  "trophy",
  "book",
  "zap",
  "globe",
  "shield",
  "message",
] as const;
export type LandingIcon = (typeof LANDING_ICONS)[number];

export const LANDING_SECTION_TYPES = [
  "hero",
  "stats",
  "text",
  "gallery",
  "cards",
  "split",
  "steps",
  "faq",
  "cta",
] as const;
export type LandingSectionType = (typeof LANDING_SECTION_TYPES)[number];

export type LandingBackground = "storm" | "deep" | "navy" | "glow" | "color" | "gradient" | "image";
export type LandingSpacing = "none" | "sm" | "md" | "lg" | "xl";
export type LandingWidth = "narrow" | "normal" | "wide";
export type LandingAlign = "left" | "center";
export type LandingSurface = "glass" | "solid" | "outline" | "plain";
export type LandingShadow = "none" | "soft" | "strong" | "glow";
export type LandingRadius = "sm" | "md" | "lg" | "xl";
export type LandingAnimation = "none" | "fade" | "slide" | "scale";
export type LandingTextSize = "sm" | "md" | "lg";
export type LandingButtonVariant = "primary" | "outline" | "ghost" | "white";

export interface LandingButton {
  id: string;
  label: string;
  href: string;
  variant: LandingButtonVariant;
  /** Botón deshabilitado con la etiqueta “Muy pronto”. */
  soon: boolean;
  arrow: boolean;
  newTab: boolean;
}

/** Elemento genérico de una sección (tarjeta, paso, pregunta, dato, foto…). */
export interface LandingItem {
  id: string;
  title: string;
  body: string;
  icon: LandingIcon | "";
  image: string;
  /** Etiqueta corta (pie de foto, número, chip). */
  tag: string;
}

export interface LandingSectionStyle {
  background: LandingBackground;
  bgColor: string;
  bgColor2: string;
  bgImage: string;
  /** Oscurecimiento sobre la imagen de fondo (0–100). */
  overlay: number;
  spacing: LandingSpacing;
  width: LandingWidth;
  align: LandingAlign;
  textSize: LandingTextSize;
  columns: 1 | 2 | 3 | 4;
  surface: LandingSurface;
  shadow: LandingShadow;
  radius: LandingRadius;
  /** Color de acento propio; vacío = el del tema. */
  accent: string;
  animation: LandingAnimation;
  /** Líneas finas arriba y abajo de la sección. */
  divider: boolean;
}

export interface LandingSection {
  id: string;
  type: LandingSectionType;
  enabled: boolean;
  /** Ancla para enlaces (#experiencia). */
  anchor: string;
  /** Si tiene texto, aparece en el menú superior con ese nombre. */
  navLabel: string;
  /** Variante de acomodo (depende del tipo). */
  variant: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  images: string[];
  logo: string;
  note: string;
  buttons: LandingButton[];
  items: LandingItem[];
  style: LandingSectionStyle;
}

export const LANDING_FONTS = ["Syne", "Figtree", "Space Grotesk", "Poppins", "Montserrat", "Sora"] as const;
export type LandingFont = (typeof LANDING_FONTS)[number];

export interface LandingTheme {
  accent: string;
  accentSoft: string;
  background: string;
  displayFont: LandingFont;
  bodyFont: LandingFont;
}

export interface LandingNav {
  show: boolean;
  logo: string;
  ctaLabel: string;
  ctaHref: string;
  showHomeLink: boolean;
}

export interface LandingFooter {
  show: boolean;
  logo: string;
  text: string;
}

export interface LandingSeo {
  title: string;
  description: string;
  image: string;
}

export interface IneditoLandingContent {
  version: 1;
  theme: LandingTheme;
  nav: LandingNav;
  footer: LandingFooter;
  seo: LandingSeo;
  sections: LandingSection[];
}

/* ───────────── Catálogo para el editor ───────────── */

export const SECTION_TYPE_META: Record<
  LandingSectionType,
  { label: string; description: string; variants: { id: string; label: string }[] }
> = {
  hero: {
    label: "Portada",
    description: "Pantalla completa con logo, título, frase y botones sobre una imagen.",
    variants: [
      { id: "left", label: "Texto a la izquierda" },
      { id: "center", label: "Centrado" },
    ],
  },
  stats: {
    label: "Datos clave",
    description: "Franja con cifras cortas (7 Direcciones, 6 meses…).",
    variants: [{ id: "strip", label: "Franja" }, { id: "cards", label: "Tarjetas" }],
  },
  text: {
    label: "Texto",
    description: "Encabezado y párrafos. Ideal para explicar qué es el programa.",
    variants: [{ id: "plain", label: "Simple" }, { id: "card", label: "En tarjeta" }],
  },
  gallery: {
    label: "Galería",
    description: "Fotos con pie. En abanico o en cuadrícula.",
    variants: [
      { id: "fan", label: "Abanico" },
      { id: "grid", label: "Cuadrícula" },
    ],
  },
  cards: {
    label: "Tarjetas",
    description: "Lista de tarjetas con icono o número (experiencias, beneficios…).",
    variants: [
      { id: "numbered", label: "Numeradas" },
      { id: "check", label: "Con palomita" },
      { id: "icon", label: "Icono arriba" },
      { id: "image", label: "Con imagen" },
    ],
  },
  split: {
    label: "Imagen + texto",
    description: "Dos columnas: fotos de un lado y texto del otro.",
    variants: [
      { id: "images-left", label: "Imágenes a la izquierda" },
      { id: "images-right", label: "Imágenes a la derecha" },
    ],
  },
  steps: {
    label: "Pasos",
    description: "Proceso en pasos numerados unidos por una línea.",
    variants: [
      { id: "timeline", label: "Línea horizontal" },
      { id: "vertical", label: "Lista vertical" },
    ],
  },
  faq: {
    label: "Preguntas frecuentes",
    description: "Preguntas que se abren al hacer clic.",
    variants: [{ id: "accordion", label: "Acordeón" }],
  },
  cta: {
    label: "Llamado a la acción",
    description: "Cierre con logo, mensaje y botón sobre una imagen.",
    variants: [{ id: "centered", label: "Centrado" }],
  },
};

export const LANDING_ICON_LABEL: Record<LandingIcon, string> = {
  compass: "Brújula",
  layers: "Capas",
  flame: "Flama",
  sparkles: "Destellos",
  map: "Mapa",
  calendar: "Calendario",
  clock: "Reloj",
  check: "Palomita",
  rocket: "Cohete",
  heart: "Corazón",
  users: "Personas",
  lightbulb: "Idea",
  target: "Objetivo",
  star: "Estrella",
  trophy: "Trofeo",
  book: "Libro",
  zap: "Rayo",
  globe: "Mundo",
  shield: "Escudo",
  message: "Mensaje",
};

/* ───────────── Valores por defecto (= landing original) ───────────── */

const HERO_IMG = "/media/inedito/hero-oficial.jpg";
const IMG_VR = "/media/inedito/experiencia-vr.jpg";
const IMG_LAB = "/media/inedito/data-lab.jpg";
export const LOGO_INEDITO = "/media/inedito/logo-inedito.png";
export const LOGO_WCA_INEDITO = "/media/inedito/logo-wca-inedito.png";

export const DEFAULT_SECTION_STYLE: LandingSectionStyle = {
  background: "deep",
  bgColor: "#061228",
  bgColor2: "#0b1c3d",
  bgImage: "",
  overlay: 80,
  spacing: "lg",
  width: "wide",
  align: "center",
  textSize: "md",
  columns: 3,
  surface: "glass",
  shadow: "none",
  radius: "lg",
  accent: "",
  animation: "slide",
  divider: false,
};

let idCounter = 0;
export function landingId(prefix = "id"): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function btn(partial: Partial<LandingButton> & { id: string; label: string }): LandingButton {
  return { href: "", variant: "primary", soon: false, arrow: false, newTab: false, ...partial };
}

function item(partial: Partial<LandingItem> & { id: string }): LandingItem {
  return { title: "", body: "", icon: "", image: "", tag: "", ...partial };
}

function section(
  partial: Partial<Omit<LandingSection, "style">> & {
    id: string;
    type: LandingSectionType;
    style?: Partial<LandingSectionStyle>;
  },
): LandingSection {
  return {
    enabled: true,
    anchor: "",
    navLabel: "",
    variant: SECTION_TYPE_META[partial.type].variants[0]!.id,
    eyebrow: "",
    title: "",
    subtitle: "",
    body: "",
    image: "",
    images: [],
    logo: "",
    note: "",
    buttons: [],
    items: [],
    ...partial,
    style: { ...DEFAULT_SECTION_STYLE, ...(partial.style ?? {}) },
  };
}

export const DEFAULT_LANDING_CONTENT: IneditoLandingContent = {
  version: 1,
  theme: {
    accent: "#0056FF",
    accentSoft: "#4d8cff",
    background: "#020617",
    displayFont: "Syne",
    bodyFont: "Figtree",
  },
  nav: {
    show: true,
    logo: LOGO_INEDITO,
    ctaLabel: "Aplicar",
    ctaHref: "#aplicar",
    showHomeLink: true,
  },
  footer: {
    show: true,
    logo: LOGO_WCA_INEDITO,
    text: "Programa de Formación, Creación, Liderazgo e Impacto TecnoHumano. Edición Origen · Enero–Junio 2027.",
  },
  seo: {
    title: "INÉDITO · Programa TecnoHumano | Ecosistema WCA",
    description:
      "WCA | INÉDITO — Programa de Formación, Creación, Liderazgo e Impacto TecnoHumano. Edición Origen · Enero–Junio 2027.",
    image: HERO_IMG,
  },
  sections: [
    section({
      id: "hero",
      type: "hero",
      anchor: "inicio",
      variant: "left",
      eyebrow: "Edición Origen · Enero–Junio 2027",
      logo: LOGO_INEDITO,
      title: "Formación, creación, liderazgo e impacto ==TecnoHumano==",
      subtitle: "¿Y si los próximos seis meses cambiaran quién eres?",
      image: HERO_IMG,
      buttons: [
        btn({ id: "hero-apply", label: "Comenzar mi aplicación", variant: "primary", soon: true }),
        btn({ id: "hero-more", label: "Conocer las misiones", href: "#experiencia", variant: "outline", arrow: true }),
      ],
      style: { background: "image", bgImage: HERO_IMG, overlay: 82, align: "left", animation: "slide" },
    }),
    section({
      id: "stats",
      type: "stats",
      variant: "strip",
      note: "WCA · INÉDITO",
      items: [
        item({ id: "stat-1", icon: "map", title: "7", body: "Direcciones" }),
        item({ id: "stat-2", icon: "calendar", title: "6", body: "meses" }),
        item({ id: "stat-3", icon: "clock", title: "6–8 h", body: "/ semana" }),
      ],
      style: { background: "navy", spacing: "sm", divider: true, animation: "none" },
    }),
    section({
      id: "que-es",
      type: "text",
      variant: "plain",
      eyebrow: "Esto no es una vacante",
      title: "No vienes a ocupar un puesto",
      body:
        "**INÉDITO** es la experiencia de formación, creación, liderazgo e impacto del Ecosistema WCA. Durante seis meses te integras a una misión real, aprendes con un equipo interdisciplinario, recibes mentoría y conviertes tus decisiones en un **Producto Vivo**.\n\nNo buscamos manos extra. Buscamos personas con potencial para transformar y dejar una parte de WCA mejor que antes — con curiosidad, iniciativa, humanidad, creación y compromiso.",
      style: { background: "storm", width: "narrow" },
    }),
    section({
      id: "galeria",
      type: "gallery",
      variant: "fan",
      title: "Detrás de la experiencia",
      subtitle:
        "Formación en vivo, tecnología inmersiva y evidencia medible. Tres escenas de lo que se siente construir algo que antes no existía.",
      items: [
        item({ id: "g-1", image: HERO_IMG, tag: "Colaboración", body: "Equipo WCA colaborando en pizarra y laboratorio" }),
        item({ id: "g-2", image: IMG_VR, tag: "Inmersión", body: "Experiencia inmersiva con realidad mixta" }),
        item({ id: "g-3", image: IMG_LAB, tag: "Evidencia", body: "Laboratorio de datos y medición en vivo" }),
      ],
      style: { background: "deep", spacing: "sm", width: "normal" },
    }),
    section({
      id: "experiencia",
      type: "cards",
      anchor: "experiencia",
      navLabel: "Experiencia",
      variant: "numbered",
      title: "Lo que vivirás",
      subtitle: "Cuatro movimientos. Una trayectoria de descubrimiento a trascendencia.",
      items: [
        item({ id: "m-1", tag: "01", icon: "compass", title: "Descubre", body: "Autoconocimiento, propósito, WCA, TecnoHumanismo y tu primera misión." }),
        item({ id: "m-2", tag: "02", icon: "layers", title: "Crea", body: "Laboratorios, prototipos, herramientas, usuarios reales y feedback." }),
        item({ id: "m-3", tag: "03", icon: "flame", title: "Transforma", body: "Proyecto real, liderazgo, colaboración y un resultado observable." }),
        item({ id: "m-4", tag: "04", icon: "sparkles", title: "Trasciende", body: "Producto Vivo, Bitácora, OBRA VIVA, Constancia y comunidad posterior." }),
      ],
      style: { background: "glow", columns: 2, radius: "xl" },
    }),
    section({
      id: "beneficios",
      type: "cards",
      anchor: "beneficios",
      navLabel: "Beneficios",
      variant: "check",
      title: "Beneficios defendibles",
      subtitle: "Lo que sí puedes esperar — sin promesas vacías.",
      items: [
        item({ id: "b-1", title: "Proyectos reales", body: "Participas en misiones vivas del Ecosistema WCA, no en simulaciones." }),
        item({ id: "b-2", title: "Formación 6D", body: "Play & Impact Learning aplicada directamente a tu misión." }),
        item({ id: "b-3", title: "Mentoría de Dirección", body: "Acompañamiento de líderes, pares y usuarios en el camino." }),
        item({ id: "b-4", title: "Experiencias interdisciplinarias", body: "Eventos, retos de innovación y trabajo con otras áreas." }),
        item({ id: "b-5", title: "Evidencia de trayectoria", body: "Bitácora, Pasaporte, Producto Vivo, insignias y Constancia final." }),
        item({ id: "b-6", title: "Red de INÉDITO", body: "Comunidad y oportunidades posteriores según criterios y disponibilidad." }),
      ],
      style: { background: "navy", columns: 3, surface: "plain" },
    }),
    section({
      id: "quien",
      type: "split",
      anchor: "quien",
      navLabel: "A quién",
      variant: "images-left",
      eyebrow: "A quién buscamos",
      title: "No buscamos perfección",
      body:
        "Buscamos curiosidad, iniciativa, humanidad, creación, compromiso y potencial de aprendizaje.\n\nNo necesitas experiencia previa ni un portafolio impecable. Sí necesitas una historia concreta de algo que hayas intentado, ganas de aprender con otros y una carga semanal que puedas sostener.",
      images: [IMG_VR, IMG_LAB],
      style: { background: "storm", align: "left", shadow: "strong" },
    }),
    section({
      id: "proceso",
      type: "steps",
      anchor: "proceso",
      navLabel: "Proceso",
      variant: "timeline",
      title: "El proceso",
      subtitle: "Tres fases para conocerte y construir contigo.",
      items: [
        item({ id: "p-1", title: "Aplicación", body: "Envías tu aplicación para una evaluación inicial de potencial e iniciativa." }),
        item({ id: "p-2", title: "Reto", body: "Participas en un reto de liderazgo e impacto que revela cómo piensas y creas." }),
        item({ id: "p-3", title: "Selección", body: "Cierras el proceso con las pruebas finales y, si hay match, entras a la experiencia." }),
      ],
      style: { background: "navy", width: "normal", animation: "scale" },
    }),
    section({
      id: "faq",
      type: "faq",
      anchor: "faq",
      navLabel: "FAQ",
      variant: "accordion",
      title: "Preguntas frecuentes",
      items: [
        item({ id: "f-1", title: "¿Necesito experiencia previa?", body: "No. Ayuda, pero el proceso evalúa potencial, iniciativa, humanidad, creación y compromiso." }),
        item({ id: "f-2", title: "¿Cuánto tiempo requiere?", body: "Carga estimada de 6–8 horas por semana durante 6 meses (Enero–Junio 2027)." }),
        item({ id: "f-3", title: "¿Puedo hacerlo como Servicio Social?", body: "Solo cuando exista proyecto, cupo y validación institucional. No se promete automáticamente." }),
        item({ id: "f-4", title: "¿Qué voy a construir?", body: "Una contribución real dentro de una misión que evoluciona hacia un Producto Vivo con evidencia y transferencia." }),
        item({ id: "f-5", title: "¿Qué recibo?", body: "Formación, acompañamiento, experiencia real, evidencias de trayectoria, comunidad y Constancia al cumplir los criterios del programa." }),
      ],
      style: { background: "storm", width: "narrow" },
    }),
    section({
      id: "aplicar",
      type: "cta",
      anchor: "aplicar",
      variant: "centered",
      logo: LOGO_WCA_INEDITO,
      title: "Tu primer paso puede empezar aquí",
      body:
        "Antes de aplicar, revisa fechas, dedicación, misiones y FAQ. Si la experiencia hace sentido para ti, queremos conocer lo que ves, lo que has intentado y lo que podrías traer a WCA que todavía no existe.",
      note: "*Pulso: la señal de que algo inédito está por comenzar.",
      buttons: [btn({ id: "cta-apply", label: "Quiero formar parte de INÉDITO", variant: "primary", soon: true })],
      style: { background: "image", bgImage: IMG_VR, overlay: 88, width: "narrow", animation: "scale" },
    }),
  ],
};

/* ───────────── Secciones nuevas desde el editor ───────────── */

export function createLandingSection(type: LandingSectionType): LandingSection {
  const id = landingId(type);
  const base = { id, type };
  switch (type) {
    case "hero":
      return section({
        ...base,
        eyebrow: "Nueva edición",
        title: "Un título que ==inspire==",
        subtitle: "Una frase corta que invite a seguir leyendo.",
        image: HERO_IMG,
        buttons: [btn({ id: landingId("btn"), label: "Quiero saber más", href: "#", variant: "primary", arrow: true })],
        style: { background: "image", bgImage: HERO_IMG, overlay: 82, align: "left" },
      });
    case "stats":
      return section({
        ...base,
        items: [
          item({ id: landingId("it"), icon: "users", title: "100+", body: "participantes" }),
          item({ id: landingId("it"), icon: "calendar", title: "6", body: "meses" }),
          item({ id: landingId("it"), icon: "star", title: "4.9", body: "valoración" }),
        ],
        style: { background: "navy", spacing: "sm", divider: true, animation: "none" },
      });
    case "text":
      return section({
        ...base,
        eyebrow: "Encabezado pequeño",
        title: "Título de la sección",
        body: "Escribe aquí el texto. Puedes usar **negritas**, *cursiva* o ==color de acento==.\n\nDeja una línea en blanco para empezar otro párrafo.",
        style: { background: "deep", width: "narrow" },
      });
    case "gallery":
      return section({
        ...base,
        title: "Galería",
        subtitle: "Momentos de la experiencia.",
        variant: "grid",
        items: [
          item({ id: landingId("it"), image: HERO_IMG, tag: "Foto 1", body: "Descripción de la foto" }),
          item({ id: landingId("it"), image: IMG_VR, tag: "Foto 2", body: "Descripción de la foto" }),
          item({ id: landingId("it"), image: IMG_LAB, tag: "Foto 3", body: "Descripción de la foto" }),
        ],
        style: { background: "deep", width: "wide" },
      });
    case "cards":
      return section({
        ...base,
        title: "Título de las tarjetas",
        subtitle: "Una línea que explique el grupo.",
        variant: "icon",
        items: [
          item({ id: landingId("it"), icon: "rocket", title: "Primera idea", body: "Describe esta tarjeta en una o dos líneas." }),
          item({ id: landingId("it"), icon: "lightbulb", title: "Segunda idea", body: "Describe esta tarjeta en una o dos líneas." }),
          item({ id: landingId("it"), icon: "heart", title: "Tercera idea", body: "Describe esta tarjeta en una o dos líneas." }),
        ],
        style: { background: "navy", columns: 3 },
      });
    case "split":
      return section({
        ...base,
        eyebrow: "Encabezado pequeño",
        title: "Título junto a las imágenes",
        body: "Cuenta una historia o explica algo importante junto a un par de fotos.",
        images: [IMG_VR, IMG_LAB],
        buttons: [],
        style: { background: "deep", align: "left", shadow: "strong" },
      });
    case "steps":
      return section({
        ...base,
        title: "Cómo funciona",
        subtitle: "Pasos sencillos.",
        items: [
          item({ id: landingId("it"), title: "Paso uno", body: "Qué pasa en este paso." }),
          item({ id: landingId("it"), title: "Paso dos", body: "Qué pasa en este paso." }),
          item({ id: landingId("it"), title: "Paso tres", body: "Qué pasa en este paso." }),
        ],
        style: { background: "navy", width: "normal", animation: "scale" },
      });
    case "faq":
      return section({
        ...base,
        title: "Preguntas frecuentes",
        items: [
          item({ id: landingId("it"), title: "¿Primera pregunta?", body: "Respuesta clara y breve." }),
          item({ id: landingId("it"), title: "¿Segunda pregunta?", body: "Respuesta clara y breve." }),
        ],
        style: { background: "storm", width: "narrow" },
      });
    case "cta":
      return section({
        ...base,
        title: "¿Listo para empezar?",
        body: "Un último mensaje que invite a dar el siguiente paso.",
        buttons: [btn({ id: landingId("btn"), label: "Quiero participar", href: "#", variant: "primary", arrow: true })],
        style: { background: "image", bgImage: IMG_VR, overlay: 88, width: "narrow", animation: "scale" },
      });
  }
}

export function createLandingItem(): LandingItem {
  return item({ id: landingId("it"), title: "Nuevo elemento", body: "Descripción breve." });
}

export function createLandingButton(): LandingButton {
  return btn({ id: landingId("btn"), label: "Nuevo botón", href: "#", variant: "outline" });
}

/* ───────────── Normalización / saneamiento ───────────── */

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

function str(value: unknown, fallback: string, max = 4000): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim() : fallback;
}

/** Enlaces permitidos: anclas, rutas internas, http(s), mailto y tel. Nada de `javascript:`. */
export function safeLandingHref(value: unknown): string {
  const href = typeof value === "string" ? value.trim().slice(0, 600) : "";
  if (!href) return "";
  if (/^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  return "";
}

/** Imágenes: rutas internas o https. */
export function safeLandingImage(value: unknown): string {
  const src = typeof value === "string" ? value.trim().slice(0, 600) : "";
  if (!src) return "";
  if (/^(\/(?!\/)|https?:\/\/)/i.test(src)) return src;
  return "";
}

function slug(value: unknown): string {
  return str(value, "", 60)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStyle(raw: unknown, fallback: LandingSectionStyle): LandingSectionStyle {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const columns = Number(s.columns);
  const overlay = Number(s.overlay);
  return {
    background: oneOf(s.background, ["storm", "deep", "navy", "glow", "color", "gradient", "image"] as const, fallback.background),
    bgColor: color(s.bgColor, fallback.bgColor),
    bgColor2: color(s.bgColor2, fallback.bgColor2),
    bgImage: s.bgImage === undefined ? fallback.bgImage : safeLandingImage(s.bgImage),
    overlay: Number.isFinite(overlay) ? Math.min(100, Math.max(0, Math.round(overlay))) : fallback.overlay,
    spacing: oneOf(s.spacing, ["none", "sm", "md", "lg", "xl"] as const, fallback.spacing),
    width: oneOf(s.width, ["narrow", "normal", "wide"] as const, fallback.width),
    align: oneOf(s.align, ["left", "center"] as const, fallback.align),
    textSize: oneOf(s.textSize, ["sm", "md", "lg"] as const, fallback.textSize),
    columns: ([1, 2, 3, 4] as const).includes(columns as 1) ? (columns as 1 | 2 | 3 | 4) : fallback.columns,
    surface: oneOf(s.surface, ["glass", "solid", "outline", "plain"] as const, fallback.surface),
    shadow: oneOf(s.shadow, ["none", "soft", "strong", "glow"] as const, fallback.shadow),
    radius: oneOf(s.radius, ["sm", "md", "lg", "xl"] as const, fallback.radius),
    accent: typeof s.accent === "string" && HEX.test(s.accent.trim()) ? s.accent.trim() : "",
    animation: oneOf(s.animation, ["none", "fade", "slide", "scale"] as const, fallback.animation),
    divider: typeof s.divider === "boolean" ? s.divider : fallback.divider,
  };
}

function normalizeButton(raw: unknown, index: number): LandingButton {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: str(b.id, "", 80) || `btn-${index}`,
    label: str(b.label, "Botón", 80),
    href: safeLandingHref(b.href),
    variant: oneOf(b.variant, ["primary", "outline", "ghost", "white"] as const, "primary"),
    soon: b.soon === true,
    arrow: b.arrow === true,
    newTab: b.newTab === true,
  };
}

function normalizeItem(raw: unknown, index: number): LandingItem {
  const it = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: str(it.id, "", 80) || `it-${index}`,
    title: str(it.title, "", 300),
    body: str(it.body, "", 2000),
    icon: oneOf(it.icon, ["", ...LANDING_ICONS] as const, ""),
    image: safeLandingImage(it.image),
    tag: str(it.tag, "", 60),
  };
}

function normalizeSection(raw: unknown, index: number): LandingSection | null {
  const s = (raw && typeof raw === "object" ? raw : null) as Record<string, unknown> | null;
  if (!s) return null;
  const type = oneOf(s.type, LANDING_SECTION_TYPES, "text");
  if (s.type !== type) return null;
  const template = createLandingSection(type);
  const variants = SECTION_TYPE_META[type].variants.map((v) => v.id);
  const uniq = <T extends { id: string }>(list: T[]) => {
    const seen = new Set<string>();
    return list.map((x, i) => {
      const id = seen.has(x.id) ? `${x.id}-${i}` : x.id;
      seen.add(id);
      return { ...x, id };
    });
  };
  return {
    id: str(s.id, "", 80) || `${type}-${index}`,
    type,
    enabled: s.enabled !== false,
    anchor: slug(s.anchor),
    navLabel: str(s.navLabel, "", 40),
    variant: oneOf(s.variant, variants, variants[0]!),
    eyebrow: str(s.eyebrow, "", 200),
    title: str(s.title, "", 300),
    subtitle: str(s.subtitle, "", 600),
    body: str(s.body, "", 6000),
    image: safeLandingImage(s.image),
    images: Array.isArray(s.images) ? s.images.map(safeLandingImage).filter(Boolean).slice(0, 6) : [],
    logo: safeLandingImage(s.logo),
    note: str(s.note, "", 300),
    buttons: uniq(Array.isArray(s.buttons) ? s.buttons.slice(0, 4).map(normalizeButton) : []),
    items: uniq(Array.isArray(s.items) ? s.items.slice(0, 24).map(normalizeItem) : []),
    style: normalizeStyle(s.style, template.style),
  };
}

/** Convierte cualquier JSON guardado en un contenido válido (rellenando lo que falte). */
export function normalizeLandingContent(raw: unknown): IneditoLandingContent {
  if (!raw || typeof raw !== "object") return structuredCloneSafe(DEFAULT_LANDING_CONTENT);
  const c = raw as Record<string, unknown>;
  const d = DEFAULT_LANDING_CONTENT;
  const theme = (c.theme && typeof c.theme === "object" ? c.theme : {}) as Record<string, unknown>;
  const nav = (c.nav && typeof c.nav === "object" ? c.nav : {}) as Record<string, unknown>;
  const footer = (c.footer && typeof c.footer === "object" ? c.footer : {}) as Record<string, unknown>;
  const seo = (c.seo && typeof c.seo === "object" ? c.seo : {}) as Record<string, unknown>;

  const seen = new Set<string>();
  const sections = (Array.isArray(c.sections) ? c.sections : [])
    .slice(0, 40)
    .map(normalizeSection)
    .filter((x): x is LandingSection => !!x)
    .map((x, i) => {
      const id = seen.has(x.id) ? `${x.id}-${i}` : x.id;
      seen.add(id);
      return { ...x, id };
    });

  return {
    version: 1,
    theme: {
      accent: color(theme.accent, d.theme.accent),
      accentSoft: color(theme.accentSoft, d.theme.accentSoft),
      background: color(theme.background, d.theme.background),
      displayFont: oneOf(theme.displayFont, LANDING_FONTS, d.theme.displayFont),
      bodyFont: oneOf(theme.bodyFont, LANDING_FONTS, d.theme.bodyFont),
    },
    nav: {
      show: nav.show !== false,
      logo: nav.logo === undefined ? d.nav.logo : safeLandingImage(nav.logo),
      ctaLabel: str(nav.ctaLabel, d.nav.ctaLabel, 40),
      ctaHref: nav.ctaHref === undefined ? d.nav.ctaHref : safeLandingHref(nav.ctaHref),
      showHomeLink: nav.showHomeLink !== false,
    },
    footer: {
      show: footer.show !== false,
      logo: footer.logo === undefined ? d.footer.logo : safeLandingImage(footer.logo),
      text: str(footer.text, d.footer.text, 600),
    },
    seo: {
      title: str(seo.title, d.seo.title, 120) || d.seo.title,
      description: str(seo.description, d.seo.description, 300),
      image: seo.image === undefined ? d.seo.image : safeLandingImage(seo.image),
    },
    sections,
  };
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneLandingContent(content: IneditoLandingContent): IneditoLandingContent {
  return structuredCloneSafe(content);
}

/** Duplica una sección con ids nuevos (sección, botones y elementos). */
export function duplicateLandingSection(source: LandingSection): LandingSection {
  const copy = structuredCloneSafe(source);
  return {
    ...copy,
    id: landingId(source.type),
    anchor: copy.anchor ? `${copy.anchor}-copia` : "",
    navLabel: "",
    buttons: copy.buttons.map((b) => ({ ...b, id: landingId("btn") })),
    items: copy.items.map((it) => ({ ...it, id: landingId("it") })),
  };
}
