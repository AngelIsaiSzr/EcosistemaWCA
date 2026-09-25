import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPE_LABELS,
  createEmptyField,
  isDisplayOnlyField,
  newFieldId,
  slugify,
  type IntegrationChoice,
  type IntegrationField,
  type IntegrationFieldType,
  type IntegrationFormDefinition,
  type IntegrationSection,
} from "@shared/integration-form";
import type { BuilderSelection } from "./form-builder-canvas";

function optionValue(label: string): string {
  return slugify(label) || newFieldId("opcion");
}

const OPTION_TYPES: IntegrationFieldType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
  "yes_no",
];

export function FormBuilderFieldSettings({
  definition,
  selection,
  onClose,
  onUpdateDefinition,
  onUpdateSection,
  onUpdateField,
}: {
  definition: IntegrationFormDefinition;
  selection: BuilderSelection;
  onClose: () => void;
  onUpdateDefinition: (patch: Partial<IntegrationFormDefinition>) => void;
  onUpdateSection: (sectionIndex: number, patch: Partial<IntegrationSection>) => void;
  onUpdateField: (
    sectionIndex: number,
    fieldIndex: number,
    patch: Partial<IntegrationField>,
  ) => void;
}) {
  const section =
    selection.kind === "section" || selection.kind === "field"
      ? definition.sections[selection.sectionIndex]
      : undefined;
  const field =
    selection.kind === "field" ? section?.fields[selection.fieldIndex] : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold">Campos</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {selection.kind === "welcome" && "Pantalla de bienvenida"}
            {selection.kind === "ending" && "Pantalla final"}
            {selection.kind === "section" && (section?.title || "Sección")}
            {selection.kind === "field" && (field?.label || "Pregunta")}
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {selection.kind === "welcome" && (
          <>
            <TextRow
              label="Título"
              value={definition.title}
              onChange={(title) => onUpdateDefinition({ title })}
            />
            <TextRow
              label="Subtítulo"
              value={definition.subtitle}
              onChange={(subtitle) => onUpdateDefinition({ subtitle })}
            />
            <AreaRow
              label="Descripción"
              value={definition.description}
              onChange={(description) => onUpdateDefinition({ description })}
            />
            <AreaRow
              label="Llamado a la acción"
              value={definition.cta}
              onChange={(cta) => onUpdateDefinition({ cta })}
            />
          </>
        )}

        {selection.kind === "ending" && (
          <>
            <TextRow
              label="Título"
              value={definition.ending.title}
              onChange={(title) => onUpdateDefinition({ ending: { ...definition.ending, title } })}
            />
            <AreaRow
              label="Mensaje"
              value={definition.ending.message}
              onChange={(message) =>
                onUpdateDefinition({ ending: { ...definition.ending, message } })
              }
            />
          </>
        )}

        {selection.kind === "section" && section && (
          <>
            <TextRow
              label="Título de la sección"
              value={section.title}
              onChange={(title) => onUpdateSection(selection.sectionIndex, { title })}
            />
            <TextRow
              label="Subtítulo"
              value={section.subtitle ?? ""}
              onChange={(subtitle) => onUpdateSection(selection.sectionIndex, { subtitle })}
            />
          </>
        )}

        {selection.kind === "field" && field && (
          <FieldSettings
            field={field}
            onUpdate={(patch) => onUpdateField(selection.sectionIndex, selection.fieldIndex, patch)}
          />
        )}

        {selection.kind === "field" && !field && (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            Esta pregunta ya no existe. Elige otra en el lienzo.
          </p>
        )}
      </div>
    </div>
  );
}

