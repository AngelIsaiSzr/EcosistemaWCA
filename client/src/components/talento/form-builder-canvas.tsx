import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  GripVertical,
  MoreVertical,
  Settings,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FormAtmosphere } from "@/components/integration/form-atmosphere";
import { WcaLogo } from "@/components/integration/wca-logo";
import {
  FIELD_TYPE_LABELS,
  type IntegrationField,
  type IntegrationFormDefinition,
  type IntegrationSection,
} from "@shared/integration-form";

export type BuilderSelection =
  | { kind: "welcome" }
  | { kind: "ending" }
  | { kind: "section"; sectionIndex: number }
  | { kind: "field"; sectionIndex: number; fieldIndex: number };

const emojiFont =
  "[font-family:Inter,'Segoe UI Emoji','Noto Color Emoji','Apple Color Emoji',sans-serif]";

/** Entrada «invisible» para editar el copy directo sobre el lienzo. */
const inline =
  "rounded-lg border border-transparent bg-transparent text-white shadow-none placeholder:text-white/30 hover:border-white/10 focus-visible:border-[#5b8fd4]/60 focus-visible:ring-0 focus-visible:ring-offset-0";

const mockControl =
  "flex w-full items-center rounded-2xl border border-white/15 bg-white/10 px-4 text-sm text-white/40";

