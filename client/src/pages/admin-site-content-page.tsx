import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  ChevronDown,
  Italic,
  RemoveFormatting,
  ExternalLink,
  Flag,
  Footprints,
  Globe2,
  History,
  LayoutTemplate,
  Megaphone,
  Phone,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Network,
  type LucideIcon,
} from "lucide-react";
import {
  SITE_COLORS,
  SITE_CONTENT_DEFAULTS,
  SITE_CONTENT_SCHEMAS,
  resolveSiteContent,
  type SiteColor,
  type SiteContentKey,
} from "@shared/site-content";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  RichText,
  SITE_BG_CLASS,
  SITE_CONTENT_QUERY_KEY,
  stripRichText,
  useSiteContentData,
  type SiteContentResponse,
} from "@/lib/site-content";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AdminEditPanel,
  AdminEmptyState,
  AdminPanelBody,
  AdminPanelFooter,
  AdminPanelHeader,
  AdminPanelSection,
  AdminPanelTabs,
  AdminSearchInput,
  AdminTile,
  matchesSearch,
} from "@/components/admin/edit-panel";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Configuración de campos                                             */
/* ------------------------------------------------------------------ */

type Field =
  | { type: "text"; name: string; label: string; placeholder?: string; hint?: string }
  | { type: "textarea"; name: string; label: string; rows?: number; hint?: string }
  | { type: "rich"; name: string; label: string; rows?: number; hint?: string }
  | { type: "url"; name: string; label: string; icon?: string; placeholder?: string }
  | { type: "link"; name: string; label: string }
  | { type: "color"; name: string; label: string }
  | { type: "icon"; name: string; label: string }
  | { type: "paragraphs"; name: string; label: string; max: number }
  | {
      type: "list";
      name: string;
      label: string;
      itemName: string;
      max: number;
      fields: Field[];
      newItem: Record<string, unknown>;
      title: (item: Record<string, unknown>) => string;
    };

type SectionTab = { id: string; label: string; fields: Field[] };

type SectionConfig = {
  key: SiteContentKey;
  group: "Inicio" | "Acerca de" | "Contacto" | "Global";
  name: string;
  description: string;
  path: string;
  icon: LucideIcon;
  tabs: SectionTab[];
  preview: (data: Record<string, unknown>) => string;
  note?: string;
};

const RICH_HINT = "Selecciona una palabra y aplica negrita, cursiva o un color (Ctrl+B / Ctrl+I).";

