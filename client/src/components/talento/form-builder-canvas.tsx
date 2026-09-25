import { Fragment, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  GripVertical,
  Minus,
  MoreVertical,
  Plus,
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
  newFieldId,
  slugify,
  themeControlRadius,
  type IntegrationChoice,
  type IntegrationField,
  type IntegrationFieldType,
  type IntegrationFormDefinition,
  type IntegrationSection,
} from "@shared/integration-form";
import { FIELD_DND_MIME, FIELD_MOVE_MIME } from "./form-builder-dnd";

export { FIELD_DND_MIME, FIELD_MOVE_MIME };

export type BuilderSelection =
  | { kind: "welcome" }
  | { kind: "ending" }
  | { kind: "section"; sectionIndex: number }
  | { kind: "field"; sectionIndex: number; fieldIndex: number };

export type FieldLocation = { sectionIndex: number; fieldIndex: number };

/** Reordenar opciones dentro de una misma pregunta. */
const OPTION_MIME = "application/x-wca-option-index";

const emojiFont =
  "[font-family:Inter,'Segoe UI Emoji','Noto Color Emoji','Apple Color Emoji',sans-serif]";

/** Entrada «invisible» para editar el copy directo sobre el lienzo. */
const inline =
  "rounded-lg border border-transparent bg-transparent text-white shadow-none placeholder:text-white/30 hover:border-white/10 focus-visible:border-[#5b8fd4]/60 focus-visible:ring-0 focus-visible:ring-offset-0";

const mockControlBase =
  "flex w-full items-center border border-white/15 bg-white/10 px-4 text-sm text-white/40";

const iconButton =
  "flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white";

function optionValue(label: string): string {
  return slugify(label) || newFieldId("opcion");
}

function blockKey(selection: BuilderSelection): string {
  if (selection.kind === "welcome") return "welcome";
  if (selection.kind === "ending") return "ending";
  if (selection.kind === "section") return `section-${selection.sectionIndex}`;
  return `field-${selection.sectionIndex}-${selection.fieldIndex}`;
}

