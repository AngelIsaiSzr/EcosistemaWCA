import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Settings2,
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
  FIELD_TYPE_LABELS,
  IntegrationField,
  IntegrationFieldType,
  IntegrationFormDefinition,
  IntegrationSection,
  newFieldId,
} from "@shared/integration-form";

type Selection =
  | { kind: "settings" }
  | { kind: "ending" }
  | { kind: "section"; sectionIndex: number }
  | { kind: "field"; sectionIndex: number; fieldIndex: number };

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
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
  const allFields = useMemo(
    () => value.sections.flatMap((section, sectionIndex) => section.fields.map((field, fieldIndex) => ({ field, sectionIndex, fieldIndex }))),
    [value.sections],
  );

  const update = (patch: Partial<IntegrationFormDefinition>) => onChange({ ...value, ...patch });

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

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-2xl border bg-card p-4">
        <button
          type="button"
          onClick={() => setSelection({ kind: "settings" })}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
            selection.kind === "settings" ? "bg-[#5b8fd4]/15 text-[#5b8fd4]" : "hover:bg-muted",
          )}
        >
          <Settings2 className="h-4 w-4" />
          Configuración y apariencia
        </button>
        <button
          type="button"
          onClick={() => setSelection({ kind: "ending" })}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
            selection.kind === "ending" ? "bg-[#5b8fd4]/15 text-[#5b8fd4]" : "hover:bg-muted",
          )}
        >
          Pantalla final
        </button>
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secciones</p>
          <Button size="sm" variant="ghost" onClick={addSection}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {value.sections.map((section, sectionIndex) => (
            <div key={section.id} className="rounded-xl border">
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
                  <div key={field.id} className="flex items-center gap-1">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
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
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border bg-card p-6">
        {selection.kind === "settings" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Textos de bienvenida</h2>
              <Field label="Título" value={value.title} onChange={(title) => update({ title })} />
              <Field label="Subtítulo" value={value.subtitle} onChange={(subtitle) => update({ subtitle })} />
              <Area label="Descripción" value={value.description} onChange={(description) => update({ description })} />
              <Area label="Llamado a la acción" value={value.cta} onChange={(cta) => update({ cta })} />
            </div>
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Apariencia</h2>
              <p className="text-sm text-muted-foreground">
                Recomendamos el fondo aurora: luces azules de marca, retícula suave y el logo más pequeño. Se ve menos plano que un icono enorme al 7%.
              </p>
              <div>
                <Label>Estilo de fondo</Label>
                <Select
                  value={value.theme?.background ?? "aurora"}
                  onValueChange={(background) =>
                    update({
                      theme: {
                        ...value.theme,
                        background: background as "aurora" | "logo" | "custom",
                      },
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aurora">Aurora WCA (recomendado)</SelectItem>
                    <SelectItem value="logo">Logo como marca de agua</SelectItem>
                    <SelectItem value="custom">Imagen personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(value.theme?.background === "custom" || value.theme?.background === "logo") && (
                <Field
                  label="URL o ruta de la imagen"
                  value={value.theme?.backgroundImage ?? "/logo-wca.png"}
                  onChange={(backgroundImage) => update({ theme: { ...value.theme, background: value.theme?.background ?? "custom", backgroundImage } })}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Para una imagen propia, súbela a <code>client/public/</code> (por ejemplo <code>/logo-wca.png</code>) o pega una URL https.
              </p>
            </div>
          </div>
        )}

        {selection.kind === "ending" && (
          <div className="max-w-xl space-y-4">
            <h2 className="font-heading text-xl font-semibold">Pantalla final</h2>
            <Field label="Título" value={value.ending.title} onChange={(title) => update({ ending: { ...value.ending, title } })} />
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
            allFields={allFields.map((item) => item.field)}
            onChange={(patch) => updateField(selection.sectionIndex, selection.fieldIndex, patch)}
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
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Sección</h2>
        <Button variant="outline" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Eliminar sección
        </Button>
      </div>
      <Field label="Título de la sección" value={section.title} onChange={(title) => onChange({ title })} />
      <Field label="Subtítulo" value={section.subtitle ?? ""} onChange={(subtitle) => onChange({ subtitle })} />
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
  );
}

function FieldEditor({
  field,
  allFields,
  onChange,
  onDelete,
}: {
  field: IntegrationField;
  allFields: IntegrationField[];
  onChange: (patch: Partial<IntegrationField>) => void;
  onDelete: () => void;
}) {
  const isChoice = field.type === "single_choice" || field.type === "multiple_choice";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Pregunta</h2>
        <Button variant="outline" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
      <Area label="Descripción o ayuda (puedes usar emojis 💙)" value={field.description ?? ""} onChange={(description) => onChange({ description })} />
      <Field label="Placeholder" value={field.placeholder ?? ""} onChange={(placeholder) => onChange({ placeholder })} />
      <div className="grid gap-3 sm:grid-cols-3">
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
      <div className="grid gap-3 md:grid-cols-2">
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
