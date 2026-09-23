import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Flag,
  GitBranch,
  GripVertical,
  Link2,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ImageUrlInput } from "@/components/media/image-url-input";
import {
  APPEARANCE_PRESETS,
  FIELD_TYPE_LABELS,
  IntegrationField,
  IntegrationFieldType,
  IntegrationFormDefinition,
  IntegrationImageAttachment,
  IntegrationImageFit,
  IntegrationImagePosition,
  IntegrationImageRepeat,
  IntegrationSection,
  IntegrationShowIf,
  IntegrationTheme,
  WCA_LOGO_URL,
  newFieldId,
} from "@shared/integration-form";

type Selection =
  | { kind: "settings" }
  | { kind: "welcome" }
  | { kind: "ending" }
  | { kind: "section"; sectionIndex: number }
  | { kind: "field"; sectionIndex: number; fieldIndex: number };

type DragPayload = { sectionIndex: number; fieldIndex: number };

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function moveField(
  sections: IntegrationSection[],
  from: DragPayload,
  to: { sectionIndex: number; fieldIndex: number },
): IntegrationSection[] {
  if (from.sectionIndex === to.sectionIndex && from.fieldIndex === to.fieldIndex) return sections;
  const next = sections.map((section) => ({ ...section, fields: [...section.fields] }));
  const [item] = next[from.sectionIndex].fields.splice(from.fieldIndex, 1);
  if (!item) return sections;
  let dest = to.fieldIndex;
  if (from.sectionIndex === to.sectionIndex && from.fieldIndex < to.fieldIndex) dest -= 1;
  dest = Math.max(0, Math.min(dest, next[to.sectionIndex].fields.length));
  next[to.sectionIndex].fields.splice(dest, 0, item);
  return next;
}