function FieldSettings({
  field,
  onUpdate,
}: {
  field: IntegrationField;
  onUpdate: (patch: Partial<IntegrationField>) => void;
}) {
  const displayOnly = isDisplayOnlyField(field.type);
  const hasOptions = OPTION_TYPES.includes(field.type);
  const hasRange = field.type === "number" || field.type === "rating";
  const options = field.options ?? [];

  const changeType = (type: IntegrationFieldType) => {
    if (type === field.type) return;
    const fresh = createEmptyField(type);
    const patch: Partial<IntegrationField> = { type };

    if (OPTION_TYPES.includes(type)) {
      patch.options = type === "yes_no" || options.length === 0 ? fresh.options : options;
    } else {
      patch.options = undefined;
      patch.allowOther = undefined;
    }

    if (type === "number" || type === "rating") {
      patch.min = fresh.min;
      patch.max = fresh.max;
    } else {
      patch.min = undefined;
      patch.max = undefined;
    }

    if (isDisplayOnlyField(type)) patch.required = false;
    onUpdate(patch);
  };

  const patchOption = (index: number, patch: Partial<IntegrationChoice>) => {
    onUpdate({
      options: options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    });
  };

  return (
    <>
      <div>
        <Label className="text-xs text-muted-foreground">Tipo de campo</Label>
        <Select value={field.type} onValueChange={(type) => changeType(type as IntegrationFieldType)}>
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

      {!displayOnly && (
        <label className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
          Obligatoria
          <Switch
            checked={Boolean(field.required)}
            onCheckedChange={(required) => onUpdate({ required })}
          />
        </label>
      )}

      {!displayOnly && (
        <TextRow
          label="Placeholder"
          value={field.placeholder ?? ""}
          onChange={(placeholder) => onUpdate({ placeholder })}
        />
      )}

      <AreaRow
        label="Descripción o ayuda"
        value={field.description ?? ""}
        onChange={(description) => onUpdate({ description })}
      />

      {hasRange && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Mínimo</Label>
            <Input
              className="mt-1"
              type="number"
              value={field.min ?? (field.type === "rating" ? 1 : 0)}
              onChange={(event) => onUpdate({ min: Number(event.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Máximo</Label>
            <Input
              className="mt-1"
              type="number"
              value={field.max ?? (field.type === "rating" ? 5 : 100)}
              onChange={(event) => onUpdate({ max: Number(event.target.value) })}
            />
          </div>
        </div>
      )}

      {field.type === "multiple_choice" && (
        <label className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
          Permitir «Otro»
          <Switch
            checked={Boolean(field.allowOther)}
            onCheckedChange={(allowOther) => onUpdate({ allowOther })}
          />
        </label>
      )}

      {hasOptions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Opciones ({options.length})</Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 px-2"
              onClick={() => {
                const label = `Opción ${options.length + 1}`;
                onUpdate({ options: [...options, { value: optionValue(label), label }] });
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>

          {options.length === 0 && (
            <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
              Sin opciones todavía.
            </p>
          )}

          {options.map((option, index) => (
            <div key={`${option.value}-${index}`} className="space-y-2 rounded-xl border p-2.5">
              <div className="flex items-center gap-1.5">
                <Input
                  className="h-8 min-w-0 flex-1"
                  value={option.label}
                  placeholder="Texto de la opción"
                  onChange={(event) => {
                    const label = event.target.value;
                    patchOption(index, {
                      label,
                      value:
                        !option.value || /^opcion-/.test(option.value)
                          ? optionValue(label)
                          : option.value,
                    });
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onUpdate({ options: options.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                className="min-h-[48px] text-xs"
                value={option.description ?? ""}
                placeholder="Descripción (opcional)"
                onChange={(event) => patchOption(index, { description: event.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="h-8 font-mono text-xs"
                  value={option.value}
                  placeholder="valor-interno"
                  onChange={(event) =>
                    patchOption(index, { value: event.target.value.trim() || option.value })
                  }
                />
                <Input
                  className="h-8 text-xs"
                  value={option.acronym ?? ""}
                  placeholder="Sigla"
                  onChange={(event) => patchOption(index, { acronym: event.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TextRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AreaRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea
        className="mt-1 min-h-[72px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