export function FormBuilderCanvas({
  definition,
  selection,
  onSelect,
  onOpenSettings,
  onUpdateDefinition,
  onUpdateSection,
  onUpdateField,
  onDuplicate,
  onMove,
  onDelete,
}: {
  definition: IntegrationFormDefinition;
  selection: BuilderSelection | null;
  onSelect: (selection: BuilderSelection) => void;
  onOpenSettings: (selection: BuilderSelection) => void;
  onUpdateDefinition: (patch: Partial<IntegrationFormDefinition>) => void;
  onUpdateSection: (sectionIndex: number, patch: Partial<IntegrationSection>) => void;
  onUpdateField: (
    sectionIndex: number,
    fieldIndex: number,
    patch: Partial<IntegrationField>,
  ) => void;
  onDuplicate: (selection: BuilderSelection) => void;
  onMove: (selection: BuilderSelection, direction: -1 | 1) => void;
  onDelete: (selection: BuilderSelection) => void;
}) {
  const realSections = definition.sections
    .map((section, sectionIndex) => ({ section, sectionIndex }))
    .filter(({ section }) => !section.isWelcome);

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <FormAtmosphere definition={definition} contained />
      <div className={cn("absolute inset-0 overflow-y-auto", emojiFont)}>
        <div className="relative z-10 mx-auto w-full max-w-2xl space-y-4 px-4 py-8 sm:px-6">
          <CanvasBlock
            selected={selection?.kind === "welcome"}
            onSelect={() => onSelect({ kind: "welcome" })}
            onOpenSettings={() => onOpenSettings({ kind: "welcome" })}
          >
            <div className="flex flex-col items-center text-center">
              <WcaLogo className="mb-5 h-14 w-14 object-contain" />
              <Input
                value={definition.subtitle ?? ""}
                onChange={(event) => onUpdateDefinition({ subtitle: event.target.value })}
                placeholder="Subtítulo"
                className={cn(inline, "h-8 text-center text-sm tracking-wide text-[#87b1e0]")}
              />
              <Input
                value={definition.title ?? ""}
                onChange={(event) => onUpdateDefinition({ title: event.target.value })}
                placeholder="Título del formulario"
                className={cn(
                  inline,
                  "h-auto py-1 text-center font-heading text-3xl font-bold md:text-4xl",
                )}
              />
              <AutoArea
                value={definition.description ?? ""}
                onChange={(description) => onUpdateDefinition({ description })}
                placeholder="Descripción"
                className={cn(inline, "mt-3 text-center text-base text-white/80 md:text-base")}
              />
              <AutoArea
                value={definition.cta ?? ""}
                onChange={(cta) => onUpdateDefinition({ cta })}
                placeholder="Llamado a la acción"
                className={cn(inline, "mt-1 text-center text-sm text-white/70")}
              />
              <span className="pointer-events-none mt-7 inline-flex h-12 items-center rounded-full bg-[#5b8fd4] px-8 text-base font-semibold text-white">
                Iniciar
              </span>
            </div>
          </CanvasBlock>

          {realSections.map(({ section, sectionIndex }, position) => (
            <div key={section.id} className="space-y-1">
              <CanvasBlock
                selected={selection?.kind === "section" && selection.sectionIndex === sectionIndex}
                onSelect={() => onSelect({ kind: "section", sectionIndex })}
                onOpenSettings={() => onOpenSettings({ kind: "section", sectionIndex })}
                onDuplicate={() => onDuplicate({ kind: "section", sectionIndex })}
                onMove={(direction) => onMove({ kind: "section", sectionIndex }, direction)}
                onDelete={() => onDelete({ kind: "section", sectionIndex })}
                canMoveUp={position > 0}
                canMoveDown={position < realSections.length - 1}
              >
                <Divider label={`Sección ${position + 1}`} />
                <Input
                  value={section.title ?? ""}
                  onChange={(event) => onUpdateSection(sectionIndex, { title: event.target.value })}
                  placeholder="Título de la sección"
                  className={cn(inline, "mt-3 h-8 text-sm font-medium text-[#87b1e0]")}
                />
                <AutoArea
                  value={section.subtitle ?? ""}
                  onChange={(subtitle) => onUpdateSection(sectionIndex, { subtitle })}
                  placeholder="Subtítulo de la sección (opcional)"
                  className={cn(inline, "text-sm text-white/65")}
                />
              </CanvasBlock>

              {section.fields.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/45">
                  Sección sin preguntas. Elige un campo del panel izquierdo.
                </p>
              )}

              {section.fields.map((field, fieldIndex) => (
                <CanvasBlock
                  key={field.id}
                  selected={
                    selection?.kind === "field" &&
                    selection.sectionIndex === sectionIndex &&
                    selection.fieldIndex === fieldIndex
                  }
                  onSelect={() => onSelect({ kind: "field", sectionIndex, fieldIndex })}
                  onOpenSettings={() => onOpenSettings({ kind: "field", sectionIndex, fieldIndex })}
                  onDuplicate={() => onDuplicate({ kind: "field", sectionIndex, fieldIndex })}
                  onMove={(direction) =>
                    onMove({ kind: "field", sectionIndex, fieldIndex }, direction)
                  }
                  onDelete={() => onDelete({ kind: "field", sectionIndex, fieldIndex })}
                  canMoveUp={position > 0 || fieldIndex > 0}
                  canMoveDown={
                    position < realSections.length - 1 || fieldIndex < section.fields.length - 1
                  }
                >
                  <FieldBlock
                    field={field}
                    onUpdate={(patch) => onUpdateField(sectionIndex, fieldIndex, patch)}
                  />
                </CanvasBlock>
              ))}
            </div>
          ))}

          <CanvasBlock
            selected={selection?.kind === "ending"}
            onSelect={() => onSelect({ kind: "ending" })}
            onOpenSettings={() => onOpenSettings({ kind: "ending" })}
          >
            <Divider label="Finales" />
            <div className="mt-4 flex flex-col items-center text-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#87b1e0] text-white">
                <Check className="h-9 w-9" />
              </span>
              <Input
                value={definition.ending.title ?? ""}
                onChange={(event) =>
                  onUpdateDefinition({
                    ending: { ...definition.ending, title: event.target.value },
                  })
                }
                placeholder="Título de la pantalla final"
                className={cn(
                  inline,
                  "h-auto py-1 text-center font-heading text-2xl font-bold md:text-2xl",
                )}
              />
              <AutoArea
                value={definition.ending.message ?? ""}
                onChange={(message) =>
                  onUpdateDefinition({ ending: { ...definition.ending, message } })
                }
                placeholder="Mensaje de agradecimiento"
                className={cn(inline, "mt-2 text-center text-base text-white/85 md:text-base")}
              />
            </div>
          </CanvasBlock>
        </div>
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 border-t border-dashed border-[#5b8fd4]/50" />
      <span className="shrink-0 rounded-full border border-[#5b8fd4]/40 bg-[#5b8fd4]/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#87b1e0]">
        {label}
      </span>
      <span className="flex-1 border-t border-dashed border-[#5b8fd4]/50" />
    </div>
  );
}

