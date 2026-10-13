import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CARD_BACKGROUND_OPTIONS,
  CARD_DIRECTIONS,
  cssColorToHexInput,
  normalizeCardSlug,
  resolveCardDirectionColor,
  type CardSocialKey,
  type PresentationCardLink,
  type PresentationCardTheme,
} from "@shared/card-directions";
import { resolveMediaUrl } from "@shared/media-url";
import { CARD_SOCIALS, resolveCardBackground } from "@/components/cards/card-preview";
import { FaIconPicker } from "@/components/cards/fa-icon-picker";
import { ImageUrlInput } from "@/components/media/image-url-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  Circle,
  Copy,
  GripVertical,
  ImageIcon,
  Link2,
  Plus,
  RectangleHorizontal,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

export type CardEditorSection = "perfil" | "apariencia" | "redes" | "enlaces" | "publicacion";

export type CardEditorState = {
  name: string;
  roleTitle: string;
  bio: string;
  image: string;
  slug: string;
  direction: string;
  theme: PresentationCardTheme;
  linkedIn: string;
  instagram: string;
  twitter: string;
  github: string;
  youtube: string;
  tiktok: string;
  whatsapp: string;
  email: string;
  website: string;
  links: PresentationCardLink[];
  assignedUserId: number | null;
  isPublished: boolean;
};

export type UpdateCardField = <K extends keyof CardEditorState>(
  key: K,
  value: CardEditorState[K],
) => void;

type SetTheme = (patch: Partial<PresentationCardTheme>) => void;

export type UserBasic = { id: number; name: string; email: string };

/* ───────────── Piezas compartidas ───────────── */

