import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Flag,
  GripVertical,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  IntegrationTheme,
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
  const allFields = useMemo(
    () =>
      value.sections.flatMap((section, sectionIndex) =>
        section.fields.map((field, fieldIndex) => ({ field, sectionIndex, fieldIndex })),
      ),
    [value.sections],
  );

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
    <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-2xl border bg-card p-4 xl:sticky xl:top-24">
        <NavButton active={selection.kind === "settings"} onClick={() => setSelection({ kind: "settings" })}>
          <Settings2 className="h-4 w-4" />
          Configuración y apariencia
        </NavButton>
        <NavButton active={selection.kind === "welcome"} onClick={() => setSelection({ kind: "welcome" })}>
          <Sparkles className="h-4 w-4" />
          Pantalla de bienvenida
        </NavButton>
        <NavButton active={selection.kind === "ending"} onClick={() => setSelection({ kind: "ending" })}>
          <Flag className="h-4 w-4" />
          Pantalla final
        </NavButton>
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secciones</p>
          <Button size="sm" variant="ghost" onClick={addSection}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {value.sections.map((section, sectionIndex) => (
            <div
              key={section.id}
              className={cn("rounded-xl border", dropHint === `section-${sectionIndex}` && "border-[#5b8fd4] bg-[#5b8fd4]/10")}
              onDragOver={(e) => {
                e.preventDefault();
                setDropHint(`section-${sectionIndex}`);
              }}
              onDrop={(e) => {
                e.preventDefault();
                applyDrop({ sectionIndex, fieldIndex: section.fields.length });
              }}
            >
              <div className="flex items-center gap-1 p-1">
                <button type="button" className="p-1 text-muted-foreground" onClick={() => update({ sections: moveItem(value.sections, sectionIndex, sectionIndex - 1) })}>
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" className="p-1 text-muted-foreground" onClick={() => update({ sections: moveItem(value.sections, sectionIndex, sectionIndex + 1) })}>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelection({ kind: "section", sectionIndex })}
                  className={cn(
                    "flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm font-medium",
                    selection.kind === "section" && selection.sectionIndex === sectionIndex && "bg-[#5b8fd4]/15 text-[#5b8fd4]",
                  )}
                >
                  {section.title || "Sin título"}
                </button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => addField(sectionIndex)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1 px-2 pb-2">
                {section.fields.map((field, fieldIndex) => (
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
                      "flex cursor-grab items-center gap-1 active:cursor-grabbing",
                      dropHint === `field-${sectionIndex}-${fieldIndex}` && "rounded-lg ring-1 ring-[#5b8fd4]",
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "field", sectionIndex, fieldIndex })}
                      className={cn(
                        "flex-1 truncate rounded-lg px-2 py-1 text-left text-xs",
                        selection.kind === "field" &&
                          selection.sectionIndex === sectionIndex &&
                          selection.fieldIndex === fieldIndex &&
                          "bg-[#5b8fd4]/15 text-[#5b8fd4]",
                      )}
                    >
                      {field.label}
                    </button>
                    <button type="button" className="p-1 text-muted-foreground" onClick={() => updateSection(sectionIndex, { fields: moveItem(section.fields, fieldIndex, fieldIndex - 1) })}>
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button type="button" className="p-1 text-muted-foreground" onClick={() => updateSection(sectionIndex, { fields: moveItem(section.fields, fieldIndex, fieldIndex + 1) })}>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {section.fields.length === 0 && (
                  <p className="px-2 pb-1 text-[11px] text-muted-foreground">Suelta aquí una pregunta</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="h-fit rounded-2xl border bg-card p-5">
        {selection.kind === "settings" && (
          <AppearanceEditor theme={value.theme} onChange={updateTheme} />
        )}

        {selection.kind === "welcome" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Pantalla de bienvenida</h2>
              <Field label="Título" value={value.title} onChange={(title) => update({ title })} />
              <Field label="Subtítulo" value={value.subtitle} onChange={(subtitle) => update({ subtitle })} />
            </div>
            <div className="space-y-4">
              <Area label="Descripción" value={value.description} onChange={(description) => update({ description })} />
              <Area label="Llamado a la acción" value={value.cta} onChange={(cta) => update({ cta })} />
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
            allFields={allFields.map((item) => item.field)}
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
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-semibold">Apariencia</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige un estilo de marca WCA. Si agregas una imagen, puedes recortarla, fijarla o alinear su posición.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {APPEARANCE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange({ background: item.id })}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              preset === item.id ? "border-[#5b8fd4] bg-[#5b8fd4]/10" : "hover:bg-muted",
            )}
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
        <Field
          label="URL o ruta de la imagen (opcional)"
          value={theme?.backgroundImage ?? ""}
          onChange={(backgroundImage) => onChange({ backgroundImage })}
        />
        <div>
          <Label>Encaje</Label>
          <Select value={theme?.imageFit ?? "cover"} onValueChange={(imageFit) => onChange({ imageFit: imageFit as IntegrationImageFit })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cubrir (cover)</SelectItem>
              <SelectItem value="contain">Contener (contain)</SelectItem>
              <SelectItem value="auto">Tamaño original</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Posición</Label>
          <Select value={theme?.imagePosition ?? "center"} onValueChange={(imagePosition) => onChange({ imagePosition: imagePosition as IntegrationImagePosition })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
        <div>
          <Label>Anclaje</Label>
          <Select value={theme?.imageAttachment ?? "fixed"} onValueChange={(imageAttachment) => onChange({ imageAttachment: imageAttachment as IntegrationImageAttachment })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fijo (no se mueve al hacer scroll)</SelectItem>
              <SelectItem value="scroll">Se mueve con el contenido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Repetición</Label>
          <Select value={theme?.imageRepeat ?? "no-repeat"} onValueChange={(imageRepeat) => onChange({ imageRepeat: imageRepeat as IntegrationImageRepeat })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no-repeat">Sin repetir</SelectItem>
              <SelectItem value="repeat">Repetir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Opacidad de la imagen ({theme?.imageOpacity ?? 14}%)</Label>
          <Input
            className="mt-1"
            type="range"
            min={0}
            max={80}
            value={theme?.imageOpacity ?? 14}
            onChange={(e) => onChange({ imageOpacity: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Velo oscuro ({theme?.overlayOpacity ?? 0}%)</Label>
          <Input
            className="mt-1"
            type="range"
            min={0}
            max={80}
            value={theme?.overlayOpacity ?? 0}
            onChange={(e) => onChange({ overlayOpacity: Number(e.target.value) })}
          />
        </div>
        <p className="text-xs text-muted-foreground md:col-span-2">
          Sube el archivo a <code>client/public/</code> (por ejemplo <code>/logo-wca.png</code>) o pega una URL https.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea className="mt-1 min-h-[90px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
  onDelete,
  onAddField,
}: {
  section: IntegrationSection;
  onChange: (patch: Partial<IntegrationSection>) => void;
  onDelete: () => void;
  onAddField: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold">Sección</h2>
          <Button variant="outline" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
        <Field label="Título de la sección" value={section.title} onChange={(title) => onChange({ title })} />
        <Field label="Subtítulo" value={section.subtitle ?? ""} onChange={(subtitle) => onChange({ subtitle })} />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Pantalla de bienvenida</p>
            <p className="text-xs text-muted-foreground">Sin preguntas; solo título e Iniciar.</p>
          </div>
          <Switch checked={Boolean(section.isWelcome)} onCheckedChange={(isWelcome) => onChange({ isWelcome })} />
        </div>
        <Button onClick={onAddField}>
          <Plus className="h-4 w-4" />
          Agregar pregunta
        </Button>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  sectionIndex,
  sections,
  allFields,
  onChange,
  onMove,
  onDelete,
}: {
  field: IntegrationField;
  sectionIndex: number;
  sections: IntegrationSection[];
  allFields: IntegrationField[];
  onChange: (patch: Partial<IntegrationField>) => void;
  onMove: (sectionIndex: number) => void;
  onDelete: () => void;
}) {
  const isChoice = field.type === "single_choice" || field.type === "multiple_choice";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold">Pregunta</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(sectionIndex)} onValueChange={(next) => onMove(Number(next))}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Mover a sección" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section, index) => (
                <SelectItem key={section.id} value={String(index)}>
                  Mover a: {section.title || "Sin título"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
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
          <div>
            <Label>Mostrar solo si esta pregunta</Label>
            <Select
              value={field.showIf?.field ?? "siempre"}
              onValueChange={(next) =>
                onChange({ showIf: next === "siempre" ? undefined : { field: next, equals: field.showIf?.equals ?? "" } })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="siempre">Siempre visible</SelectItem>
                {allFields
                  .filter((item) => item.id !== field.id)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {field.showIf?.field && (
            <Field
              label="Vale exactamente"
              value={field.showIf.equals ?? ""}
              onChange={(equals) => onChange({ showIf: { field: field.showIf!.field, equals } })}
            />
          )}
        </div>
      </div>

      {isChoice && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Opciones</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  options: [...(field.options ?? []), { value: newFieldId("opcion"), label: "Nueva opción" }],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Agregar opción
            </Button>
          </div>
          {(field.options ?? []).map((option, index) => (
            <div key={option.value} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_120px_auto]">
              <Input
                value={option.label}
                onChange={(e) => {
                  const options = (field.options ?? []).map((item, i) => (i === index ? { ...item, label: e.target.value } : item));
                  onChange({ options });
                }}
                placeholder="Texto de la opción"
              />
              <Input
                value={option.acronym ?? ""}
                onChange={(e) => {
                  const options = (field.options ?? []).map((item, i) => (i === index ? { ...item, acronym: e.target.value } : item));
                  onChange({ options });
                }}
                placeholder="Sigla"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onChange({ options: (field.options ?? []).filter((_, i) => i !== index) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Textarea
                className="md:col-span-3"
                value={option.description ?? ""}
                onChange={(e) => {
                  const options = (field.options ?? []).map((item, i) => (i === index ? { ...item, description: e.target.value } : item));
                  onChange({ options });
                }}
                placeholder="Descripción visual (emojis permitidos)"
              />
            </div>
          ))}
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