function CanvasBlock({
  selected,
  onSelect,
  onOpenSettings,
  onDuplicate,
  onMove,
  onDelete,
  canMoveUp,
  canMoveDown,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  onOpenSettings: () => void;
  onDuplicate?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onDelete?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children: ReactNode;
}) {
  const hasMenu = Boolean(onDuplicate || onMove || onDelete);
  return (
    <div
      onClick={onSelect}
      onFocusCapture={onSelect}
      className={cn(
        "relative rounded-2xl border px-4 py-4 transition sm:px-5",
        selected
          ? "border-[#5b8fd4] bg-white/[0.04]"
          : "border-transparent hover:border-white/15 hover:bg-white/[0.02]",
      )}
    >
      {selected && (
        <div
          className="absolute -top-3.5 right-3 z-20 flex items-center gap-0.5 rounded-full border border-[#5b8fd4]/60 bg-[#101a2c] px-1.5 py-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <span
            title="Arrastrar"
            className="flex h-6 w-6 cursor-grab items-center justify-center text-white/55"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <button
            type="button"
            title="Ajustes del campo"
            onClick={onOpenSettings}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Más acciones"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {onDuplicate && (
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="h-4 w-4" />
                    Duplicar
                  </DropdownMenuItem>
                )}
                {onMove && (
                  <>
                    <DropdownMenuItem disabled={!canMoveUp} onClick={() => onMove(-1)}>
                      <ArrowUp className="h-4 w-4" />
                      Ascender
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canMoveDown} onClick={() => onMove(1)}>
                      <ArrowDown className="h-4 w-4" />
                      Mover hacia abajo
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function AutoArea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={Math.min(8, Math.max(1, value.split("\n").length))}
      className={cn("min-h-0 resize-none py-1", className)}
    />
  );
}

function FieldBlock({
  field,
  onUpdate,
}: {
  field: IntegrationField;
  onUpdate: (patch: Partial<IntegrationField>) => void;
}) {
  if (field.type === "separator") {
    return (
      <div className="space-y-2">
        <div className="border-t border-dashed border-white/25" />
        <Input
          value={field.label ?? ""}
          onChange={(event) => onUpdate({ label: event.target.value })}
          placeholder="Etiqueta del separador (opcional)"
          className={cn(inline, "h-7 text-center text-xs uppercase tracking-wide text-white/45")}
        />
      </div>
    );
  }

  if (field.type === "explanation") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Input
          value={field.label ?? ""}
          onChange={(event) => onUpdate({ label: event.target.value })}
          placeholder="Texto de explicación"
          className={cn(inline, "h-auto py-1 text-lg font-semibold md:text-lg")}
        />
        <AutoArea
          value={field.description ?? ""}
          onChange={(description) => onUpdate({ description })}
          placeholder="Detalle o instrucciones"
          className={cn(inline, "text-sm text-white/70")}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-1">
        <Input
          value={field.label ?? ""}
          onChange={(event) => onUpdate({ label: event.target.value })}
          placeholder="Escribe la pregunta"
          className={cn(inline, "h-auto min-w-0 flex-1 py-1 text-xl font-semibold md:text-xl")}
        />
        {field.required && <span className="pt-2 text-xl text-[#87b1e0]">*</span>}
      </div>
      <AutoArea
        value={field.description ?? ""}
        onChange={(description) => onUpdate({ description })}
        placeholder="Descripción o ayuda (opcional)"
        className={cn(inline, "text-sm text-white/60")}
      />
      <div className="mt-3">
        <FieldMock field={field} />
      </div>
    </div>
  );
}

