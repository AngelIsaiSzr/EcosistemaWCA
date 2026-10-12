import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPanelSection } from "@/components/admin/edit-panel";
import { ImageUrlInput } from "@/components/media/image-url-input";
import { LANDING_ICON_COMPONENTS } from "@/components/inedito/landing-view";
import { cn } from "@/lib/utils";
import {
  LANDING_FONTS,
  LANDING_ICONS,
  LANDING_ICON_LABEL,
  SECTION_TYPE_META,
  createLandingButton,
  createLandingItem,
  landingId,
  type IneditoLandingContent,
  type LandingButton,
  type LandingIcon,
  type LandingItem,
  type LandingSection,
  type LandingSectionStyle,
  type LandingSectionType,
} from "@shared/inedito-landing";

/* ───────────── Controles básicos ───────────── */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-foreground/80">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const RICH_HINT = (
  <>
    <code className="rounded bg-muted px-1">**negritas**</code> · <code className="rounded bg-muted px-1">*cursiva*</code> ·{" "}
    <code className="rounded bg-muted px-1">==color de acento==</code>
  </>
);

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rich,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rich?: boolean;
  hint?: ReactNode;
  maxLength?: number;
}) {
  const extra = rich ? (
    <>
      {RICH_HINT}
      {multiline ? " · línea en blanco = nuevo párrafo" : null}
      {hint ? <> · {hint}</> : null}
    </>
  ) : (
    hint
  );
  return (
    <Field label={label} hint={extra}>
      {multiline ? (
        <AutoTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          maxHeight={320}
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
      )}
    </Field>
  );
}

export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-start gap-2">
        <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <ImageUrlInput value={value} onChange={onChange} className="min-w-0 flex-1" />
      </div>
    </Field>
  );
}