function acceptsFieldDrag(event: DragEvent): boolean {
  const types = Array.from(event.dataTransfer.types);
  return types.includes(FIELD_DND_MIME) || types.includes(FIELD_MOVE_MIME);
}

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
  onInsertField,
  onMoveFieldTo,
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
  onInsertField?: (sectionIndex: number, fieldIndex: number, type: IntegrationFieldType) => void;
  onMoveFieldTo?: (from: FieldLocation, to: FieldLocation) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const controlRadius = themeControlRadius(definition.theme?.cornerStyle);

  const realSections = definition.sections
    .map((section, sectionIndex) => ({ section, sectionIndex }))
    .filter(({ section }) => !section.isWelcome);

  const selectionKey = selection ? blockKey(selection) : null;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !selectionKey) return;
    const block = container.querySelector(`[data-builder-block="${selectionKey}"]`);
    if (!block) return;
    const box = container.getBoundingClientRect();
    const rect = block.getBoundingClientRect();
    if (rect.top >= box.top && rect.bottom <= box.bottom) return;
    block.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectionKey]);

  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener("dragend", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragend", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  const dropTargets = (sectionIndex: number, fieldIndex: number) => ({
    dragging,
    onInsertType: onInsertField
      ? (type: IntegrationFieldType) => onInsertField(sectionIndex, fieldIndex, type)
      : undefined,
    onMoveField: onMoveFieldTo
      ? (from: FieldLocation) => onMoveFieldTo(from, { sectionIndex, fieldIndex })
      : undefined,
  });

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <FormAtmosphere definition={definition} contained />
      <div
        ref={scrollRef}
        onDragOver={(event) => {
          if (acceptsFieldDrag(event)) setDragging(true);
        }}
        className={cn("absolute inset-0 overflow-y-auto", emojiFont)}
      >
        <div className="relative z-10 mx-auto w-full max-w-2xl space-y-4 px-4 py-8 sm:px-6">
          <CanvasBlock
            dataKey="welcome"
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
                dataKey={`section-${sectionIndex}`}
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
                <AutoArea
                  value={section.title ?? ""}
                  onChange={(title) => onUpdateSection(sectionIndex, { title })}
                  placeholder="Título de la sección"
                  className={cn(inline, "mt-3 text-sm font-medium text-[#87b1e0]")}
                />
                <AutoArea
                  value={section.subtitle ?? ""}
                  onChange={(subtitle) => onUpdateSection(sectionIndex, { subtitle })}
                  placeholder="Subtítulo de la sección (opcional)"
                  className={cn(inline, "text-sm text-white/65")}
                />
              </CanvasBlock>

              {section.fields.length === 0 ? (
                <DropZone
                  empty
                  label="Sección sin preguntas. Arrastra un campo aquí o elígelo del panel izquierdo."
                  {...dropTargets(sectionIndex, 0)}
                />
              ) : (
                <>
                  <DropZone {...dropTargets(sectionIndex, 0)} />
                  {section.fields.map((field, fieldIndex) => (
                    <Fragment key={field.id}>
                      <CanvasBlock
                        dataKey={`field-${sectionIndex}-${fieldIndex}`}
                        selected={
                          selection?.kind === "field" &&
                          selection.sectionIndex === sectionIndex &&
                          selection.fieldIndex === fieldIndex
                        }
                        onSelect={() => onSelect({ kind: "field", sectionIndex, fieldIndex })}
                        onOpenSettings={() =>
                          onOpenSettings({ kind: "field", sectionIndex, fieldIndex })
                        }
                        onDuplicate={() => onDuplicate({ kind: "field", sectionIndex, fieldIndex })}
                        onMove={(direction) =>
                          onMove({ kind: "field", sectionIndex, fieldIndex }, direction)
                        }
                        onDelete={() => onDelete({ kind: "field", sectionIndex, fieldIndex })}
                        canMoveUp={position > 0 || fieldIndex > 0}
                        canMoveDown={
                          position < realSections.length - 1 ||
                          fieldIndex < section.fields.length - 1
                        }
                        onDragStart={
                          onMoveFieldTo
                            ? (event) => {
                                event.dataTransfer.setData(
                                  FIELD_MOVE_MIME,
                                  JSON.stringify({ sectionIndex, fieldIndex }),
                                );
                                event.dataTransfer.effectAllowed = "move";
                                setDragging(true);
                              }
                            : undefined
                        }
                      >
                        <FieldBlock
                          field={field}
                          controlRadius={controlRadius}
                          onUpdate={(patch) => onUpdateField(sectionIndex, fieldIndex, patch)}
                        />
                      </CanvasBlock>
                      <DropZone {...dropTargets(sectionIndex, fieldIndex + 1)} />
                    </Fragment>
                  ))}
                </>
              )}
            </div>
          ))}

          <CanvasBlock
            dataKey="ending"
            selected={selection?.kind === "ending"}
            onSelect={() => onSelect({ kind: "ending" })}
            onOpenSettings={() => onOpenSettings({ kind: "ending" })}
          >
            <Divider label="Finales" />
            <div className="mt-4 flex flex-col items-center text-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#87b1e0] text-white">
                <Check className="h-9 w-9" />
              </span>
              <AutoArea
                value={definition.ending.title ?? ""}
                onChange={(title) =>
                  onUpdateDefinition({ ending: { ...definition.ending, title } })
                }
                placeholder="Título de la pantalla final"
                className={cn(
                  inline,
                  "text-center font-heading text-2xl font-bold md:text-2xl",
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

/** Zona donde se sueltan campos nuevos del catálogo o preguntas que se están moviendo. */
function DropZone({
  dragging,
  empty,
  label,
  onInsertType,
  onMoveField,
}: {
  dragging: boolean;
  empty?: boolean;
  label?: string;
  onInsertType?: (type: IntegrationFieldType) => void;
  onMoveField?: (from: FieldLocation) => void;
}) {
  const [over, setOver] = useState(false);
  const enabled = Boolean(onInsertType || onMoveField);

  if (!enabled && !empty) return null;

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!enabled || !acceptsFieldDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setOver(false);

    const move = event.dataTransfer.getData(FIELD_MOVE_MIME);
    if (move) {
      try {
        const from = JSON.parse(move) as FieldLocation;
        if (
          Number.isInteger(from?.sectionIndex) &&
          Number.isInteger(from?.fieldIndex) &&
          onMoveField
        ) {
          onMoveField(from);
        }
      } catch {
        /* payload inválido: se ignora */
      }
      return;
    }

    const type = event.dataTransfer.getData(FIELD_DND_MIME);
    if (type && onInsertType) onInsertType(type as IntegrationFieldType);
  };

  const visible = empty || dragging || over;

  return (
    <div
      onDragOver={(event) => {
        if (!enabled || !acceptsFieldDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes(
          FIELD_MOVE_MIME,
        )
          ? "move"
          : "copy";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex items-center justify-center rounded-2xl border border-dashed px-4 text-center text-xs transition-all",
        empty ? "py-6" : visible ? "py-4" : "h-2 py-0",
        over
          ? "border-[#5b8fd4] bg-[#5b8fd4]/10 text-[#87b1e0]"
          : visible
            ? "border-white/15 text-white/45"
            : "border-transparent text-transparent",
      )}
    >
      {over ? "Suelta aquí" : empty ? label : ""}
    </div>
  );
}

function CanvasBlock({
  dataKey,
  selected,
  onSelect,
  onOpenSettings,
  onDuplicate,
  onMove,
  onDelete,
  canMoveUp,
  canMoveDown,
  onDragStart,
  children,
}: {
  dataKey: string;
  selected: boolean;
  onSelect: () => void;
  onOpenSettings: () => void;
  onDuplicate?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onDelete?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  const hasMenu = Boolean(onDuplicate || onMove || onDelete);
  /** Solo se arrastra desde el asa: así los textos siguen siendo seleccionables. */
  const [armed, setArmed] = useState(false);

  return (
    <div
      data-builder-block={dataKey}
      onClick={onSelect}
      onFocusCapture={onSelect}
      draggable={Boolean(onDragStart) && armed}
      onDragStart={(event) => {
        if (!armed || !onDragStart) {
          event.preventDefault();
          return;
        }
        onDragStart(event);
      }}
      onDragEnd={() => setArmed(false)}
      className={cn(
        "relative rounded-2xl border px-4 py-4 transition sm:px-5",
        selected
          ? "border-[#5b8fd4] bg-white/[0.04]"
          : "border-transparent hover:border-white/15 hover:bg-white/[0.02]",
        armed && "opacity-70",
      )}
    >
      {selected && (
        <div
          className="absolute -top-3.5 right-3 z-20 flex items-center gap-0.5 rounded-full border border-[#5b8fd4]/60 bg-[#101a2c] px-1.5 py-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <span
            title={onDragStart ? "Arrastrar para mover" : "Arrastrar"}
            onMouseDown={() => onDragStart && setArmed(true)}
            onMouseUp={() => setArmed(false)}
            className={cn(
              "flex h-6 w-6 items-center justify-center text-white/55",
              onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-grab",
            )}
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
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={1}
      className={cn("w-full min-h-0 resize-none overflow-hidden py-1", className)}
    />
  );
}

function FieldBlock({
  field,
  controlRadius,
  onUpdate,
}: {
  field: IntegrationField;
  controlRadius: string;
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
      <div className={cn(controlRadius, "border border-white/10 bg-white/5 px-4 py-3")}>
        <AutoArea
          value={field.label ?? ""}
          onChange={(label) => onUpdate({ label })}
          placeholder="Texto de explicación"
          className={cn(inline, "text-lg font-semibold md:text-lg")}
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

  if (field.type === "checkbox") {
    return (
      <div className={cn("flex items-start gap-3 border border-white/10 bg-white/5 px-4 py-3", controlRadius)}>
        <span className="mt-2 h-5 w-5 shrink-0 rounded-md border border-white/40" />
        <div className="min-w-0 flex-1">
          <AutoArea
            value={field.label ?? ""}
            onChange={(label) => onUpdate({ label })}
            placeholder="Texto de la casilla"
            className={cn(inline, "text-sm leading-relaxed text-white/85")}
          />
          <AutoArea
            value={field.description ?? ""}
            onChange={(description) => onUpdate({ description })}
            placeholder="Descripción o ayuda (opcional)"
            className={cn(inline, "text-xs text-white/55")}
          />
        </div>
        {field.required && <span className="pt-1.5 text-[#87b1e0]">*</span>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <AutoArea
            value={field.label ?? ""}
            onChange={(label) => onUpdate({ label })}
            placeholder="Escribe la pregunta"
            className={cn(inline, "text-xl font-semibold md:text-xl")}
          />
        </div>
        {field.required && <span className="pt-2 text-xl text-[#87b1e0]">*</span>}
      </div>
      <AutoArea
        value={field.description ?? ""}
        onChange={(description) => onUpdate({ description })}
        placeholder="Descripción o ayuda (opcional)"
        className={cn(inline, "text-sm text-white/60")}
      />
      <div className="mt-3">
        <FieldMock field={field} controlRadius={controlRadius} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

/** Maqueta del control: se ve como el formulario público; las opciones sí se editan aquí. */
function FieldMock({
  field,
  controlRadius,
  onUpdate,
}: {
  field: IntegrationField;
  controlRadius: string;
  onUpdate: (patch: Partial<IntegrationField>) => void;
}) {
  const placeholder = field.placeholder?.trim();
  const mockControl = cn(mockControlBase, controlRadius);

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
      <div className="space-y-3">
        <div className={cn(mockControl, "h-12 justify-between")}>
          <span>{placeholder || "Elige una opción"}</span>
          <ChevronDown className="h-4 w-4" />
        </div>
        <EditableOptions field={field} controlRadius={controlRadius} onUpdate={onUpdate} />
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

  if (
    field.type === "single_choice" ||
    field.type === "multiple_choice" ||
    field.type === "yes_no"
  ) {
    return <EditableOptions field={field} controlRadius={controlRadius} onUpdate={onUpdate} />;
  }

  if (field.type === "image_upload" || field.type === "file") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 border border-dashed border-white/20 bg-white/5 px-4 py-7 text-sm text-white/55", controlRadius)}>
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

/** Opciones editables sobre el lienzo: texto, orden, agregar y quitar. */
function EditableOptions({
  field,
  controlRadius,
  onUpdate,
}: {
  field: IntegrationField;
  controlRadius: string;
  onUpdate: (patch: Partial<IntegrationField>) => void;
}) {
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const multiple = field.type === "multiple_choice";
  const options: IntegrationChoice[] =
    field.options?.length
      ? field.options
      : field.type === "yes_no"
        ? [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ]
        : [];

  const commit = (next: IntegrationChoice[]) => onUpdate({ options: next });

  const patchLabel = (index: number, label: string) => {
    commit(
      options.map((option, i) =>
        i === index
          ? {
              ...option,
              label,
              value:
                !option.value || /^opcion-/.test(option.value) ? optionValue(label) : option.value,
            }
          : option,
      ),
    );
  };

  const insertAfter = (index: number) => {
    const label = `Opción ${options.length + 1}`;
    const next = [...options];
    next.splice(index + 1, 0, { value: optionValue(label), label });
    commit(next);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || from >= options.length) return;
    const next = [...options];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div
          key={`${option.value}-${index}`}
          onDragOver={(event) => {
            if (!Array.from(event.dataTransfer.types).includes(OPTION_MIME)) return;
            event.preventDefault();
            event.stopPropagation();
            setOverIndex(index);
          }}
          onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
          onDrop={(event) => {
            if (!Array.from(event.dataTransfer.types).includes(OPTION_MIME)) return;
            event.preventDefault();
            event.stopPropagation();
            setOverIndex(null);
            const from = Number(event.dataTransfer.getData(OPTION_MIME));
            if (Number.isInteger(from)) reorder(from, index);
          }}
          className={cn(
            "flex items-start gap-3 border px-4 py-2 transition", controlRadius,
            overIndex === index
              ? "border-[#5b8fd4] bg-[#5b8fd4]/10"
              : "border-white/10 bg-white/5",
          )}
        >
          <span
            className={cn(
              "mt-2.5 h-5 w-5 shrink-0 border border-white/30",
              multiple ? "rounded-md" : "rounded-full",
            )}
          />
          <div className="min-w-0 flex-1">
            <AutoArea
              value={option.label ?? ""}
              onChange={(label) => patchLabel(index, label)}
              placeholder="Texto de la opción"
              className={cn(inline, "text-sm font-medium text-white")}
            />
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
          <div className="flex shrink-0 items-center gap-0.5 pt-1.5">
            <span
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData(OPTION_MIME, String(index));
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setOverIndex(null)}
              title="Reordenar opción"
              className={cn(iconButton, "cursor-grab active:cursor-grabbing")}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <button
              type="button"
              title="Agregar opción"
              onClick={() => insertAfter(index)}
              className={iconButton}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Quitar opción"
              onClick={() => commit(options.filter((_, i) => i !== index))}
              className={iconButton}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {field.allowOther && (
        <div className={cn("flex items-center gap-3 border border-dashed border-white/15 bg-white/5 px-4 py-3", controlRadius)}>
          <span
            className={cn(
              "h-5 w-5 shrink-0 border border-white/30",
              multiple ? "rounded-md" : "rounded-full",
            )}
          />
          <span className="text-sm text-white/55">Otro</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => insertAfter(options.length - 1)}
        className={cn("flex w-full items-center justify-center gap-1.5 border border-dashed border-white/15 px-4 py-2 text-xs text-white/50 transition hover:border-[#5b8fd4]/60 hover:text-[#87b1e0]", controlRadius)}
      >
        <Plus className="h-3.5 w-3.5" />
        Agregar opción
      </button>
    </div>
  );
}