const SECTIONS: SectionConfig[] = [
  {
    key: "hero",
    group: "Inicio",
    name: "Portada",
    description: "Título principal, texto de bienvenida, botones e indicadores.",
    path: "/",
    icon: LayoutTemplate,
    preview: (d) => stripRichText(String(d.title)),
    tabs: [
      {
        id: "textos",
        label: "Textos",
        fields: [
          { type: "rich", name: "title", label: "Título", rows: 2, hint: `${RICH_HINT} Enter = salto de línea.` },
          { type: "textarea", name: "subtitle", label: "Texto de bienvenida", rows: 4 },
        ],
      },
      {
        id: "botones",
        label: "Botones",
        fields: [
          { type: "link", name: "primaryButton", label: "Botón principal" },
          { type: "link", name: "secondaryButton", label: "Botón secundario" },
        ],
      },
      {
        id: "indicadores",
        label: "Indicadores",
        fields: [
          { type: "text", name: "studentsTitle", label: "Estudiantes · título" },
          { type: "text", name: "studentsSubtitle", label: "Estudiantes · detalle" },
          { type: "text", name: "ratingTitle", label: "Valoración · título" },
          { type: "text", name: "ratingSubtitle", label: "Valoración · detalle" },
          {
            type: "text",
            name: "codeMission",
            label: "Frase de la ventana de código",
            hint: "Aparece como la misión dentro del editor de código animado.",
          },
        ],
      },
    ],
  },
  {
    key: "features",
    group: "Inicio",
    name: "¿Por qué elegirnos?",
    description: "Encabezado y tarjetas de beneficios del Ecosistema WCA.",
    path: "/",
    icon: Sparkles,
    preview: (d) => String(d.title),
    tabs: [
      {
        id: "encabezado",
        label: "Encabezado",
        fields: [
          { type: "text", name: "title", label: "Título" },
          { type: "textarea", name: "subtitle", label: "Subtítulo", rows: 3 },
        ],
      },
      {
        id: "tarjetas",
        label: "Tarjetas",
        fields: [
          {
            type: "list",
            name: "items",
            label: "Tarjetas",
            itemName: "tarjeta",
            max: 12,
            title: (item) => String(item.title || "Sin título"),
            newItem: { icon: "fas fa-star", title: "Nueva tarjeta", description: "", color: "blue" },
            fields: [
              { type: "icon", name: "icon", label: "Ícono" },
              { type: "color", name: "color", label: "Color" },
              { type: "text", name: "title", label: "Título" },
              { type: "textarea", name: "description", label: "Descripción", rows: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "mission",
    group: "Inicio",
    name: "Nuestra misión",
    description: "Misión, compromiso y Objetivos de Desarrollo Sostenible.",
    path: "/#acerca",
    icon: Target,
    note: "Los ODS también se muestran en la página Acerca de.",
    preview: (d) => stripRichText(String(d.text)),
    tabs: [
      {
        id: "mision",
        label: "Misión",
        fields: [
          { type: "text", name: "title", label: "Título" },
          { type: "rich", name: "text", label: "Texto de la misión", rows: 5, hint: RICH_HINT },
          { type: "text", name: "commitmentTitle", label: "Título del compromiso" },
          { type: "rich", name: "commitmentText", label: "Texto del compromiso", rows: 4, hint: RICH_HINT },
          { type: "text", name: "linkLabel", label: "Texto del enlace a «Acerca de»" },
        ],
      },
      {
        id: "ods",
        label: "ODS",
        fields: [
          { type: "text", name: "sdgTitle", label: "Título de la lista" },
          {
            type: "list",
            name: "sdgs",
            label: "Objetivos",
            itemName: "objetivo",
            max: 17,
            title: (item) => `ODS ${item.number || "?"} · ${item.label || "Sin nombre"}`,
            newItem: { number: "", label: "", color: "blue" },
            fields: [
              { type: "text", name: "number", label: "Número", placeholder: "Ej: 4" },
              { type: "color", name: "color", label: "Color" },
              { type: "text", name: "label", label: "Nombre" },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "cta",
    group: "Inicio",
    name: "Llamado a la acción",
    description: "El bloque final que invita a unirse, con sus dos botones.",
    path: "/",
    icon: Megaphone,
    preview: (d) => stripRichText(String(d.title)),
    tabs: [
      {
        id: "textos",
        label: "Textos",
        fields: [
          { type: "rich", name: "title", label: "Título", rows: 2, hint: RICH_HINT },
          { type: "textarea", name: "text", label: "Texto", rows: 3 },
          { type: "link", name: "primaryButton", label: "Botón principal" },
          { type: "link", name: "secondaryButton", label: "Botón secundario" },
        ],
      },
    ],
  },
  {
    key: "aboutIntro",
    group: "Acerca de",
    name: "Portada y misión",
    description: "Encabezado de la página, misión y metodología Play&Impact.",
    path: "/about",
    icon: Flag,
    preview: (d) => String(d.heroSubtitle),
    tabs: [
      {
        id: "portada",
        label: "Portada",
        fields: [
          { type: "text", name: "heroTitle", label: "Título" },
          { type: "textarea", name: "heroSubtitle", label: "Subtítulo", rows: 3 },
        ],
      },
      {
        id: "mision",
        label: "Misión",
        fields: [
          { type: "text", name: "missionTitle", label: "Título de la misión" },
          { type: "rich", name: "missionText", label: "Texto de la misión", rows: 6, hint: RICH_HINT },
          { type: "text", name: "methodologyTitle", label: "Título de la metodología" },
          { type: "rich", name: "methodologyText", label: "Texto de la metodología", rows: 6, hint: RICH_HINT },
          {
            type: "text",
            name: "sdgIntro",
            label: "Frase antes de los ODS",
            hint: "Los ODS se editan en Inicio › Nuestra misión.",
          },
        ],
      },
    ],
  },
  {
    key: "aboutHistory",
    group: "Acerca de",
    name: "Historia y valores",
    description: "La historia de la academia y sus valores.",
    path: "/about",
    icon: History,
    preview: (d) => stripRichText(String((d.paragraphs as string[])?.[0] ?? "")),
    tabs: [
      {
        id: "historia",
        label: "Historia",
        fields: [
          { type: "text", name: "title", label: "Título" },
          { type: "paragraphs", name: "paragraphs", label: "Párrafos", max: 6 },
        ],
      },
      {
        id: "valores",
        label: "Valores",
        fields: [
          { type: "text", name: "valuesTitle", label: "Título de valores" },
          {
            type: "list",
            name: "values",
            label: "Valores",
            itemName: "valor",
            max: 8,
            title: (item) => String(item.title || "Sin título"),
            newItem: { icon: "fas fa-star", title: "Nuevo valor", description: "", color: "blue" },
            fields: [
              { type: "icon", name: "icon", label: "Ícono" },
              { type: "color", name: "color", label: "Color" },
              { type: "text", name: "title", label: "Nombre" },
              { type: "textarea", name: "description", label: "Descripción", rows: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "aboutDivisions",
    group: "Acerca de",
    name: "Divisiones",
    description: "Los pilares del Ecosistema WCA y la frase final.",
    path: "/about",
    icon: Network,
    preview: (d) => String(d.subtitle),
    tabs: [
      {
        id: "encabezado",
        label: "Encabezado",
        fields: [
          { type: "text", name: "title", label: "Título" },
          { type: "textarea", name: "subtitle", label: "Subtítulo", rows: 3 },
          { type: "text", name: "quote", label: "Frase final" },
        ],
      },
      {
        id: "divisiones",
        label: "Divisiones",
        fields: [
          {
            type: "list",
            name: "items",
            label: "Divisiones",
            itemName: "división",
            max: 8,
            title: (item) => String(item.name || "Sin nombre"),
            newItem: { icon: "fas fa-rocket", name: "WCA | Nueva", tagline: "", description: "", color: "blue" },
            fields: [
              { type: "icon", name: "icon", label: "Ícono" },
              { type: "color", name: "color", label: "Color" },
              { type: "text", name: "name", label: "Nombre" },
              { type: "text", name: "tagline", label: "Lema" },
              { type: "textarea", name: "description", label: "Descripción", rows: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "aboutImpact",
    group: "Acerca de",
    name: "Impacto global",
    description: "Texto de impacto y las cifras destacadas.",
    path: "/about",
    icon: TrendingUp,
    preview: (d) =>
      ((d.stats as { value: string; label: string }[]) ?? []).map((s) => `${s.value} ${s.label}`).join(" · "),
    tabs: [
      {
        id: "encabezado",
        label: "Encabezado",
        fields: [
          { type: "text", name: "title", label: "Título" },
          { type: "textarea", name: "text", label: "Texto", rows: 4 },
        ],
      },
      {
        id: "cifras",
        label: "Cifras",
        fields: [
          {
            type: "list",
            name: "stats",
            label: "Cifras",
            itemName: "cifra",
            max: 6,
            title: (item) => `${item.value || "?"} · ${item.label || "Sin nombre"}`,
            newItem: { value: "", label: "", description: "", color: "blue" },
            fields: [
              { type: "text", name: "value", label: "Cifra", placeholder: "Ej: +130" },
              { type: "color", name: "color", label: "Color" },
              { type: "text", name: "label", label: "Nombre" },
              { type: "textarea", name: "description", label: "Descripción", rows: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "contact",
    group: "Contacto",
    name: "Datos de contacto",
    description: "Encabezado de Contacto, ubicación, correo, teléfono y redes.",
    path: "/contact",
    icon: Phone,
    note: "Estos datos y redes se usan en Inicio, Contacto y el pie de página.",
    preview: (d) => `${d.email} · ${d.phone}`,
    tabs: [
      {
        id: "textos",
        label: "Textos",
        fields: [
          { type: "text", name: "pageTitle", label: "Título de la página" },
          { type: "text", name: "pageSubtitle", label: "Subtítulo de la página" },
          { type: "text", name: "formTitle", label: "Título junto al formulario" },
          { type: "textarea", name: "formText", label: "Texto junto al formulario", rows: 4 },
        ],
      },
      {
        id: "datos",
        label: "Datos",
        fields: [
          { type: "text", name: "location", label: "Ubicación" },
          { type: "text", name: "email", label: "Correo" },
          { type: "text", name: "phone", label: "Teléfono" },
        ],
      },
      {
        id: "redes",
        label: "Redes",
        fields: [
          { type: "url", name: "facebook", label: "Facebook", icon: "fab fa-facebook-f", placeholder: "https://facebook.com/…" },
          { type: "url", name: "x", label: "X (antes Twitter)", icon: "fab fa-x-twitter", placeholder: "Vacío = no se muestra" },
          { type: "url", name: "instagram", label: "Instagram", icon: "fab fa-instagram", placeholder: "https://instagram.com/…" },
          { type: "url", name: "linkedin", label: "LinkedIn", icon: "fab fa-linkedin-in", placeholder: "https://linkedin.com/…" },
          { type: "url", name: "youtube", label: "YouTube", icon: "fab fa-youtube", placeholder: "https://youtube.com/@…" },
        ],
      },
    ],
  },
  {
    key: "footer",
    group: "Global",
    name: "Pie de página",
    description: "Descripción, derechos reservados y enlaces de recursos.",
    path: "/",
    icon: Footprints,
    note: "Las redes del pie de página se editan en Contacto › Datos de contacto.",
    preview: (d) => String(d.description),
    tabs: [
      {
        id: "textos",
        label: "Textos",
        fields: [
          { type: "textarea", name: "description", label: "Descripción", rows: 4 },
          { type: "text", name: "copyright", label: "Derechos reservados", hint: "Se antepone «© año»." },
        ],
      },
      {
        id: "recursos",
        label: "Recursos",
        fields: [
          {
            type: "list",
            name: "resources",
            label: "Enlaces",
            itemName: "enlace",
            max: 10,
            title: (item) => String(item.label || "Sin texto"),
            newItem: { label: "Nuevo enlace", href: "" },
            fields: [
              { type: "text", name: "label", label: "Texto" },
              { type: "text", name: "href", label: "Enlace", placeholder: "/ruta o https://…", hint: "Déjalo vacío si aún no tiene destino." },
            ],
          },
        ],
      },
    ],
  },
];

const GROUPS: SectionConfig["group"][] = ["Inicio", "Acerca de", "Contacto", "Global"];

const COLOR_LABEL: Record<SiteColor, string> = {
  blue: "Azul",
  yellow: "Amarillo",
  red: "Rojo",
  cyan: "Cian",
  purple: "Morado",
  green: "Verde",
};

const SITE_ICONS = [
  "fas fa-laptop-code", "fas fa-hands-helping", "fas fa-graduation-cap", "fas fa-vr-cardboard",
  "fas fa-globe-americas", "fas fa-certificate", "fas fa-star", "fas fa-lightbulb", "fas fa-handshake",
  "fas fa-rocket", "fas fa-users", "fas fa-book-open", "fas fa-brain", "fas fa-code", "fas fa-chalkboard-teacher",
  "fas fa-heart", "fas fa-leaf", "fas fa-puzzle-piece", "fas fa-robot", "fas fa-trophy", "fas fa-seedling",
  "fas fa-palette", "fas fa-language", "fas fa-calculator", "fas fa-flask", "fas fa-music", "fas fa-landmark",
  "fas fa-microchip", "fas fa-mobile-alt", "fas fa-shield-alt", "fas fa-chart-line", "fas fa-comments",
  "fas fa-award", "fas fa-compass", "fas fa-gem", "fas fa-magic", "fas fa-infinity", "fas fa-bolt",
  "fas fa-school", "fas fa-user-graduate",
];

type Data = Record<string, unknown>;

function fieldTab(section: SectionConfig, fieldName: string) {
  return section.tabs.find((t) => t.fields.some((f) => f.name === fieldName))?.id;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Campos                                                              */
/* ------------------------------------------------------------------ */

function FieldHint({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>;
}

function ColorSwatches({ value, onChange }: { value: SiteColor; onChange: (color: SiteColor) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SITE_COLORS.map((color) => (
        <motion.button
          key={color}
          type="button"
          title={COLOR_LABEL[color]}
          aria-label={COLOR_LABEL[color]}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onChange(color)}
          className={cn(
            "h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
            SITE_BG_CLASS[color],
            value === color ? "ring-2 ring-[#5b8fd4]" : "ring-0",
          )}
        />
      ))}
    </div>
  );
}

function IconField({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-10 w-full justify-start gap-2 rounded-xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#5b8fd4]/15 text-[#5b8fd4]">
            <i className={cn(value || "fas fa-question", "text-xs")} />
          </span>
          <span className="truncate text-xs text-muted-foreground">{value || "Elegir ícono"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl p-3">
        <div className="wca-scroll grid max-h-56 grid-cols-8 gap-1 overflow-y-auto pr-1">
          {SITE_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              title={icon.replace("fas fa-", "")}
              onClick={() => {
                onChange(icon);
                setOpen(false);
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition hover:bg-[#5b8fd4]/15 hover:text-[#5b8fd4]",
                value === icon && "bg-[#5b8fd4] text-white hover:bg-[#5b8fd4] hover:text-white",
              )}
            >
              <i className={icon} />
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 border-t pt-3">
          <Label className="text-[11px] text-muted-foreground">Otro ícono de Font Awesome</Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="fas fa-star"
            className="h-8 rounded-lg text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RichTextField({
  id,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (tag: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const open = `[${tag}]`;
    const close = `[/${tag}]`;
    const before = value.slice(0, start);
    const after = value.slice(end);

    // Si la selección ya tiene ese formato justo alrededor, se quita (como en Word).
    if (selected && before.endsWith(open) && after.startsWith(close)) {
      onChange(before.slice(0, -open.length) + selected + after.slice(close.length));
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(start - open.length, end - open.length);
      });
      return;
    }

    const text = selected || "texto";
    onChange(before + open + text + close + after);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const from = start + open.length;
      el.setSelectionRange(from, from + text.length);
    });
  };

  const clearFormat = () => onChange(value.replace(/\[\/?(blue|yellow|red|cyan|purple|green|b|i)\]/g, ""));

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b" || key === "i") {
      event.preventDefault();
      wrap(key);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-background transition-colors focus-within:border-[#5b8fd4]/60">
      <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/40 px-2.5 py-1.5">
        <motion.button
          type="button"
          title="Negrita (Ctrl+B)"
          aria-label="Negrita"
          whileTap={{ scale: 0.9 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap("b")}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-[#5b8fd4]/15 hover:text-[#5b8fd4]"
        >
          <Bold className="h-3.5 w-3.5" />
        </motion.button>
        <motion.button
          type="button"
          title="Cursiva (Ctrl+I)"
          aria-label="Cursiva"
          whileTap={{ scale: 0.9 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap("i")}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-[#5b8fd4]/15 hover:text-[#5b8fd4]"
        >
          <Italic className="h-3.5 w-3.5" />
        </motion.button>
        <span className="mx-1 h-4 w-px bg-border" />
        <span className="mr-0.5 text-[11px] text-muted-foreground">Color</span>
        {SITE_COLORS.map((color) => (
          <motion.button
            key={color}
            type="button"
            title={`Resaltar en ${COLOR_LABEL[color].toLowerCase()}`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrap(color)}
            className={cn("h-4 w-4 rounded-full", SITE_BG_CLASS[color])}
          />
        ))}
        <button
          type="button"
          onClick={clearFormat}
          title="Quita negritas, cursivas y colores"
          className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <RemoveFormatting className="h-3 w-3" />
          Quitar formato
        </button>
      </div>
      <Textarea
        id={id}
        ref={ref}
        value={value}
        rows={rows}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(e.target.value)}
        className="resize-y rounded-none border-0 font-mono text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <div className="border-t bg-muted/20 px-3 py-2.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Vista previa</p>
        <p className="text-sm leading-relaxed">
          {value.trim() ? <RichText text={value} /> : <span className="text-muted-foreground">Sin texto</span>}
        </p>
      </div>
    </div>
  );
}

function ListField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: Extract<Field, { type: "list" }>;
  value: Data[];
  onChange: (value: Data[]) => void;
  idPrefix: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const idsRef = useRef<string[]>([]);
  const nextId = useRef(0);
  const newId = () => `${idPrefix}-item-${nextId.current++}`;
  if (idsRef.current.length !== value.length) {
    idsRef.current = value.map(() => newId());
  }
  const ids = idsRef.current;

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onChange(next);
    if (openIndex === index) setOpenIndex(target);
    else if (openIndex === target) setOpenIndex(index);
  };

  const remove = (index: number) => {
    idsRef.current = ids.filter((_, i) => i !== index);
    onChange(value.filter((_, i) => i !== index));
    if (openIndex === index) setOpenIndex(null);
    else if (openIndex !== null && openIndex > index) setOpenIndex(openIndex - 1);
  };

  const add = () => {
    idsRef.current = [...ids, newId()];
    onChange([...value, { ...field.newItem }]);
    setOpenIndex(value.length);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {value.map((item, index) => {
          const open = openIndex === index;
          const color = item.color as SiteColor | undefined;
          return (
            <motion.div
              key={ids[index]}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card transition-colors",
                open && "border-[#5b8fd4]/60 shadow-sm shadow-[#5b8fd4]/10",
              )}
            >
              <div className="flex items-center gap-2 p-2.5 pl-3">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  {typeof item.icon === "string" ? (
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-white",
                        color ? SITE_BG_CLASS[color] : "bg-[#5b8fd4]",
                      )}
                    >
                      <i className={item.icon || "fas fa-question"} />
                    </span>
                  ) : color ? (
                    <span className={cn("h-3 w-3 shrink-0 rounded-full", SITE_BG_CLASS[color])} />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium">{field.title(item)}</span>
                  <ChevronDown
                    className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
                  />
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <span className="mx-1 h-4 w-px bg-border" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Bajar"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    aria-label={`Eliminar ${field.itemName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3 border-t bg-muted/20 p-3.5">
                      {field.fields.map((sub) => (
                        <div
                          key={sub.name}
                          className={cn(sub.type === "color" || sub.type === "icon" || (sub.type === "text" && sub.name === "number") ? "col-span-1" : "col-span-2")}
                        >
                          <FieldControl
                            field={sub}
                            value={item[sub.name]}
                            idPrefix={`${idPrefix}-${index}`}
                            onChange={(v) => onChange(value.map((it, i) => (i === index ? { ...it, [sub.name]: v } : it)))}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {value.length === 0 && (
        <p className="rounded-2xl border border-dashed py-6 text-center text-xs text-muted-foreground">
          Sin elementos. Se ocultará esta parte en el sitio.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={add}
        disabled={value.length >= field.max}
        className="h-9 w-full rounded-xl border-dashed text-xs transition hover:border-[#5b8fd4]/60 hover:text-[#5b8fd4]"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Agregar {field.itemName}
        <span className="ml-1 text-muted-foreground">
          ({value.length}/{field.max})
        </span>
      </Button>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.name}`;

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <Input id={id} value={String(value ?? "")} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          <FieldHint>{field.hint}</FieldHint>
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <Textarea id={id} value={String(value ?? "")} rows={field.rows ?? 3} onChange={(e) => onChange(e.target.value)} />
          <div className="flex items-start justify-between gap-2">
            <FieldHint>{field.hint}</FieldHint>
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{String(value ?? "").length} caracteres</span>
          </div>
        </div>
      );
    case "rich":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <RichTextField id={id} value={String(value ?? "")} rows={field.rows} onChange={onChange} />
          <FieldHint>{field.hint}</FieldHint>
        </div>
      );
    case "url":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <div className="relative">
            {field.icon && (
              <i className={cn(field.icon, "pointer-events-none absolute left-3 top-1/2 w-4 -translate-y-1/2 text-center text-sm text-muted-foreground")} />
            )}
            <Input id={id} value={String(value ?? "")} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} className={cn(field.icon && "pl-9")} />
          </div>
          {!String(value ?? "").trim() && <FieldHint>Vacío: el ícono no se mostrará.</FieldHint>}
        </div>
      );
    case "link": {
      const link = (value ?? { label: "", href: "" }) as { label: string; href: string };
      return (
        <div className="space-y-2 rounded-2xl border bg-muted/20 p-3.5">
          <p className="text-sm font-medium">{field.label}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-label`} className="text-xs text-muted-foreground">Texto</Label>
              <Input id={`${id}-label`} value={link.label} onChange={(e) => onChange({ ...link, label: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-href`} className="text-xs text-muted-foreground">Enlace</Label>
              <Input id={`${id}-href`} value={link.href} placeholder="/programs" onChange={(e) => onChange({ ...link, href: e.target.value })} />
            </div>
          </div>
          <FieldHint>Deja el texto vacío para ocultar el botón. Usa /ruta para páginas del sitio o https://… para enlaces externos.</FieldHint>
        </div>
      );
    }
    case "color":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <ColorSwatches value={(value as SiteColor) ?? "blue"} onChange={onChange} />
        </div>
      );
    case "icon":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <IconField value={String(value ?? "")} onChange={onChange} />
        </div>
      );
    case "paragraphs": {
      const paragraphs = (value as string[]) ?? [];
      return (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {paragraphs.map((p, i) => (
              <motion.div
                key={`${id}-${i}-${paragraphs.length}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${id}-${i}`}>Párrafo {i + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onChange(paragraphs.filter((_, j) => j !== i))}
                    aria-label={`Eliminar párrafo ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <RichTextField
                  id={`${id}-${i}`}
                  value={p}
                  rows={5}
                  onChange={(v) => onChange(paragraphs.map((x, j) => (j === i ? v : x)))}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <Button
            type="button"
            variant="outline"
            disabled={paragraphs.length >= field.max}
            onClick={() => onChange([...paragraphs, ""])}
            className="h-9 w-full rounded-xl border-dashed text-xs transition hover:border-[#5b8fd4]/60 hover:text-[#5b8fd4]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar párrafo
          </Button>
        </div>
      );
    }
    case "list":
      return <ListField field={field} value={(value as Data[]) ?? []} onChange={onChange} idPrefix={id} />;
  }
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

type PendingAction = { type: "open"; key: SiteContentKey } | { type: "close" } | null;

export default function AdminSiteContentPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data, isLoading: loadingContent } = useSiteContentData();

  const [search, setSearch] = useState("");
  const [activeKey, setActiveKey] = useState<SiteContentKey | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState("");
  const [draft, setDraft] = useState<Data | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) navigate("/auth");
  }, [user, isLoading, navigate]);

  const section = SECTIONS.find((s) => s.key === activeKey) ?? null;
  const saved = useMemo(
    () => (activeKey ? (resolveSiteContent(activeKey, data?.content?.[activeKey]) as Data) : null),
    [activeKey, data],
  );
  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);
  const customized = (key: SiteContentKey) => !!data?.meta?.[key];

  const openSection = (key: SiteContentKey) => {
    if (panelOpen && key === activeKey) return;
    if (dirty) {
      setPendingAction({ type: "open", key });
      return;
    }
    const config = SECTIONS.find((s) => s.key === key)!;
    setActiveKey(key);
    setDraft(structuredClone(resolveSiteContent(key, data?.content?.[key])) as Data);
    setTab(config.tabs[0].id);
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (dirty) {
      setPendingAction({ type: "close" });
      return;
    }
    setPanelOpen(false);
  };

  const discardAndContinue = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    setDraft(saved ? structuredClone(saved) : null);
    if (action.type === "open") {
      const config = SECTIONS.find((s) => s.key === action.key)!;
      setActiveKey(action.key);
      setDraft(structuredClone(resolveSiteContent(action.key, data?.content?.[action.key])) as Data);
      setTab(config.tabs[0].id);
      setPanelOpen(true);
    } else {
      setPanelOpen(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ key, payload }: { key: SiteContentKey; payload: Data }) => {
      const res = await apiRequest("PUT", `/api/site-content/${key}`, { data: payload });
      return (await res.json()) as { key: SiteContentKey; data: Data; updatedAt: string; updatedBy: string | null };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<SiteContentResponse>(SITE_CONTENT_QUERY_KEY, (old) => ({
        content: { ...(old?.content ?? {}), [result.key]: result.data },
        meta: { ...(old?.meta ?? {}), [result.key]: { updatedAt: result.updatedAt, updatedBy: result.updatedBy } },
      }));
      setDraft(structuredClone(resolveSiteContent(result.key, result.data)) as Data);
      toast({ title: "Cambios publicados", description: "El sitio ya muestra el nuevo contenido." });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (key: SiteContentKey) => {
      await apiRequest("DELETE", `/api/site-content/${key}`);
      return key;
    },
    onSuccess: (key) => {
      queryClient.setQueryData<SiteContentResponse>(SITE_CONTENT_QUERY_KEY, (old) => {
        const content = { ...(old?.content ?? {}) };
        const meta = { ...(old?.meta ?? {}) };
        delete content[key];
        delete meta[key];
        return { content, meta };
      });
      setDraft(structuredClone(SITE_CONTENT_DEFAULTS[key]) as Data);
      toast({ title: "Contenido restaurado", description: "La sección volvió a su texto original." });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo restaurar", description: error.message, variant: "destructive" });
    },
  });

  const save = () => {
    if (!section || !draft || !dirty) return;
    const parsed = SITE_CONTENT_SCHEMAS[section.key].safeParse(draft);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const target = fieldTab(section, String(issue.path[0] ?? ""));
      if (target) setTab(target);
      toast({ title: "Revisa los campos", description: issue.message, variant: "destructive" });
      return;
    }
    saveMutation.mutate({ key: section.key, payload: parsed.data as Data });
  };

  if (isLoading || !user || user.role !== "admin" || loadingContent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const visibleSections = SECTIONS.filter((s) => {
    const preview = s.preview(resolveSiteContent(s.key, data?.content?.[s.key]) as Data);
    return matchesSearch(search, s.name, s.group, s.description, preview);
  });
  const customizedCount = SECTIONS.filter((s) => customized(s.key)).length;
  const activeTab = section?.tabs.find((t) => t.id === tab) ?? section?.tabs[0];

  return (
    <>
      <Helmet>
        <title>Textos del sitio | Ecosistema WCA</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className={cn("transition-[padding] duration-300 ease-out", panelOpen && "lg:pr-[min(37rem,45vw)]")}>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  <Link href="/admin" className="hover:text-foreground">
                    Inicio
                  </Link>
                  {" › "}
                  Textos del sitio
                </p>
                <h1 className="mt-1 font-heading text-4xl font-bold">Textos del sitio</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Edita los textos, botones y datos de las páginas públicas sin tocar el código.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <AdminSearchInput value={search} onChange={setSearch} placeholder="Buscar sección o texto…" />
                <Button asChild className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]">
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <Globe2 className="h-4 w-4" />
                    Ver sitio
                  </a>
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" asChild>
                  <Link href="/admin">
                    <ArrowLeft className="h-4 w-4" />
                    Volver al panel
                  </Link>
                </Button>
              </div>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              {SECTIONS.length} secciones · {customizedCount} personalizadas · da clic en una para editarla.
            </p>

            {visibleSections.length === 0 ? (
              <AdminEmptyState>No hay secciones que coincidan con tu búsqueda.</AdminEmptyState>
            ) : (
              <div className="space-y-8">
                {GROUPS.map((group) => {
                  const items = visibleSections.filter((s) => s.group === group);
                  if (items.length === 0) return null;
                  return (
                    <motion.section key={group} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="mb-3 flex items-center gap-3">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group}</h2>
                        <span className="h-px flex-1 bg-border" />
                        <span className="text-[11px] text-muted-foreground">{items.length}</span>
                      </div>
                      <motion.div
                        layout
                        className={cn(
                          "grid grid-cols-1 gap-3 sm:grid-cols-2",
                          panelOpen ? "2xl:grid-cols-3" : "lg:grid-cols-3 2xl:grid-cols-4",
                        )}
                      >
                        <AnimatePresence>
                          {items.map((s, i) => {
                            const Icon = s.icon;
                            const meta = data?.meta?.[s.key];
                            const preview = s.preview(resolveSiteContent(s.key, data?.content?.[s.key]) as Data);
                            return (
                              <AdminTile
                                key={s.key}
                                index={i}
                                selected={panelOpen && activeKey === s.key}
                                onClick={() => openSection(s.key)}
                                className="flex flex-col gap-3 p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4]/15 text-[#5b8fd4] ring-1 ring-[#5b8fd4]/25 transition-colors duration-300 group-hover:bg-[#5b8fd4] group-hover:text-white">
                                    <Icon className="h-[18px] w-[18px]" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold leading-snug">{s.name}</p>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                                  </div>
                                </div>
                                <div className="rounded-xl bg-muted/40 px-3 py-2">
                                  <p className="line-clamp-2 text-xs italic text-muted-foreground">“{preview}”</p>
                                </div>
                                <div className="mt-auto flex items-center justify-between gap-2 text-[11px]">
                                  {meta ? (
                                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      Personalizado · {timeAgo(meta.updatedAt)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                                      Texto original
                                    </span>
                                  )}
                                  <span className="truncate font-mono text-muted-foreground/70">{s.path}</span>
                                </div>
                              </AdminTile>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    </motion.section>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <AdminEditPanel open={panelOpen && !!section} onClose={closePanel} widthClass="lg:w-[min(36rem,43vw)]">
        {section && draft && activeTab ? (
          <>
            <AdminPanelHeader
              media={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4] text-white">
                  <section.icon className="h-4 w-4" />
                </span>
              }
              title={section.name}
              subtitle={
                <>
                  {section.group} · <span className="font-mono">{section.path}</span>
                </>
              }
              onClose={closePanel}
              actions={[
                {
                  label: "Ver en el sitio",
                  icon: ExternalLink,
                  onClick: () => window.open(section.path, "_blank", "noopener,noreferrer"),
                },
                {
                  label: "Restaurar texto original",
                  icon: RotateCcw,
                  destructive: true,
                  disabled: !customized(section.key),
                  onClick: () => setConfirmReset(true),
                },
              ]}
            />
            {section.tabs.length > 1 && (
              <AdminPanelTabs
                tabs={section.tabs.map((t) => ({ id: t.id, label: t.label }))}
                value={activeTab.id}
                onChange={setTab}
                layoutId="site-content-tab"
              />
            )}
            <AdminPanelBody contentKey={`${section.key}-${activeTab.id}`}>
              {section.note && (
                <div className="rounded-xl border border-[#5b8fd4]/25 bg-[#5b8fd4]/[0.07] px-3 py-2 text-xs text-muted-foreground">
                  {section.note}
                </div>
              )}
              <AdminPanelSection title={activeTab.label}>
                {activeTab.fields.map((field) => (
                  <FieldControl
                    key={field.name}
                    field={field}
                    value={draft[field.name]}
                    idPrefix={section.key}
                    onChange={(v) => setDraft((prev) => (prev ? { ...prev, [field.name]: v } : prev))}
                  />
                ))}
              </AdminPanelSection>
            </AdminPanelBody>
            <AnimatePresence initial={false}>
              {dirty && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-5 text-xs text-amber-600 dark:text-amber-400"
                >
                  <span className="block pb-2">Hay cambios sin publicar en esta sección.</span>
                </motion.p>
              )}
            </AnimatePresence>
            <AdminPanelFooter
              onCancel={closePanel}
              onSubmit={save}
              pending={saveMutation.isPending}
              disabled={!dirty}
              submitLabel="Publicar cambios"
            />
          </>
        ) : null}
      </AdminEditPanel>

      <ConfirmDialog
        open={pendingAction != null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Cambios sin publicar"
        description={
          pendingAction?.type === "close"
            ? "Tienes cambios sin publicar en esta sección. Si cierras ahora, se perderán."
            : "Tienes cambios sin publicar en esta sección. Si abres otra ahora, se perderán."
        }
        confirmLabel="Descartar cambios"
        destructive
        onConfirm={discardAndContinue}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Restaurar texto original"
        description="Esta sección volverá a mostrar el texto original del sitio. Tus cambios guardados se perderán."
        confirmLabel="Restaurar"
        destructive
        onConfirm={() => {
          setConfirmReset(false);
          if (section) resetMutation.mutate(section.key);
        }}
      />
    </>
  );
}