function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-[#5b8fd4]">{eyebrow}</p>
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Group({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {action}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "flex rounded-xl border bg-muted/40 p-1",
        size === "sm" ? "w-auto shrink-0" : "w-full",
        disabled && "opacity-50",
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium transition",
              size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorField({
  value,
  fallback,
  onChange,
  onReset,
  placeholder,
  ariaLabel,
}: {
  value: string | undefined;
  fallback: string;
  onChange: (value: string | undefined) => void;
  onReset?: () => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={ariaLabel}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
        value={cssColorToHexInput(value || fallback, fallback)}
        onChange={(e) => onChange(e.target.value)}
      />
      <Input
        className="min-w-0 flex-1"
        value={value || ""}
        onChange={(e) => onChange(e.target.value.trim() || undefined)}
        placeholder={placeholder}
      />
      {onReset && value ? (
        <Button type="button" variant="outline" size="icon" title="Restaurar" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

/* ───────────── Perfil ───────────── */

export function ProfilePanel({
  state,
  update,
  accent,
}: {
  state: CardEditorState;
  update: UpdateCardField;
  accent: string;
}) {
  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Tarjeta"
        title="Perfil"
        description="Foto, nombre y la presentación que verá quien abra la tarjeta."
      />

      <Group title="Foto">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
            style={{ boxShadow: `0 0 0 2px ${accent}` }}
          >
            {state.image ? (
              <img src={resolveMediaUrl(state.image)} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <ImageUrlInput
            className="min-w-0 flex-1"
            value={state.image}
            onChange={(v) => update("image", v)}
            placeholder="https://… o /media/…"
          />
        </div>
      </Group>

      <Group title="Información">
        <div className="space-y-2">
          <Label htmlFor="card-name">Nombre</Label>
          <Input id="card-name" value={state.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-role">Cargo / puesto</Label>
          <Input
            id="card-role"
            value={state.roleTitle}
            onChange={(e) => update("roleTitle", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="card-bio">Biografía</Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">{state.bio.length}</span>
          </div>
          <AutoTextarea
            id="card-bio"
            value={state.bio}
            onChange={(e) => update("bio", e.target.value)}
            maxHeight={220}
            placeholder="Una o dos frases sobre ti."
          />
        </div>
      </Group>
    </div>
  );
}

/* ───────────── Diseño ───────────── */

const BUTTON_SHAPES: { value: NonNullable<PresentationCardTheme["buttonStyle"]>; label: string; radius: string }[] = [
  { value: "rounded", label: "Redondeado", radius: "6px" },
  { value: "pill", label: "Píldora", radius: "9999px" },
  { value: "square", label: "Cuadrado", radius: "2px" },
];

export function AppearancePanel({
  state,
  update,
  setTheme,
  accent,
  canChangeDirection,
}: {
  state: CardEditorState;
  update: UpdateCardField;
  setTheme: SetTheme;
  accent: string;
  canChangeDirection: boolean;
}) {
  const theme = state.theme;
  const background = theme.backgroundStyle || "gradient";
  const backgroundMeta = CARD_BACKGROUND_OPTIONS.find((o) => o.id === background);

  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Tarjeta"
        title="Diseño"
        description="Dirección, fondo, colores y forma de los botones."
      />

      <Group
        title="Dirección"
        hint={!canChangeDirection ? "Solo Talento puede cambiar la dirección." : undefined}
      >
        <Select
          value={state.direction}
          onValueChange={(v) => update("direction", v)}
          disabled={!canChangeDirection}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CARD_DIRECTIONS.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.direction === "direccion-sede" && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Acento de sede</Label>
            <Segmented
              value={theme.sedeAccent || "blue-strong"}
              onChange={(v) => setTheme({ sedeAccent: v })}
              options={(
                [
                  ["blue-strong", "Director"],
                  ["purple", "Subdirección"],
                ] as const
              ).map(([value, label]) => ({
                value,
                label: (
                  <>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: resolveCardDirectionColor("direccion-sede", { ...theme, sedeAccent: value }),
                      }}
                    />
                    {label}
                  </>
                ),
              }))}
            />
          </div>
        )}
      </Group>

      <Group title="Fondo" hint={backgroundMeta?.hint}>
        <div className="grid grid-cols-3 gap-2">
          {CARD_BACKGROUND_OPTIONS.map((opt) => {
            const active = opt.id === background;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme({ backgroundStyle: opt.id })}
                className={cn(
                  "group rounded-xl border p-1 text-left transition",
                  active ? "border-[#5b8fd4] ring-2 ring-[#5b8fd4]/40" : "hover:border-foreground/30",
                )}
              >
                <span
                  className="flex h-12 w-full items-center justify-center rounded-lg"
                  style={
                    opt.id === "image" && !theme.backgroundImage
                      ? { background: "#0b1220" }
                      : resolveCardBackground({ ...theme, backgroundStyle: opt.id }, accent)
                  }
                >
                  {opt.id === "image" && !theme.backgroundImage ? (
                    <ImageIcon className="h-4 w-4 text-white/60" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-1 block truncate px-1 text-[11px] font-medium",
                    active ? "text-[#5b8fd4]" : "text-muted-foreground",
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {(background === "solid" || background === "carbon") && (
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs text-muted-foreground">
              {background === "carbon" ? "Color base (carbono)" : "Color sólido"}
            </Label>
            <ColorField
              ariaLabel="Color de fondo"
              value={theme.backgroundColor}
              fallback="#0b1220"
              placeholder="#0b1220, hsl(...), rgb(...)"
              onChange={(v) => setTheme({ backgroundColor: v })}
              onReset={() => setTheme({ backgroundColor: "#0b1220" })}
            />
          </div>
        )}

        {background === "image" && (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Imagen de fondo</Label>
              <ImageUrlInput
                value={theme.backgroundImage || ""}
                onChange={(v) => setTheme({ backgroundImage: v || undefined })}
                placeholder="https://… o /media/…"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Oscurecimiento</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {theme.backgroundOverlay ?? 55}%
                </span>
              </div>
              <Slider
                min={0}
                max={90}
                step={1}
                value={[theme.backgroundOverlay ?? 55]}
                onValueChange={([value]) => setTheme({ backgroundOverlay: value ?? 55 })}
              />
              <p className="text-xs text-muted-foreground">Más oscuro = mejor contraste del texto.</p>
            </div>
          </div>
        )}
      </Group>

      <Group
        title="Color de acento"
        hint="Borde de la foto, cargo y botones. Vacío = color de la dirección."
      >
        <ColorField
          ariaLabel="Color de acento"
          value={theme.accentColor}
          fallback={resolveCardDirectionColor(state.direction, theme)}
          placeholder="Color de la dirección"
          onChange={(v) => setTheme({ accentColor: v })}
          onReset={() => setTheme({ accentColor: undefined })}
        />
      </Group>

      <Group title="Botones">
        <div className="grid grid-cols-3 gap-2">
          {BUTTON_SHAPES.map((shape) => {
            const active = (theme.buttonStyle || "rounded") === shape.value;
            return (
              <button
                key={shape.value}
                type="button"
                onClick={() => setTheme({ buttonStyle: shape.value })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-[11px] font-medium transition",
                  active
                    ? "border-[#5b8fd4] text-[#5b8fd4] ring-2 ring-[#5b8fd4]/40"
                    : "text-muted-foreground hover:border-foreground/30",
                )}
              >
                <span
                  className="h-5 w-14"
                  style={{ borderRadius: shape.radius, background: active ? "#5b8fd4" : "currentColor", opacity: active ? 1 : 0.35 }}
                />
                {shape.label}
              </button>
            );
          })}
        </div>
      </Group>

      <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
        <div>
          <Label htmlFor="showBrand">Marca Ecosistema WCA</Label>
          <p className="text-xs text-muted-foreground">Logo arriba de la tarjeta.</p>
        </div>
        <Switch
          id="showBrand"
          checked={theme.showBrand !== false}
          onCheckedChange={(checked) => setTheme({ showBrand: checked })}
        />
      </div>
    </div>
  );
}

/* ───────────── Redes ───────────── */

const SOCIAL_PLACEHOLDER: Partial<Record<CardSocialKey, string>> = {
  linkedIn: "https://linkedin.com/in/…",
  instagram: "https://instagram.com/…",
  twitter: "https://x.com/…",
  github: "https://github.com/…",
  youtube: "https://youtube.com/@…",
  tiktok: "https://tiktok.com/@…",
  whatsapp: "Número o URL de WhatsApp",
  email: "nombre@correo.com",
  website: "https://…",
};

const DISPLAY_OPTIONS = [
  { value: "circle" as const, label: <Circle className="h-3.5 w-3.5" />, title: "Círculo (icono)" },
  { value: "button" as const, label: <RectangleHorizontal className="h-3.5 w-3.5" />, title: "Botón Linktree" },
];

export function SocialsPanel({
  state,
  update,
  setTheme,
}: {
  state: CardEditorState;
  update: UpdateCardField;
  setTheme: SetTheme;
}) {
  const theme = state.theme;
  const defaultMode = theme.socialDisplayDefault || "circle";
  const activeCount = CARD_SOCIALS.filter((s) => state[s.key].trim()).length;

  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Tarjeta"
        title="Redes"
        description="Deja vacío lo que no quieras mostrar. Cada red puede verse como icono o como botón."
      />

      <Group title="Mostrar por defecto como">
        <Segmented
          value={defaultMode}
          onChange={(v) => setTheme({ socialDisplayDefault: v })}
          options={[
            { value: "circle", label: <><Circle className="h-3.5 w-3.5" /> Círculos</> },
            { value: "button", label: <><RectangleHorizontal className="h-3.5 w-3.5" /> Botones</> },
          ]}
        />
      </Group>

      <Group title="Redes" action={<span className="text-[11px] text-muted-foreground">{activeCount} activas</span>}>
        <div className="space-y-2">
          {CARD_SOCIALS.map((social) => {
            const value = state[social.key];
            const filled = value.trim().length > 0;
            const display = theme.socialDisplay?.[social.key] ?? defaultMode;
            const lightIcon = social.color === "#fff";
            return (
              <div
                key={social.key}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2 transition",
                  filled ? "bg-muted/30" : "border-dashed",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base",
                    !filled && "opacity-50",
                    lightIcon && "text-foreground",
                  )}
                  style={lightIcon ? undefined : { color: social.color }}
                  title={social.label}
                >
                  <i className={social.icon} />
                </span>
                <Input
                  aria-label={social.label}
                  className="h-9 min-w-0 flex-1"
                  value={value}
                  onChange={(e) => update(social.key, e.target.value)}
                  placeholder={SOCIAL_PLACEHOLDER[social.key] ?? social.label}
                />
                <Segmented
                  size="sm"
                  disabled={!filled}
                  value={display}
                  options={DISPLAY_OPTIONS}
                  onChange={(v) =>
                    setTheme({
                      socialDisplay: { ...(theme.socialDisplay ?? {}), [social.key]: v },
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </Group>
    </div>
  );
}

/* ───────────── Enlaces ───────────── */

export function LinksPanel({
  state,
  update,
}: {
  state: CardEditorState;
  update: UpdateCardField;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const links = state.links;
  const setLinks = (next: PresentationCardLink[]) =>
    update(
      "links",
      next.map((l, i) => ({ ...l, order: i + 1 })),
    );
  const patchLink = (index: number, patch: Partial<PresentationCardLink>) => {
    const next = [...links];
    next[index] = { ...next[index], ...patch };
    setLinks(next);
  };
  const moveLink = (from: number, to: number) => {
    if (from === to || to < 0 || to >= links.length) return;
    const next = [...links];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setLinks(next);
  };

  const addLink = () => {
    const link: PresentationCardLink = {
      id: `link-${Date.now()}`,
      title: "Nuevo enlace",
      url: "https://",
      style: "solid",
      order: links.length + 1,
      enabled: true,
    };
    setLinks([...links, link]);
    setExpandedId(link.id);
  };

  const resetDrag = () => {
    setArmedId(null);
    setDragIndex(null);
    setOverIndex(null);
  };

  const pendingDelete = links.find((l) => l.id === deleteId);

  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Tarjeta"
        title="Enlaces"
        description="Botones personalizados: portafolio, agenda, formularios… Arrástralos para ordenarlos."
        action={
          <Button type="button" size="sm" className="h-8 shrink-0 rounded-lg bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]" onClick={addLink}>
            <Plus className="h-4 w-4" />
            Añadir
          </Button>
        }
      />

      {links.length === 0 ? (
        <button
          type="button"
          onClick={addLink}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground transition hover:border-[#5b8fd4]/50 hover:text-foreground"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5b8fd4]/15 text-[#5b8fd4]">
            <Link2 className="h-5 w-5" />
          </span>
          Aún no hay enlaces. Añade el primero.
        </button>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => {
            const expanded = expandedId === link.id;
            return (
              <div
                key={link.id}
                draggable={armedId === link.id}
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  if (overIndex !== index) setOverIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) moveLink(dragIndex, index);
                  resetDrag();
                }}
                onDragEnd={resetDrag}
                className={cn(
                  "rounded-xl border bg-card transition",
                  dragIndex === index && "opacity-50",
                  overIndex === index && dragIndex !== null && dragIndex !== index && "border-[#5b8fd4] ring-2 ring-[#5b8fd4]/30",
                  !link.enabled && "opacity-70",
                )}
              >
                <div className="flex items-center gap-1.5 p-2">
                  <button
                    type="button"
                    aria-label="Arrastrar para reordenar (o usa ↑ ↓)"
                    title="Arrastrar para reordenar"
                    className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    onPointerDown={() => setArmedId(link.id)}
                    onPointerUp={() => setArmedId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        moveLink(index, index - 1);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        moveLink(index, index + 1);
                      }
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1 text-left"
                    onClick={() => setExpandedId(expanded ? null : link.id)}
                    aria-expanded={expanded}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                      {link.icon ? <i className={link.icon} /> : <Link2 className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{link.title || "Sin título"}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{link.url}</span>
                    </span>
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
                    />
                  </button>
                  <Switch
                    aria-label={link.enabled ? "Visible" : "Oculto"}
                    title={link.enabled ? "Visible" : "Oculto"}
                    checked={link.enabled}
                    onCheckedChange={(checked) => patchLink(index, { enabled: checked })}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Eliminar enlace"
                    onClick={() => setDeleteId(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {expanded && (
                  <div className="space-y-3 border-t p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Título</Label>
                      <Input
                        value={link.title}
                        onChange={(e) => patchLink(index, { title: e.target.value })}
                        placeholder="Título del botón"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">URL</Label>
                      <Input
                        value={link.url}
                        onChange={(e) => patchLink(index, { url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Ícono</Label>
                        <FaIconPicker value={link.icon} onChange={(icon) => patchLink(index, { icon })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Estilo</Label>
                        <Select
                          value={link.style || "solid"}
                          onValueChange={(v) => patchLink(index, { style: v as PresentationCardLink["style"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid">Sólido</SelectItem>
                            <SelectItem value="soft">Suave</SelectItem>
                            <SelectItem value="outline">Contorno</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="¿Eliminar enlace?"
        description={pendingDelete ? `Se quitará “${pendingDelete.title || "Sin título"}” de la tarjeta.` : undefined}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          setLinks(links.filter((l) => l.id !== deleteId));
          if (expandedId === deleteId) setExpandedId(null);
          setDeleteId(null);
        }}
      />
    </div>
  );
}

/* ───────────── Publicación ───────────── */

export function PublishPanel({
  state,
  update,
  isAdmin,
  users,
}: {
  state: CardEditorState;
  update: UpdateCardField;
  isAdmin: boolean;
  users: UserBasic[];
}) {
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  const slug = normalizeCardSlug(state.slug) || state.slug;
  const publicUrl = `https://ecosistemawca.com/${slug}`;
  const assignedUser = users.find((u) => u.id === state.assignedUserId);
  const needle = search.trim().toLowerCase();
  const filteredUsers = !needle
    ? users
    : users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle));

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Enlace copiado", description: publicUrl });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Tarjeta"
        title="Publicación"
        description="Quién puede verla, en qué dirección y quién la administra."
      />

      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3",
          state.isPublished && "border-emerald-500/30 bg-emerald-500/5",
        )}
      >
        <div>
          <Label htmlFor="published" className="flex items-center gap-2">
            <span
              className={cn("h-2 w-2 rounded-full", state.isPublished ? "bg-emerald-500" : "bg-muted-foreground/50")}
            />
            {state.isPublished ? "Publicada" : "Borrador"}
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {state.isPublished ? "Cualquiera con el enlace puede verla." : "Solo visible para ti y Talento."}
          </p>
        </div>
        <Switch
          id="published"
          checked={state.isPublished}
          onCheckedChange={(checked) => update("isPublished", checked)}
        />
      </div>

      <Group title="Enlace público">
        {isAdmin ? (
          <div className="flex h-10 items-center overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="flex h-full items-center border-r bg-muted/50 px-3 text-sm text-muted-foreground">
              ecosistemawca.com/
            </span>
            <input
              aria-label="Slug de la tarjeta"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              value={state.slug}
              onChange={(e) => update("slug", e.target.value)}
              onBlur={() => update("slug", normalizeCardSlug(state.slug))}
            />
          </div>
        ) : (
          <p className="truncate rounded-md border bg-muted/40 px-3 py-2 text-sm">ecosistemawca.com/{slug}</p>
        )}
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={copyUrl}>
          <Copy className="h-3.5 w-3.5" />
          Copiar enlace
        </Button>
      </Group>

      {isAdmin && (
        <Group title="Responsable" hint="El usuario asignado podrá editar su tarjeta desde su perfil.">
          <div ref={pickerRef} className="relative w-full">
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={pickerOpen}
              className="h-10 w-full justify-between font-normal"
              onClick={() =>
                setPickerOpen((prev) => {
                  if (!prev) setSearch("");
                  return !prev;
                })
              }
            >
              <span className="truncate">
                {assignedUser ? `${assignedUser.name} · ${assignedUser.email}` : "Sin asignar"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {pickerOpen ? (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[200] w-full rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="h-9 pl-8"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {[{ id: null as number | null, label: "Sin asignar" }, ...filteredUsers.map((u) => ({ id: u.id as number | null, label: `${u.name} · ${u.email}` }))].map(
                    (option) => (
                      <button
                        key={option.id ?? "none"}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent",
                          state.assignedUserId === option.id && "bg-accent/60",
                        )}
                        onClick={() => {
                          update("assignedUserId", option.id);
                          setPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            state.assignedUserId === option.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{option.label}</span>
                      </button>
                    ),
                  )}
                  {filteredUsers.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">No se encontró ningún usuario.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </Group>
      )}
    </div>
  );
}