function findFieldById(sections: IntegrationSection[], id: string): IntegrationField | undefined {
  for (const section of sections) {
    const found = section.fields.find((f) => f.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Condición efectiva de una sección (explícita o compartida por todos sus campos). */
function getSectionCondition(section: IntegrationSection): IntegrationShowIf | undefined {
  if (section.showIf?.field) return section.showIf;
  if (section.fields.length === 0) return undefined;
  const first = section.fields[0]?.showIf;
  if (!first?.field) return undefined;
  const same = section.fields.every(
    (f) =>
      f.showIf?.field === first.field &&
      (f.showIf.equals ?? "") === (first.equals ?? "") &&
      (f.showIf.includes ?? "") === (first.includes ?? ""),
  );
  return same ? first : undefined;
}

function formatCondition(
  showIf: IntegrationShowIf | undefined,
  sections: IntegrationSection[],
): string | null {
  if (!showIf?.field) return null;
  const trigger = findFieldById(sections, showIf.field);
  const triggerLabel = trigger?.label || showIf.field;
  const raw = showIf.equals ?? showIf.includes ?? "";
  const opt = trigger?.options?.find((o) => o.value === raw);
  const valueLabel = opt?.label || raw || "…";
  return `Si «${triggerLabel}» = ${valueLabel}`;
}

function slugifyOptionValue(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || newFieldId("opcion");
}

export function IntegrationFormBuilder({
  value,
  onChange,
}: {
  value: IntegrationFormDefinition;
  onChange: (next: IntegrationFormDefinition) => void;
}) {
  const [selection, setSelection] = useState<Selection>({ kind: "settings" });
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropHint, setDropHint] = useState<string | null>(null);

  const update = (patch: Partial<IntegrationFormDefinition>) => onChange({ ...value, ...patch });
  const updateTheme = (patch: Partial<IntegrationTheme>) =>
    onChange({ ...value, theme: { ...value.theme, ...patch } });

  const updateSection = (index: number, patch: Partial<IntegrationSection>) => {
    const sections = value.sections.map((section, i) => (i === index ? { ...section, ...patch } : section));
    onChange({ ...value, sections });
  };

  const updateField = (sectionIndex: number, fieldIndex: number, patch: Partial<IntegrationField>) => {
    const sections = value.sections.map((section, i) => {
      if (i !== sectionIndex) return section;
      return {
        ...section,
        fields: section.fields.map((field, j) => (j === fieldIndex ? { ...field, ...patch } : field)),
      };
    });
    onChange({ ...value, sections });
  };

  const addSection = () => {
    const section: IntegrationSection = {
      id: newFieldId("seccion"),
      title: "Nueva sección",
      subtitle: "",
      fields: [],
    };
    onChange({ ...value, sections: [...value.sections, section] });
    setSelection({ kind: "section", sectionIndex: value.sections.length });
  };

  const addField = (sectionIndex: number, type: IntegrationFieldType = "short_text") => {
    const field: IntegrationField = {
      id: newFieldId(),
      type,
      label: "Nueva pregunta",
      required: true,
      options: type.includes("choice") ? [{ value: "opcion-1", label: "Opción 1" }] : undefined,
    };
    const sections = value.sections.map((section, i) =>
      i === sectionIndex ? { ...section, fields: [...section.fields, field] } : section,
    );
    onChange({ ...value, sections });
    setSelection({ kind: "field", sectionIndex, fieldIndex: sections[sectionIndex].fields.length - 1 });
  };

  const applyDrop = (to: { sectionIndex: number; fieldIndex: number }) => {
    if (!dragging) return;
    const from = dragging;
    let dest = to.fieldIndex;
    if (from.sectionIndex === to.sectionIndex && from.fieldIndex < to.fieldIndex) dest -= 1;
    dest = Math.max(0, dest);
    const sections = moveField(value.sections, from, to);
    dest = Math.min(dest, sections[to.sectionIndex].fields.length - 1);
    onChange({ ...value, sections });
    setSelection({ kind: "field", sectionIndex: to.sectionIndex, fieldIndex: Math.max(0, dest) });
    setDragging(null);
    setDropHint(null);
  };

  return (
    <div className="grid w-full min-w-0 max-w-full items-start gap-4 overflow-x-hidden sm:gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside className="min-w-0 max-w-full space-y-3 overflow-hidden rounded-2xl border bg-card p-3 sm:p-4 xl:sticky xl:top-24">
        <NavButton active={selection.kind === "settings"} onClick={() => setSelection({ kind: "settings" })}>
          <Settings2 className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Configuración y apariencia</span>
        </NavButton>
        <NavButton active={selection.kind === "welcome"} onClick={() => setSelection({ kind: "welcome" })}>
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Pantalla de bienvenida</span>
        </NavButton>
        <NavButton active={selection.kind === "ending"} onClick={() => setSelection({ kind: "ending" })}>
          <Flag className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Pantalla final</span>
        </NavButton>
        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secciones</p>
          <Button size="sm" variant="ghost" className="shrink-0" onClick={addSection}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Las ramas (qué sección aparece según una respuesta) se configuran en cada sección o pregunta.
        </p>
        <div className="min-w-0 space-y-2">
          {value.sections.map((section, sectionIndex) => {
            if (section.isWelcome) return null;
            const sectionCond = formatCondition(getSectionCondition(section), value.sections);
            return (
            <div
              key={section.id}
              className={cn(
                "min-w-0 overflow-hidden rounded-xl border",
                dropHint === `section-${sectionIndex}` && "border-[#5b8fd4] bg-[#5b8fd4]/10",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDropHint(`section-${sectionIndex}`);
              }}
              onDrop={(e) => {
                e.preventDefault();
                applyDrop({ sectionIndex, fieldIndex: section.fields.length });
              }}
            >
              <div className="flex min-w-0 items-center gap-0.5 p-1">
                <button type="button" className="shrink-0 p-1 text-muted-foreground" onClick={() => update({ sections: moveItem(value.sections, sectionIndex, sectionIndex - 1) })}>
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" className="shrink-0 p-1 text-muted-foreground" onClick={() => update({ sections: moveItem(value.sections, sectionIndex, sectionIndex + 1) })}>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelection({ kind: "section", sectionIndex })}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm font-medium",
                    selection.kind === "section" && selection.sectionIndex === sectionIndex && "bg-[#5b8fd4]/15 text-[#5b8fd4]",
                  )}
                >
                  {section.title || "Sin título"}
                </button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => addField(sectionIndex)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {sectionCond && (
                <p className="flex items-start gap-1 px-2 pb-1 text-[10px] leading-snug text-[#5b8fd4]">
                  <GitBranch className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="min-w-0">{sectionCond}</span>
                </p>
              )}
              <div className="min-w-0 space-y-1 px-2 pb-2">
                {section.fields.map((field, fieldIndex) => {
                  const fieldCond = formatCondition(field.showIf, value.sections);
                  return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => setDragging({ sectionIndex, fieldIndex })}
                    onDragEnd={() => {
                      setDragging(null);
                      setDropHint(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropHint(`field-${sectionIndex}-${fieldIndex}`);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      applyDrop({ sectionIndex, fieldIndex });
                    }}
                    className={cn(
                      "flex min-w-0 cursor-grab items-center gap-1 active:cursor-grabbing",
                      dropHint === `field-${sectionIndex}-${fieldIndex}` && "rounded-lg ring-1 ring-[#5b8fd4]",
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "field", sectionIndex, fieldIndex })}
                      className={cn(
                        "min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-left text-xs",
                        selection.kind === "field" &&
                          selection.sectionIndex === sectionIndex &&
                          selection.fieldIndex === fieldIndex &&
                          "bg-[#5b8fd4]/15 text-[#5b8fd4]",
                      )}
                      title={fieldCond || field.label}
                    >
                      <span className="flex items-center gap-1 truncate">
                        {fieldCond && <Link2 className="h-3 w-3 shrink-0 opacity-70" />}
                        <span className="truncate">{field.label}</span>
                      </span>
                    </button>
                    <button type="button" className="shrink-0 p-1 text-muted-foreground" onClick={() => updateSection(sectionIndex, { fields: moveItem(section.fields, fieldIndex, fieldIndex - 1) })}>
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button type="button" className="shrink-0 p-1 text-muted-foreground" onClick={() => updateSection(sectionIndex, { fields: moveItem(section.fields, fieldIndex, fieldIndex + 1) })}>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  );
                })}
                {section.fields.length === 0 && (
                  <p className="px-2 pb-1 text-[11px] text-muted-foreground">Suelta aquí una pregunta</p>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </aside>

      <section className="h-fit min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card p-4 sm:p-5">
        {selection.kind === "settings" && (
          <AppearanceEditor theme={value.theme} onChange={updateTheme} />
        )}

        {selection.kind === "welcome" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">Pantalla de bienvenida</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Este es el único lugar para editar el inicio del formulario (título, texto e Iniciar).
                Ya no hace falta marcar una sección como bienvenida.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <Field label="Título" value={value.title} onChange={(title) => update({ title })} />
                <Field label="Subtítulo" value={value.subtitle} onChange={(subtitle) => update({ subtitle })} />
              </div>
              <div className="space-y-4">
                <Area label="Descripción" value={value.description} onChange={(description) => update({ description })} />
                <Area label="Llamado a la acción" value={value.cta} onChange={(cta) => update({ cta })} />
              </div>
            </div>
          </div>
        )}

        {selection.kind === "ending" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Pantalla final</h2>
              <Field label="Título" value={value.ending.title} onChange={(title) => update({ ending: { ...value.ending, title } })} />
            </div>
            <Area label="Mensaje" value={value.ending.message} onChange={(message) => update({ ending: { ...value.ending, message } })} />
          </div>
        )}

        {selection.kind === "section" && value.sections[selection.sectionIndex] && (
          <SectionEditor
            section={value.sections[selection.sectionIndex]}
            sections={value.sections}
            onChange={(patch) => updateSection(selection.sectionIndex, patch)}
            onDelete={() => {
              onChange({ ...value, sections: value.sections.filter((_, i) => i !== selection.sectionIndex) });
              setSelection({ kind: "settings" });
            }}
            onAddField={() => addField(selection.sectionIndex)}
          />
        )}

        {selection.kind === "field" && value.sections[selection.sectionIndex]?.fields[selection.fieldIndex] && (
          <FieldEditor
            field={value.sections[selection.sectionIndex].fields[selection.fieldIndex]}
            sectionIndex={selection.sectionIndex}
            sections={value.sections}
            onChange={(patch) => updateField(selection.sectionIndex, selection.fieldIndex, patch)}
            onMove={(targetSection) => {
              const from = { sectionIndex: selection.sectionIndex, fieldIndex: selection.fieldIndex };
              const destIndex = value.sections[targetSection].fields.length;
              const sections = moveField(value.sections, from, { sectionIndex: targetSection, fieldIndex: destIndex });
              onChange({ ...value, sections });
              setSelection({ kind: "field", sectionIndex: targetSection, fieldIndex: sections[targetSection].fields.length - 1 });
            }}
            onDelete={() => {
              updateSection(selection.sectionIndex, {
                fields: value.sections[selection.sectionIndex].fields.filter((_, i) => i !== selection.fieldIndex),
              });
              setSelection({ kind: "section", sectionIndex: selection.sectionIndex });
            }}
          />
        )}
      </section>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
        active ? "bg-[#5b8fd4]/15 text-[#5b8fd4]" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function AppearanceEditor({
  theme,
  onChange,
}: {
  theme?: IntegrationTheme;
  onChange: (patch: Partial<IntegrationTheme>) => void;
}) {
  const preset = theme?.background ?? "aurora";
  const isCustom = preset === "custom";
  const imagePath = theme?.backgroundImage?.trim() ?? "";
  const imageFieldValue =
    !imagePath || imagePath === "/logo-wca.png" || imagePath === WCA_LOGO_URL ? "" : imagePath;

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-hidden">
      <div className="min-w-0">
        <h2 className="font-heading text-xl font-semibold">Apariencia</h2>
        <p className="mt-1 break-words text-sm text-muted-foreground">
          Elige un estilo de marca WCA. El color base siempre se puede ajustar; las opciones de imagen
          solo aparecen con «Imagen propia».
        </p>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {APPEARANCE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange({ background: item.id })}
            className={cn(
              "min-w-0 rounded-xl border p-3 text-left transition",
              preset === item.id ? "border-[#5b8fd4] bg-[#5b8fd4]/10" : "hover:bg-muted",
            )}
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{item.hint}</p>
          </button>
        ))}
      </div>

      <div className={cn("grid min-w-0 gap-4 overflow-hidden rounded-xl border p-3 sm:p-4", "md:grid-cols-2")}>
        <div className="min-w-0">
          <Label>Color de fondo</Label>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <input
              type="color"
              aria-label="Color de fondo"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
              value={/^#[0-9a-fA-F]{6}$/.test(theme?.backgroundColor ?? "") ? theme!.backgroundColor! : "#0b1220"}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
            />
            <Input
              className="min-w-0 flex-1"
              value={theme?.backgroundColor ?? "#0b1220"}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              placeholder="#0b1220"
            />
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            Color base del formulario. Luces y efectos del tema se mantienen encima.
          </p>
        </div>

        <div className="min-w-0">
          <Label>Velo oscuro ({theme?.overlayOpacity ?? 0}%)</Label>
          <Slider
            className="mt-4 w-full max-w-full"
            min={0}
            max={100}
            step={1}
            value={[theme?.overlayOpacity ?? 0]}
            onValueChange={([value]) => onChange({ overlayOpacity: value ?? 0 })}
          />
          <p className="mt-1 break-words text-xs text-muted-foreground">
            Oscurece un poco el fondo para mejorar el contraste del texto.
          </p>
        </div>

        {isCustom && (
          <>
            <div className="min-w-0">
              <Field
                label="URL o ruta de la imagen"
                value={imageFieldValue}
                onChange={(backgroundImage) => onChange({ backgroundImage: backgroundImage.trim() })}
              />
            </div>
            <div className="min-w-0">
              <Label>Encaje</Label>
              <Select value={theme?.imageFit ?? "cover"} onValueChange={(imageFit) => onChange({ imageFit: imageFit as IntegrationImageFit })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cubrir (cover)</SelectItem>
                  <SelectItem value="contain">Contener (contain)</SelectItem>
                  <SelectItem value="auto">Tamaño original</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Posición</Label>
              <Select value={theme?.imagePosition ?? "center"} onValueChange={(imagePosition) => onChange({ imagePosition: imagePosition as IntegrationImagePosition })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="top">Arriba</SelectItem>
                  <SelectItem value="bottom">Abajo</SelectItem>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                  <SelectItem value="top left">Arriba izquierda</SelectItem>
                  <SelectItem value="top right">Arriba derecha</SelectItem>
                  <SelectItem value="bottom left">Abajo izquierda</SelectItem>
                  <SelectItem value="bottom right">Abajo derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Anclaje</Label>
              <Select value={theme?.imageAttachment ?? "fixed"} onValueChange={(imageAttachment) => onChange({ imageAttachment: imageAttachment as IntegrationImageAttachment })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fijo (no se mueve al hacer scroll)</SelectItem>
                  <SelectItem value="scroll">Se mueve con el contenido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Repetición</Label>
              <Select value={theme?.imageRepeat ?? "no-repeat"} onValueChange={(imageRepeat) => onChange({ imageRepeat: imageRepeat as IntegrationImageRepeat })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-repeat">Sin repetir</SelectItem>
                  <SelectItem value="repeat">Repetir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Opacidad de la imagen ({theme?.imageOpacity ?? 28}%)</Label>
              <Slider
                className="mt-4 w-full max-w-full"
                min={0}
                max={100}
                step={1}
                value={[theme?.imageOpacity ?? 28]}
                onValueChange={([value]) => onChange({ imageOpacity: value ?? 0 })}
              />
            </div>
            <p className="break-words text-xs text-muted-foreground md:col-span-2">
              Sube el archivo a <code>client/public/</code> (por ejemplo <code>/fondo-integracion.jpg</code>) o pega una URL https.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const isImage = /imagen|foto|logo|image/i.test(label);
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      {isImage ? (
        <div className="mt-1">
          <ImageUrlInput value={value} onChange={onChange} />
        </div>
      ) : (
        <Input className="mt-1 min-w-0 max-w-full" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <Textarea className="mt-1 min-h-[90px] min-w-0 max-w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SectionEditor({
  section,
  sections,
  onChange,
  onDelete,
  onAddField,
}: {
  section: IntegrationSection;
  sections: IntegrationSection[];
  onChange: (patch: Partial<IntegrationSection>) => void;
  onDelete: () => void;
  onAddField: () => void;
}) {
  const condition = getSectionCondition(section);
  const triggerFields = sections
    .flatMap((s) => s.fields)
    .filter((f) => f.type === "single_choice" || f.type === "multiple_choice" || f.type === "checkbox");
  const trigger = condition?.field ? findFieldById(sections, condition.field) : undefined;
  const triggerOptions = trigger?.options ?? [];

  const setSectionBranch = (showIf: IntegrationShowIf | undefined) => {
    onChange({
      showIf,
      // Aplica la misma condición a todos los campos para mantener consistencia
      fields: section.fields.map((f) => ({
        ...f,
        showIf: showIf ? { ...showIf } : undefined,
      })),
    });
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Sección</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un paso del formulario. Si defines una rama abajo, todo el paso se salta cuando la condición no se cumple.
          </p>
        </div>
        <Button variant="outline" className="w-full shrink-0 sm:w-auto" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label="Título de la sección" value={section.title} onChange={(title) => onChange({ title })} />
        <Field label="Subtítulo" value={section.subtitle ?? ""} onChange={(subtitle) => onChange({ subtitle })} />
      </div>

      <div className="space-y-3 rounded-2xl border border-[#5b8fd4]/25 bg-[#5b8fd4]/5 p-4">
        <div className="flex items-start gap-2">
          <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8fd4]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">¿Cuándo aparece esta sección?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ejemplo (formulario de miembros): si «Tipo de solicitud» = Incorporación, se muestra
              «Detalle · Incorporación». Las otras ramas (Cobertura / Retiro) se saltan solas.
              Si agregas una 4.ª opción, crea otra sección y enlázala aquí a ese valor.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Depende de la pregunta</Label>
            <Select
              value={condition?.field ?? "siempre"}
              onValueChange={(next) => {
                if (next === "siempre") {
                  setSectionBranch(undefined);
                  return;
                }
                const src = findFieldById(sections, next);
                const firstOpt = src?.options?.[0]?.value ?? "";
                setSectionBranch(
                  src?.type === "multiple_choice"
                    ? { field: next, includes: firstOpt }
                    : { field: next, equals: firstOpt },
                );
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="siempre">Siempre (sin rama)</SelectItem>
                {triggerFields.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {condition?.field && (
            <div>
              <Label>
                {trigger?.type === "multiple_choice" ? "Cuando incluye la opción" : "Cuando eligen la opción"}
              </Label>
              {triggerOptions.length > 0 ? (
                <Select
                  value={condition.equals ?? condition.includes ?? ""}
                  onValueChange={(val) =>
                    setSectionBranch(
                      trigger?.type === "multiple_choice"
                        ? { field: condition.field, includes: val }
                        : { field: condition.field, equals: val },
                    )
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Elige una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1"
                  value={condition.equals ?? condition.includes ?? ""}
                  onChange={(e) =>
                    setSectionBranch({ field: condition.field, equals: e.target.value })
                  }
                  placeholder="Valor exacto de la respuesta"
                />
              )}
            </div>
          )}
        </div>

        {condition?.field && (
          <p className="rounded-lg bg-background/80 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Resumen: </span>
            {formatCondition(condition, sections) || "Configura la opción"}
            . Si no se cumple, esta sección no se muestra en el flujo.
          </p>
        )}
      </div>

      <Button className="w-full sm:w-auto" onClick={onAddField}>
        <Plus className="h-4 w-4" />
        Agregar pregunta
      </Button>
    </div>
  );
}

function FieldEditor({
  field,
  sectionIndex,
  sections,
  onChange,
  onMove,
  onDelete,
}: {
  field: IntegrationField;
  sectionIndex: number;
  sections: IntegrationSection[];
  onChange: (patch: Partial<IntegrationField>) => void;
  onMove: (sectionIndex: number) => void;
  onDelete: () => void;
}) {
  const isChoice = field.type === "single_choice" || field.type === "multiple_choice";
  const triggerCandidates = sections
    .flatMap((s) => s.fields)
    .filter((item) => item.id !== field.id);
  const trigger = field.showIf?.field ? findFieldById(sections, field.showIf.field) : undefined;
  const triggerIsChoice =
    trigger?.type === "single_choice" || trigger?.type === "multiple_choice" || trigger?.type === "checkbox";
  const triggerOptions = trigger?.options ?? [];

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-hidden">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="font-heading text-xl font-semibold">Pregunta</h2>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={String(sectionIndex)} onValueChange={(next) => onMove(Number(next))}>
            <SelectTrigger className="h-9 w-full min-w-0 sm:w-[220px]">
              <SelectValue placeholder="Mover a sección" />
            </SelectTrigger>
            <SelectContent>
              {sections
                .map((section, index) => ({ section, index }))
                .filter(({ section }) => !section.isWelcome)
                .map(({ section, index }) => (
                  <SelectItem key={section.id} value={String(index)}>
                    Mover a: {section.title || "Sin título"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full sm:w-auto" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Texto de la pregunta" value={field.label} onChange={(label) => onChange({ label })} />
          <div>
            <Label>Tipo</Label>
            <Select value={field.type} onValueChange={(type) => onChange({ type: type as IntegrationFieldType })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Area label="Descripción o ayuda (puedes usar emojis 💙)" value={field.description ?? ""} onChange={(description) => onChange({ description })} />
          <Field label="Placeholder" value={field.placeholder ?? ""} onChange={(placeholder) => onChange({ placeholder })} />
        </div>
        <div className="space-y-4">
          <div className="grid gap-3">
            <Toggle label="Obligatoria" checked={Boolean(field.required)} onChange={(required) => onChange({ required })} />
            <Toggle label="Única (sin duplicados)" checked={Boolean(field.unique)} onChange={(unique) => onChange({ unique })} />
            <Toggle label="Permitir «Otro»" checked={Boolean(field.allowOther)} onChange={(allowOther) => onChange({ allowOther })} />
          </div>
          {field.type === "number" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mínimo</Label>
                <Input className="mt-1" type="number" value={field.min ?? 0} onChange={(e) => onChange({ min: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Máximo</Label>
                <Input className="mt-1" type="number" value={field.max ?? 100} onChange={(e) => onChange({ max: Number(e.target.value) })} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[#5b8fd4]/25 bg-[#5b8fd4]/5 p-4">
        <div className="flex items-start gap-2">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8fd4]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">¿Cuándo se muestra esta pregunta?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Conexión: elige otra pregunta (normalmente de opción única) y el valor que debe
              responderse. Si no coincide, esta pregunta se oculta. Si toda una sección queda sin
              preguntas visibles, el formulario salta esa sección.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Mostrar solo si responden…</Label>
            <Select
              value={field.showIf?.field ?? "siempre"}
              onValueChange={(next) => {
                if (next === "siempre") {
                  onChange({ showIf: undefined });
                  return;
                }
                const src = findFieldById(sections, next);
                const firstOpt = src?.options?.[0]?.value ?? "";
                onChange({
                  showIf:
                    src?.type === "multiple_choice"
                      ? { field: next, includes: firstOpt }
                      : { field: next, equals: firstOpt || field.showIf?.equals || "" },
                });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="siempre">Siempre visible</SelectItem>
                {triggerCandidates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {field.showIf?.field && (
            <div>
              <Label>
                {trigger?.type === "multiple_choice"
                  ? "…y la respuesta incluye"
                  : triggerIsChoice
                    ? "…y eligen la opción"
                    : "…y el valor es exactamente"}
              </Label>
              {triggerOptions.length > 0 ? (
                <Select
                  value={field.showIf.equals ?? field.showIf.includes ?? ""}
                  onValueChange={(val) =>
                    onChange({
                      showIf:
                        trigger?.type === "multiple_choice"
                          ? { field: field.showIf!.field, includes: val }
                          : { field: field.showIf!.field, equals: val },
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Elige la opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : trigger?.type === "checkbox" ? (
                <Select
                  value={field.showIf.equals ?? "true"}
                  onValueChange={(val) => onChange({ showIf: { field: field.showIf!.field, equals: val } })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Marcada (sí)</SelectItem>
                    <SelectItem value="false">Sin marcar (no)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1"
                  value={field.showIf.equals ?? ""}
                  onChange={(e) => onChange({ showIf: { field: field.showIf!.field, equals: e.target.value } })}
                  placeholder="Escribe el valor exacto"
                />
              )}
            </div>
          )}
        </div>

        {field.showIf?.field && (
          <p className="rounded-lg bg-background/80 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Resumen: </span>
            {formatCondition(field.showIf, sections) || "Elige la opción para completar la conexión"}
          </p>
        )}
      </div>

      {isChoice && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label>Opciones de respuesta</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cada opción puede abrir una rama distinta. El «valor interno» se usa en las conexiones;
                el texto es lo que ve la persona.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                const label = "Nueva opción";
                onChange({
                  options: [
                    ...(field.options ?? []),
                    { value: slugifyOptionValue(label), label },
                  ],
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Agregar opción
            </Button>
          </div>
          {(field.options ?? []).map((option, index) => (
            <div key={`${option.value}-${index}`} className="grid min-w-0 gap-2 rounded-xl border p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_120px_auto]">
              <div className="min-w-0">
                <Label className="text-[11px] text-muted-foreground">Texto visible</Label>
                <Input
                  className="mt-1 min-w-0"
                  value={option.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const options = (field.options ?? []).map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            label,
                            // Solo auto-slug si el value parece generado / vacío
                            value:
                              !item.value || item.value.startsWith("opcion-")
                                ? slugifyOptionValue(label)
                                : item.value,
                          }
                        : item,
                    );
                    onChange({ options });
                  }}
                  placeholder="Ej. Incorporación de nuevo(s) miembro(s)"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-[11px] text-muted-foreground">Valor interno (conexiones)</Label>
                <Input
                  className="mt-1 min-w-0 font-mono text-xs"
                  value={option.value}
                  onChange={(e) => {
                    const options = (field.options ?? []).map((item, i) =>
                      i === index ? { ...item, value: e.target.value.trim() || item.value } : item,
                    );
                    onChange({ options });
                  }}
                  placeholder="incorporacion"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-[11px] text-muted-foreground">Sigla</Label>
                <Input
                  className="mt-1"
                  value={option.acronym ?? ""}
                  onChange={(e) => {
                    const options = (field.options ?? []).map((item, i) =>
                      i === index ? { ...item, acronym: e.target.value } : item,
                    );
                    onChange({ options });
                  }}
                  placeholder="Sigla"
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange({ options: (field.options ?? []).filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                className="md:col-span-4"
                value={option.description ?? ""}
                onChange={(e) => {
                  const options = (field.options ?? []).map((item, i) =>
                    i === index ? { ...item, description: e.target.value } : item,
                  );
                  onChange({ options });
                }}
                placeholder="Descripción visual (emojis permitidos)"
              />
            </div>
          ))}
          {(field.options?.length ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              Tip: para cada valor interno crea (o reutiliza) una sección y en «¿Cuándo aparece esta sección?»
              elige esta pregunta + esa opción. Así queda claro a qué rama manda cada respuesta.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