export function ChoiceChips<T extends string | number>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T;
  options: { id: T; label: string; preview?: ReactNode }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div
      className={cn("grid gap-1.5", !columns && "grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))]")}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={String(opt.id)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            title={opt.label}
            className={cn(
              "flex min-h-9 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-center text-xs font-medium transition",
              active
                ? "border-[#5b8fd4] bg-[#5b8fd4]/10 text-foreground ring-1 ring-[#5b8fd4]/40"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {opt.preview}
            <span className={cn("w-full truncate leading-tight", opt.preview ? "text-[10.5px]" : undefined)}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  allowEmpty,
  emptyLabel = "Automático",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <label
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border shadow-sm"
          style={{
            background: value || "repeating-conic-gradient(#d4d4d8 0% 25%, transparent 0% 50%) 50% / 10px 10px",
          }}
        >
          <input
            type="color"
            value={value || "#0056ff"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
        <Input
          value={text}
          placeholder={allowEmpty ? emptyLabel : "#000000"}
          className="h-9 font-mono text-xs"
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            if (/^#[0-9a-f]{6}$/i.test(next) || /^#[0-9a-f]{3}$/i.test(next)) onChange(next);
            else if (!next && allowEmpty) onChange("");
          }}
        />
        {allowEmpty && value ? (
          <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 px-2 text-xs" onClick={() => onChange("")}>
            Quitar
          </Button>
        ) : null}
      </div>
    </Field>
  );
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="block text-[11px] text-muted-foreground">{description}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function IconPicker({ value, onChange }: { value: LandingIcon | ""; onChange: (value: LandingIcon | "") => void }) {
  const [open, setOpen] = useState(false);
  const Current = value ? LANDING_ICON_COMPONENTS[value] : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-10 w-full justify-between gap-2 px-3 font-normal">
          <span className="flex items-center gap-2 text-sm">
            {Current ? <Current className="h-4 w-4 text-[#5b8fd4]" /> : <span className="h-4 w-4 rounded border border-dashed" />}
            {value ? LANDING_ICON_LABEL[value] : "Sin icono"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            title="Sin icono"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground hover:bg-muted",
              !value && "border-[#5b8fd4] bg-[#5b8fd4]/10",
            )}
          >
            —
          </button>
          {LANDING_ICONS.map((icon) => {
            const Icon = LANDING_ICON_COMPONENTS[icon];
            return (
              <button
                key={icon}
                type="button"
                title={LANDING_ICON_LABEL[icon]}
                onClick={() => {
                  onChange(icon);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-10 items-center justify-center rounded-lg hover:bg-muted",
                  value === icon && "bg-[#5b8fd4]/15 text-[#5b8fd4] ring-1 ring-[#5b8fd4]/40",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x!);
  return next;
}

function ListRowActions({
  index,
  total,
  onMove,
  onDuplicate,
  onRemove,
  canRemove = true,
}: {
  index: number;
  total: number;
  onMove: (to: number) => void;
  onDuplicate?: () => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Subir">
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(index + 1)} aria-label="Bajar">
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      {onDuplicate ? (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} aria-label="Duplicar">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600"
        disabled={!canRemove}
        onClick={onRemove}
        aria-label="Quitar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ───────────── Botones ───────────── */

const BUTTON_VARIANTS: { id: LandingButton["variant"]; label: string }[] = [
  { id: "primary", label: "Principal" },
  { id: "outline", label: "Contorno" },
  { id: "ghost", label: "Discreto" },
  { id: "white", label: "Blanco" },
];

export function ButtonsEditor({
  buttons,
  onChange,
  max = 4,
}: {
  buttons: LandingButton[];
  onChange: (buttons: LandingButton[]) => void;
  max?: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const update = (id: string, patch: Partial<LandingButton>) =>
    onChange(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  return (
    <div className="space-y-2">
      {buttons.map((b, i) => {
        const open = openId === b.id;
        return (
          <div key={b.id} className="rounded-xl border bg-muted/20">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-muted/50"
                onClick={() => setOpenId(open ? null : b.id)}
              >
                <span
                  className={cn(
                    "h-3 w-6 shrink-0 rounded-full",
                    b.variant === "primary" && "bg-[#0056FF]",
                    b.variant === "outline" && "border-2 border-foreground/40",
                    b.variant === "ghost" && "bg-muted",
                    b.variant === "white" && "border bg-white",
                  )}
                />
                <span className="truncate font-medium">{b.label || "Sin texto"}</span>
                <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 opacity-50 transition", open && "rotate-180")} />
              </button>
              <ListRowActions
                index={i}
                total={buttons.length}
                onMove={(to) => onChange(move(buttons, i, to))}
                onRemove={() => onChange(buttons.filter((x) => x.id !== b.id))}
              />
            </div>
            {open ? (
              <div className="space-y-3 border-t px-3 pb-3 pt-3">
                <TextField label="Texto" value={b.label} onChange={(label) => update(b.id, { label })} maxLength={80} />
                <TextField
                  label="Enlace"
                  value={b.href}
                  onChange={(href) => update(b.id, { href })}
                  placeholder="#aplicar, /formulario o https://…"
                  hint="Usa #ancla para ir a una sección de esta página."
                />
                <Field label="Estilo">
                  <ChoiceChips value={b.variant} options={BUTTON_VARIANTS} onChange={(variant) => update(b.id, { variant })} columns={4} />
                </Field>
                <div className="grid gap-2">
                  <SwitchRow label="Flecha" checked={b.arrow} onChange={(arrow) => update(b.id, { arrow })} />
                  <SwitchRow label="Pestaña nueva" checked={b.newTab} onChange={(newTab) => update(b.id, { newTab })} />
                  <SwitchRow label="Muy pronto" checked={b.soon} onChange={(soon) => update(b.id, { soon })} />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {buttons.length < max ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => {
            const b = createLandingButton();
            onChange([...buttons, b]);
            setOpenId(b.id);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar botón
        </Button>
      ) : null}
    </div>
  );
}

/* ───────────── Elementos (tarjetas, pasos, preguntas…) ───────────── */

type ItemFieldKey = "title" | "body" | "icon" | "image" | "tag";
type ItemFieldDef = { key: ItemFieldKey; label: string; multiline?: boolean; rich?: boolean; placeholder?: string };

export function itemConfig(section: LandingSection): { noun: string; plural: string; fields: ItemFieldDef[]; max: number } {
  switch (section.type) {
    case "stats":
      return {
        noun: "dato",
        plural: "Datos",
        max: 8,
        fields: [
          { key: "icon", label: "Icono" },
          { key: "title", label: "Cifra", placeholder: "7" },
          { key: "body", label: "Texto", placeholder: "Direcciones" },
        ],
      };
    case "gallery":
      return {
        noun: "foto",
        plural: "Fotos",
        max: 12,
        fields: [
          { key: "image", label: "Imagen" },
          { key: "tag", label: "Pie de foto", placeholder: "Experiencias inmersivas" },
          { key: "body", label: "Descripción (accesibilidad)", placeholder: "Qué se ve en la foto" },
        ],
      };
    case "cards": {
      const fields: ItemFieldDef[] = [];
      if (section.variant === "image") fields.push({ key: "image", label: "Imagen" });
      if (section.variant === "check" || section.variant === "icon") fields.push({ key: "icon", label: "Icono" });
      if (section.variant === "numbered") fields.push({ key: "tag", label: "Número o etiqueta", placeholder: "Vacío = 01, 02…" });
      if (section.variant === "image") fields.push({ key: "tag", label: "Etiqueta", placeholder: "Opcional" });
      fields.push({ key: "title", label: "Título" }, { key: "body", label: "Texto", multiline: true, rich: true });
      return { noun: "tarjeta", plural: "Tarjetas", max: 16, fields };
    }
    case "steps":
      return {
        noun: "paso",
        plural: "Pasos",
        max: 8,
        fields: [
          { key: "tag", label: "Número", placeholder: "Vacío = 01, 02…" },
          { key: "title", label: "Título" },
          { key: "body", label: "Texto", multiline: true, rich: true },
        ],
      };
    case "faq":
      return {
        noun: "pregunta",
        plural: "Preguntas",
        max: 24,
        fields: [
          { key: "title", label: "Pregunta" },
          { key: "body", label: "Respuesta", multiline: true, rich: true },
        ],
      };
    default:
      return { noun: "elemento", plural: "Elementos", max: 12, fields: [] };
  }
}

function itemSummary(it: LandingItem, index: number) {
  return (it.title || it.tag || it.body || `Elemento ${index + 1}`).replace(/[*=]/g, "");
}

export function ItemsEditor({ section, onChange }: { section: LandingSection; onChange: (items: LandingItem[]) => void }) {
  const config = itemConfig(section);
  const [openId, setOpenId] = useState<string | null>(null);
  const items = section.items;
  const update = (id: string, patch: Partial<LandingItem>) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const open = openId === it.id;
        const Icon = it.icon ? LANDING_ICON_COMPONENTS[it.icon] : null;
        return (
          <div key={it.id} className={cn("rounded-xl border bg-muted/20", open && "border-[#5b8fd4]/50")}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-muted/50"
                onClick={() => setOpenId(open ? null : it.id)}
              >
                {it.image ? (
                  <img src={it.image} alt="" className="h-7 w-9 shrink-0 rounded object-cover" />
                ) : Icon ? (
                  <Icon className="h-4 w-4 shrink-0 text-[#5b8fd4]" />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                )}
                <span className="truncate">{itemSummary(it, i)}</span>
                <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 opacity-50 transition", open && "rotate-180")} />
              </button>
              <ListRowActions
                index={i}
                total={items.length}
                onMove={(to) => onChange(move(items, i, to))}
                onDuplicate={
                  items.length < config.max
                    ? () => {
                        const copy = { ...it, id: landingId("it") };
                        const next = items.slice();
                        next.splice(i + 1, 0, copy);
                        onChange(next);
                        setOpenId(copy.id);
                      }
                    : undefined
                }
                onRemove={() => onChange(items.filter((x) => x.id !== it.id))}
              />
            </div>
            {open ? (
              <div className="space-y-3 border-t px-3 pb-3 pt-3">
                {config.fields.map((f) => {
                  if (f.key === "icon") {
                    return (
                      <Field key={f.key} label={f.label}>
                        <IconPicker value={it.icon} onChange={(icon) => update(it.id, { icon })} />
                      </Field>
                    );
                  }
                  if (f.key === "image") {
                    return <ImageField key={f.key} label={f.label} value={it.image} onChange={(image) => update(it.id, { image })} />;
                  }
                  return (
                    <TextField
                      key={f.key}
                      label={f.label}
                      value={it[f.key]}
                      onChange={(v) => update(it.id, { [f.key]: v } as Partial<LandingItem>)}
                      multiline={f.multiline}
                      rich={f.rich}
                      placeholder={f.placeholder}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      {items.length < config.max ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => {
            const it = createLandingItem();
            if (section.type === "gallery") it.image = items[0]?.image ?? "";
            onChange([...items, it]);
            setOpenId(it.id);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar {config.noun}
        </Button>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">Máximo {config.max}.</p>
      )}
    </div>
  );
}

function ImagesListEditor({ images, onChange, max = 6 }: { images: string[]; onChange: (images: string[]) => void; max?: number }) {
  return (
    <div className="space-y-2">
      {images.map((src, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ImageField label={`Imagen ${i + 1}`} value={src} onChange={(v) => onChange(images.map((x, j) => (j === i ? v : x)))} />
          </div>
          <div className="pt-6">
            <ListRowActions
              index={i}
              total={images.length}
              onMove={(to) => onChange(move(images, i, to))}
              onRemove={() => onChange(images.filter((_, j) => j !== i))}
            />
          </div>
        </div>
      ))}
      {images.length < max ? (
        <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => onChange([...images, images[0] ?? ""])}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar imagen
        </Button>
      ) : null}
    </div>
  );
}

/* ───────────── Contenido de la sección ───────────── */

type Patch = (patch: Partial<LandingSection>) => void;
type StylePatch = (patch: Partial<LandingSectionStyle>) => void;

const HAS: Record<LandingSectionType, { eyebrow?: boolean; title?: boolean; subtitle?: boolean; body?: boolean; logo?: boolean; buttons?: boolean; note?: boolean; images?: boolean; items?: boolean; bgImage?: boolean }> = {
  hero: { eyebrow: true, logo: true, title: true, subtitle: true, buttons: true, bgImage: true },
  stats: { items: true, note: true },
  text: { eyebrow: true, title: true, subtitle: true, body: true, buttons: true },
  gallery: { eyebrow: true, title: true, subtitle: true, items: true },
  cards: { eyebrow: true, title: true, subtitle: true, items: true, buttons: true },
  split: { eyebrow: true, title: true, body: true, images: true, buttons: true },
  steps: { eyebrow: true, title: true, subtitle: true, items: true },
  faq: { eyebrow: true, title: true, subtitle: true, items: true },
  cta: { logo: true, title: true, body: true, buttons: true, note: true, bgImage: true },
};

export function SectionContentEditor({ section, patch, patchStyle }: { section: LandingSection; patch: Patch; patchStyle: StylePatch }) {
  const has = HAS[section.type];
  const config = has.items ? itemConfig(section) : null;
  const bgImage = section.style.bgImage || (section.type === "hero" ? section.image : "");

  return (
    <>
      {has.eyebrow || has.title || has.subtitle || has.body || has.logo ? (
        <AdminPanelSection title="Textos">
          {has.logo ? <ImageField label="Logo" value={section.logo} onChange={(logo) => patch({ logo })} hint="PNG con fondo transparente." /> : null}
          {has.eyebrow ? (
            <TextField label="Encabezado pequeño" value={section.eyebrow} onChange={(eyebrow) => patch({ eyebrow })} placeholder="Ej. EDICIÓN ORIGEN" />
          ) : null}
          {has.title ? <TextField label="Título" value={section.title} onChange={(title) => patch({ title })} rich multiline /> : null}
          {has.subtitle ? <TextField label="Subtítulo" value={section.subtitle} onChange={(subtitle) => patch({ subtitle })} rich multiline /> : null}
          {has.body ? <TextField label="Texto" value={section.body} onChange={(body) => patch({ body })} rich multiline /> : null}
        </AdminPanelSection>
      ) : null}

      {has.bgImage ? (
        <AdminPanelSection title="Imagen de fondo">
          <ImageField
            label="Imagen"
            value={bgImage}
            onChange={(v) => {
              patchStyle(v ? { bgImage: v, background: "image" } : { bgImage: "", background: section.style.background === "image" ? "storm" : section.style.background });
              if (section.type === "hero") patch({ image: v });
            }}
            hint="El oscurecimiento se ajusta en la pestaña Diseño."
          />
        </AdminPanelSection>
      ) : null}

      {has.images ? (
        <AdminPanelSection title="Imágenes">
          <ImagesListEditor images={section.images} onChange={(images) => patch({ images })} />
        </AdminPanelSection>
      ) : null}

      {config ? (
        <AdminPanelSection title={`${config.plural} (${section.items.length})`}>
          <ItemsEditor section={section} onChange={(items) => patch({ items })} />
        </AdminPanelSection>
      ) : null}

      {has.buttons ? (
        <AdminPanelSection title={`Botones (${section.buttons.length})`}>
          <ButtonsEditor buttons={section.buttons} onChange={(buttons) => patch({ buttons })} />
        </AdminPanelSection>
      ) : null}

      {has.note ? (
        <AdminPanelSection title="Nota">
          <TextField
            label={section.type === "stats" ? "Texto a la derecha" : "Nota al pie"}
            value={section.note}
            onChange={(note) => patch({ note })}
            placeholder={section.type === "stats" ? "WCA · INÉDITO" : "Opcional"}
          />
        </AdminPanelSection>
      ) : null}

      <AdminPanelSection title="Menú y enlace">
        <TextField
          label="Nombre en el menú superior"
          value={section.navLabel}
          onChange={(navLabel) => patch({ navLabel })}
          placeholder="Vacío = no aparece en el menú"
          maxLength={40}
        />
        <TextField
          label="Ancla"
          value={section.anchor}
          onChange={(anchor) =>
            patch({
              anchor: anchor
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9-]+/g, "-"),
            })
          }
          placeholder="experiencia"
          hint={section.anchor ? <>Los botones pueden enlazar aquí con <code className="rounded bg-muted px-1">#{section.anchor}</code>.</> : "Necesaria para que aparezca en el menú."}
        />
      </AdminPanelSection>
    </>
  );
}

/* ───────────── Diseño de la sección ───────────── */

const BACKGROUNDS: { id: LandingSectionStyle["background"]; label: string; swatch: string }[] = [
  { id: "storm", label: "Tormenta", swatch: "radial-gradient(circle at 30% 20%, #1e3a8a, #020617 70%)" },
  { id: "deep", label: "Profundo", swatch: "linear-gradient(180deg, #020617, #0a1a3a)" },
  { id: "navy", label: "Marino", swatch: "#061228" },
  { id: "glow", label: "Resplandor", swatch: "radial-gradient(circle at 50% 100%, #0056ff, #020617 70%)" },
  { id: "color", label: "Color", swatch: "conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)" },
  { id: "gradient", label: "Degradado", swatch: "linear-gradient(135deg, #0b1c3d, #0056ff)" },
  { id: "image", label: "Imagen", swatch: "linear-gradient(135deg, #334155, #64748b)" },
];

const usesSurface = (s: LandingSection) =>
  s.type === "cards" ||
  s.type === "faq" ||
  (s.type === "text" && s.variant === "card") ||
  (s.type === "stats" && s.variant === "cards");

const usesColumns = (s: LandingSection) => s.type === "cards" || (s.type === "gallery" && s.variant === "grid");

const usesShadow = (s: LandingSection) => usesSurface(s) || s.type === "gallery" || s.type === "split";

export function SectionDesignEditor({ section, patch, patchStyle }: { section: LandingSection; patch: Patch; patchStyle: StylePatch }) {
  const s = section.style;
  const meta = SECTION_TYPE_META[section.type];
  const isHeroLike = section.type === "hero" || section.type === "cta";

  return (
    <>
      {meta.variants.length > 1 ? (
        <AdminPanelSection title="Acomodo">
          <ChoiceChips value={section.variant} options={meta.variants} onChange={(variant) => patch({ variant })} columns={2} />
        </AdminPanelSection>
      ) : null}

      <AdminPanelSection title="Fondo">
        <ChoiceChips
          value={s.background}
          onChange={(background) => patchStyle({ background })}
          options={BACKGROUNDS.map((b) => ({
            id: b.id,
            label: b.label,
            preview: <span className="h-5 w-full rounded-md border border-black/10" style={{ background: b.swatch }} />,
          }))}
          columns={4}
        />
        {s.background === "color" || s.background === "gradient" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField label={s.background === "gradient" ? "Color inicial" : "Color"} value={s.bgColor} onChange={(bgColor) => patchStyle({ bgColor })} />
            {s.background === "gradient" ? <ColorField label="Color final" value={s.bgColor2} onChange={(bgColor2) => patchStyle({ bgColor2 })} /> : null}
          </div>
        ) : null}
        {s.background === "image" ? (
          <>
            {!isHeroLike ? <ImageField label="Imagen de fondo" value={s.bgImage} onChange={(bgImage) => patchStyle({ bgImage })} /> : null}
            <Field label={`Oscurecimiento · ${s.overlay}%`} hint="Más alto = texto más legible sobre la foto.">
              <Slider value={[s.overlay]} min={0} max={100} step={1} onValueChange={([v]) => patchStyle({ overlay: v ?? s.overlay })} />
            </Field>
          </>
        ) : null}
        <SwitchRow label="Líneas divisorias" description="Línea fina arriba y abajo de la sección." checked={s.divider} onChange={(divider) => patchStyle({ divider })} />
      </AdminPanelSection>

      <AdminPanelSection title="Espacio y tamaño">
        {section.type !== "hero" ? (
          <Field label="Espacio vertical">
            <ChoiceChips
              value={s.spacing}
              onChange={(spacing) => patchStyle({ spacing })}
              options={[
                { id: "none", label: "Nada" },
                { id: "sm", label: "Poco" },
                { id: "md", label: "Medio" },
                { id: "lg", label: "Amplio" },
                { id: "xl", label: "Máximo" },
              ]}
              columns={5}
            />
          </Field>
        ) : null}
        <Field label="Ancho del contenido">
          <ChoiceChips
            value={s.width}
            onChange={(width) => patchStyle({ width })}
            options={[
              { id: "narrow", label: "Angosto" },
              { id: "normal", label: "Normal" },
              { id: "wide", label: "Ancho" },
            ]}
            columns={3}
          />
        </Field>
        <div className="grid gap-3">
          <Field label="Alineación">
            <ChoiceChips
              value={s.align}
              onChange={(align) => patchStyle({ align })}
              options={[
                { id: "left", label: "Izquierda" },
                { id: "center", label: "Centro" },
              ]}
              columns={2}
            />
          </Field>
          <Field label="Tamaño de texto">
            <ChoiceChips
              value={s.textSize}
              onChange={(textSize) => patchStyle({ textSize })}
              options={[
                { id: "sm", label: "S" },
                { id: "md", label: "M" },
                { id: "lg", label: "L" },
              ]}
              columns={3}
            />
          </Field>
        </div>
        {usesColumns(section) ? (
          <Field label="Columnas (en pantallas grandes)">
            <ChoiceChips
              value={s.columns}
              onChange={(columns) => patchStyle({ columns })}
              options={[1, 2, 3, 4].map((n) => ({ id: n as 1 | 2 | 3 | 4, label: String(n) }))}
              columns={4}
            />
          </Field>
        ) : null}
      </AdminPanelSection>

      {usesSurface(section) || usesShadow(section) ? (
        <AdminPanelSection title="Tarjetas y sombras">
          {usesSurface(section) ? (
            <Field label="Superficie">
              <ChoiceChips
                value={s.surface}
                onChange={(surface) => patchStyle({ surface })}
                options={[
                  { id: "glass", label: "Cristal" },
                  { id: "solid", label: "Sólida" },
                  { id: "outline", label: "Contorno" },
                  { id: "plain", label: "Sutil" },
                ]}
                columns={4}
              />
            </Field>
          ) : null}
          <Field label="Sombra">
            <ChoiceChips
              value={s.shadow}
              onChange={(shadow) => patchStyle({ shadow })}
              options={[
                { id: "none", label: "Ninguna" },
                { id: "soft", label: "Suave" },
                { id: "strong", label: "Fuerte" },
                { id: "glow", label: "Brillo" },
              ]}
              columns={4}
            />
          </Field>
          <Field label="Esquinas">
            <ChoiceChips
              value={s.radius}
              onChange={(radius) => patchStyle({ radius })}
              options={[
                { id: "sm", label: "Rectas" },
                { id: "md", label: "Suaves" },
                { id: "lg", label: "Redondas" },
                { id: "xl", label: "Muy redondas" },
              ]}
              columns={4}
            />
          </Field>
        </AdminPanelSection>
      ) : null}

      <AdminPanelSection title="Color y movimiento">
        <ColorField label="Color de acento de la sección" value={s.accent} onChange={(accent) => patchStyle({ accent })} allowEmpty emptyLabel="El del tema" />
        <Field label="Animación al aparecer">
          <ChoiceChips
            value={s.animation}
            onChange={(animation) => patchStyle({ animation })}
            options={[
              { id: "none", label: "Ninguna" },
              { id: "fade", label: "Aparecer" },
              { id: "slide", label: "Deslizar" },
              { id: "scale", label: "Crecer" },
            ]}
            columns={4}
          />
        </Field>
      </AdminPanelSection>
    </>
  );
}

/* ───────────── Ajustes generales ───────────── */

export function GlobalSettingsEditor({
  content,
  onChange,
}: {
  content: IneditoLandingContent;
  onChange: (next: IneditoLandingContent) => void;
}) {
  const set = <K extends "theme" | "nav" | "footer" | "seo">(key: K, patch: Partial<IneditoLandingContent[K]>) =>
    onChange({ ...content, [key]: { ...content[key], ...patch } });

  return (
    <>
      <AdminPanelSection title="Colores">
        <div className="grid gap-3">
          <ColorField label="Acento (botones, brillos)" value={content.theme.accent} onChange={(accent) => set("theme", { accent })} />
          <ColorField label="Acento claro (palabras resaltadas)" value={content.theme.accentSoft} onChange={(accentSoft) => set("theme", { accentSoft })} />
          <ColorField label="Fondo de la página" value={content.theme.background} onChange={(background) => set("theme", { background })} />
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Tipografías">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Títulos">
            <Select value={content.theme.displayFont} onValueChange={(v) => set("theme", { displayFont: v as (typeof LANDING_FONTS)[number] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANDING_FONTS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Textos">
            <Select value={content.theme.bodyFont} onValueChange={(v) => set("theme", { bodyFont: v as (typeof LANDING_FONTS)[number] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANDING_FONTS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Menú superior">
        <SwitchRow label="Mostrar menú" checked={content.nav.show} onChange={(show) => set("nav", { show })} />
        {content.nav.show ? (
          <>
            <ImageField label="Logo del menú" value={content.nav.logo} onChange={(logo) => set("nav", { logo })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Botón del menú" value={content.nav.ctaLabel} onChange={(ctaLabel) => set("nav", { ctaLabel })} placeholder="Vacío = sin botón" maxLength={40} />
              <TextField label="Enlace del botón" value={content.nav.ctaHref} onChange={(ctaHref) => set("nav", { ctaHref })} placeholder="#aplicar" />
            </div>
            <SwitchRow
              label="Enlace “Ecosistema WCA”"
              description="Lleva a la página principal."
              checked={content.nav.showHomeLink}
              onChange={(showHomeLink) => set("nav", { showHomeLink })}
            />
            <p className="text-[11px] text-muted-foreground">
              Las secciones aparecen en el menú si tienen “Nombre en el menú” y ancla.
            </p>
          </>
        ) : null}
      </AdminPanelSection>

      <AdminPanelSection title="Pie de página">
        <SwitchRow label="Mostrar pie de página" checked={content.footer.show} onChange={(show) => set("footer", { show })} />
        {content.footer.show ? (
          <>
            <ImageField label="Logo" value={content.footer.logo} onChange={(logo) => set("footer", { logo })} />
            <TextField label="Texto" value={content.footer.text} onChange={(text) => set("footer", { text })} multiline />
          </>
        ) : null}
      </AdminPanelSection>

      <AdminPanelSection title="Al compartir el enlace (SEO)">
        <TextField label="Título de la pestaña" value={content.seo.title} onChange={(title) => set("seo", { title })} maxLength={120} />
        <TextField label="Descripción" value={content.seo.description} onChange={(description) => set("seo", { description })} multiline maxLength={300} />
        <ImageField label="Imagen al compartir" value={content.seo.image} onChange={(image) => set("seo", { image })} hint="Se ve en WhatsApp, Facebook, etc." />
      </AdminPanelSection>
    </>
  );
}