/** Maqueta no interactiva del control: se ve como el formulario público, sin capturar respuestas. */
function FieldMock({ field }: { field: IntegrationField }) {
  const placeholder = field.placeholder?.trim();

  if (field.type === "long_text") {
    return (
      <div className={cn(mockControl, "h-28 items-start pt-3")}>
        {placeholder || "Escribe aquí…"}
      </div>
    );
  }

  if (field.type === "phone") {
    return (
      <div className="flex gap-2">
        <div className={cn(mockControl, "h-12 w-[150px] justify-between")}>
          <span>+52</span>
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className={cn(mockControl, "h-12")}>{placeholder || "812 000 0000"}</div>
      </div>
    );
  }

  if (field.type === "dropdown") {
    return (
      <div className={cn(mockControl, "h-12 justify-between")}>
        <span>{placeholder || "Elige una opción"}</span>
        <ChevronDown className="h-4 w-4" />
      </div>
    );
  }

  if (field.type === "date" || field.type === "time") {
    const Icon = field.type === "date" ? Calendar : Clock;
    return (
      <div className={cn(mockControl, "h-12 justify-between")}>
        <span>{field.type === "date" ? "dd/mm/aaaa" : "--:--"}</span>
        <Icon className="h-4 w-4" />
      </div>
    );
  }

  if (field.type === "rating") {
    const min = field.min ?? 1;
    const max = field.max ?? 5;
    const count = Math.max(1, Math.min(10, max - min + 1));
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, index) => (
          <Star key={index} className="h-8 w-8 text-white/30" />
        ))}
      </div>
    );
  }

  if (field.type === "yes_no") {
    const options = field.options?.length
      ? field.options
      : [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ];
    return (
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <div
            key={option.value}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white/80"
          >
            {option.label}
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "single_choice" || field.type === "multiple_choice") {
    const multiple = field.type === "multiple_choice";
    const options = [
      ...(field.options ?? []),
      ...(multiple && field.allowOther ? [{ value: "otro", label: "Otro" }] : []),
    ];
    if (options.length === 0) {
      return (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-4 text-xs text-white/45">
          Sin opciones todavía. Ábrelas con el engrane.
        </p>
      );
    }
    return (
      <div className="space-y-2.5">
        {options.map((option) => (
          <div
            key={option.value}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <span
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0 border border-white/30",
                multiple ? "rounded-md" : "rounded-full",
              )}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{option.label}</p>
              {(option.acronym || option.description) && (
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  {option.acronym && (
                    <span className="mr-2 inline-flex rounded-full bg-[#87b1e0]/20 px-2 py-0.5 text-[10px] font-semibold text-[#87b1e0]">
                      {option.acronym}
                    </span>
                  )}
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-white/40" />
        <span className="text-sm leading-relaxed text-white/80">
          {field.label || "Casilla de confirmación"}
        </span>
      </div>
    );
  }

  if (field.type === "image_upload" || field.type === "file") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-7 text-sm text-white/55">
        <Upload className="h-6 w-6 text-[#87b1e0]" />
        <span>{field.type === "image_upload" ? "Elige una imagen" : "Elige un archivo"}</span>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className={cn(mockControl, "h-12")}>
        {placeholder || `Número entre ${field.min ?? 0} y ${field.max ?? 100}`}
      </div>
    );
  }

  return (
    <div className={cn(mockControl, "h-12")}>
      {placeholder || `${FIELD_TYPE_LABELS[field.type]}…`}
    </div>
  );
}
