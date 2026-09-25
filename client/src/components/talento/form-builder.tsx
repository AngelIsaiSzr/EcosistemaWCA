import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Flag,
  GitBranch,
  GripVertical,
  LayoutGrid,
  Link2,
  Palette,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Type,
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

type BuilderMode = "campos" | "diseno" | "logica";

type Selection =
  | { kind: "settings" }
  | { kind: "welcome" }
  | { kind: "ending" }
  | { kind: "section"; sectionIndex: number }
  | { kind: "field"; sectionIndex: number; fieldIndex: number };

type DragPayload = { sectionIndex: number; fieldIndex: number };

type LogicTarget =
  | { kind: "section"; sectionIndex: number }
  | { kind: "field"; sectionIndex: number; fieldIndex: number };

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

function formatConditionShort(
  showIf: IntegrationShowIf | undefined,
  sections: IntegrationSection[],
): string | null {
  if (!showIf?.field) return null;
  const trigger = findFieldById(sections, showIf.field);
  const triggerLabel = trigger?.label || showIf.field;
  const raw = showIf.equals ?? showIf.includes ?? "";
  const opt = trigger?.options?.find((o) => o.value === raw);
  const valueLabel = opt?.label || raw || "…";
  return `${triggerLabel} → ${valueLabel}`;
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

function fieldTypeIcon(type: IntegrationFieldType) {
  if (type === "single_choice" || type === "multiple_choice" || type === "checkbox") return GitBranch;
  if (type === "email" || type === "phone" || type === "url") return Link2;
  return Type;
}

export function IntegrationFormBuilder({
  value,
  onChange,
}: {
  value: IntegrationFormDefinition;
  onChange: (next: IntegrationFormDefinition) => void;
}) {
  const [mode, setMode] = useState<BuilderMode>("campos");
  const [selection, setSelection] = useState<Selection>({ kind: "welcome" });
  const [logicFocus, setLogicFocus] = useState<LogicTarget | null>(null);
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

  const setSectionBranch = (sectionIndex: number, showIf: IntegrationShowIf | undefined) => {
    const section = value.sections[sectionIndex];
    if (!section) return;
    updateSection(sectionIndex, {
      showIf,
      fields: section.fields.map((f) => ({
        ...f,
        showIf: showIf ? { ...showIf } : undefined,
      })),
    });
  };

  const addSection = () => {
    const section: IntegrationSection = {
      id: newFieldId("seccion"),
      title: "Nueva sección",
      subtitle: "",
      fields: [],
    };
    onChange({ ...value, sections: [...value.sections, section] });
    setMode("campos");
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
    setMode("campos");
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

  const openLogic = (target: LogicTarget) => {
    setLogicFocus(target);
    setMode("logica");
    if (target.kind === "section") setSelection({ kind: "section", sectionIndex: target.sectionIndex });
    else setSelection({ kind: "field", sectionIndex: target.sectionIndex, fieldIndex: target.fieldIndex });
  };

  const logicRules = useMemo(() => {
    const rules: Array<{
      id: string;
      target: LogicTarget;
      title: string;
      subtitle: string;
      showIf: IntegrationShowIf;
    }> = [];

    value.sections.forEach((section, sectionIndex) => {
      if (section.isWelcome) return;
      const sectionCond = getSectionCondition(section);
      if (sectionCond?.field) {
        rules.push({
          id: `section-${section.id}`,
          target: { kind: "section", sectionIndex },
          title: section.title || "Sección",
          subtitle: "Sección completa",
          showIf: sectionCond,
        });
      }
      section.fields.forEach((field, fieldIndex) => {
        if (!field.showIf?.field) return;
        // Si la sección ya tiene la misma condición compartida, no duplicar cada pregunta
        if (
          sectionCond?.field === field.showIf.field &&
          (sectionCond.equals ?? "") === (field.showIf.equals ?? "") &&
          (sectionCond.includes ?? "") === (field.showIf.includes ?? "")
        ) {
          return;
        }
        rules.push({
          id: `field-${field.id}`,
          target: { kind: "field", sectionIndex, fieldIndex },
          title: field.label || "Pregunta",
          subtitle: section.title || "Sección",
          showIf: field.showIf,
        });
      });
    });
    return rules;
  }, [value.sections]);

  return (
    <div className="flex w-full min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card">
      {/* Rail estilo forms.app */}
      <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r bg-muted/30 py-3">
        <ModeTab
          active={mode === "campos"}
          icon={LayoutGrid}
          label="Campos"
          onClick={() => setMode("campos")}
        />
        <ModeTab
          active={mode === "diseno"}
          icon={Palette}
          label="Diseño"
          onClick={() => {
            setMode("diseno");
            setSelection({ kind: "settings" });
          }}
        />
        <ModeTab
          active={mode === "logica"}
          icon={GitBranch}
          label="Lógica"
          onClick={() => setMode("logica")}
          badge={logicRules.length > 0 ? logicRules.length : undefined}
        />
      </nav>

      {/* Panel lateral */}
      <aside className="flex w-full max-w-[300px] shrink-0 flex-col border-r bg-card sm:max-w-[320px]">
        {mode === "campos" && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            <NavButton active={selection.kind === "welcome"} onClick={() => setSelection({ kind: "welcome" })}>
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Bienvenida</span>
            </NavButton>
            <NavButton active={selection.kind === "ending"} onClick={() => setSelection({ kind: "ending" })}>
              <Flag className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Pantalla final</span>
            </NavButton>

            <div className="flex items-center justify-between gap-2 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Secciones
              </p>
              <Button size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0" onClick={addSection}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-w-0 space-y-1.5">
              {value.sections.map((section, sectionIndex) => {
                if (section.isWelcome) return null;
                const hasBranch = Boolean(getSectionCondition(section)?.field);
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
                      <button
                        type="button"
                        className="shrink-0 p-1 text-muted-foreground"
                        onClick={() => update({ sections: moveItem(value.sections, sectionIndex, sectionIndex - 1) })}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="shrink-0 p-1 text-muted-foreground"
                        onClick={() => update({ sections: moveItem(value.sections, sectionIndex, sectionIndex + 1) })}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: "section", sectionIndex })}
                        className={cn(
                          "min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm font-medium",
                          selection.kind === "section" &&
                            selection.sectionIndex === sectionIndex &&
                            "bg-[#5b8fd4]/15 text-[#5b8fd4]",
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          {hasBranch && <GitBranch className="h-3 w-3 shrink-0 text-[#5b8fd4]" />}
                          <span className="truncate">{section.title || "Sin título"}</span>
                        </span>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => addField(sectionIndex)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="min-w-0 space-y-0.5 px-1.5 pb-1.5">
                      {section.fields.map((field, fieldIndex) => {
                        const Icon = fieldTypeIcon(field.type);
                        const fieldHasLogic = Boolean(field.showIf?.field);
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
                              dropHint === `field-${sectionIndex}-${fieldIndex}` &&
                                "rounded-lg ring-1 ring-[#5b8fd4]",
                            )}
                          >
                            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/60" />
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
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <Icon className="h-3 w-3 shrink-0 opacity-50" />
                                {fieldHasLogic && <Link2 className="h-3 w-3 shrink-0 text-[#5b8fd4]" />}
                                <span className="truncate">{field.label}</span>
                              </span>
                            </button>
                          </div>
                        );
                      })}
                      {section.fields.length === 0 && (
                        <p className="px-2 py-1 text-[11px] text-muted-foreground">Sin preguntas</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mode === "diseno" && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Apariencia
            </p>
            <NavButton active onClick={() => setSelection({ kind: "settings" })}>
              <Settings2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Tema y colores</span>
            </NavButton>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Plantillas y personalización del fondo del formulario.
            </p>
          </div>
        )}

        {mode === "logica" && (
          <LogicSidebar
            rules={logicRules}
            sections={value.sections}
            focus={logicFocus}
            onFocus={setLogicFocus}
            onSelectTarget={(target) => {
              setLogicFocus(target);
              if (target.kind === "section") {
                setSelection({ kind: "section", sectionIndex: target.sectionIndex });
              } else {
                setSelection({
                  kind: "field",
                  sectionIndex: target.sectionIndex,
                  fieldIndex: target.fieldIndex,
                });
              }
            }}
          />
        )}
      </aside>

      {/* Lienzo / editor */}
      <section className="min-h-[520px] min-w-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {mode === "diseno" && (
          <AppearanceEditor theme={value.theme} onChange={updateTheme} />
        )}

        {mode === "logica" && (
          <LogicCanvas
            value={value}
            focus={logicFocus}
            onFocus={setLogicFocus}
            onSetSectionBranch={setSectionBranch}
            onUpdateField={updateField}
          />
        )}

        {mode === "campos" && selection.kind === "welcome" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">Pantalla de bienvenida</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Título, texto e Iniciar. Es el único lugar para editar el inicio.
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

        {mode === "campos" && selection.kind === "ending" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Pantalla final</h2>
              <Field
                label="Título"
                value={value.ending.title}
                onChange={(title) => update({ ending: { ...value.ending, title } })}
              />
            </div>
            <Area
              label="Mensaje"
              value={value.ending.message}
              onChange={(message) => update({ ending: { ...value.ending, message } })}
            />
          </div>
        )}

        {mode === "campos" && selection.kind === "section" && value.sections[selection.sectionIndex] && (
          <SectionEditor
            section={value.sections[selection.sectionIndex]}
            sections={value.sections}
            onChange={(patch) => updateSection(selection.sectionIndex, patch)}
            onDelete={() => {
              onChange({ ...value, sections: value.sections.filter((_, i) => i !== selection.sectionIndex) });
              setSelection({ kind: "welcome" });
            }}
            onAddField={() => addField(selection.sectionIndex)}
            onOpenLogic={() => openLogic({ kind: "section", sectionIndex: selection.sectionIndex })}
          />
        )}

        {mode === "campos" &&
          selection.kind === "field" &&
          value.sections[selection.sectionIndex]?.fields[selection.fieldIndex] && (
            <FieldEditor
              field={value.sections[selection.sectionIndex].fields[selection.fieldIndex]}
              sectionIndex={selection.sectionIndex}
              sections={value.sections}
              onChange={(patch) => updateField(selection.sectionIndex, selection.fieldIndex, patch)}
              onMove={(targetSection) => {
                const from = { sectionIndex: selection.sectionIndex, fieldIndex: selection.fieldIndex };
                const destIndex = value.sections[targetSection].fields.length;
                const sections = moveField(value.sections, from, {
                  sectionIndex: targetSection,
                  fieldIndex: destIndex,
                });
                onChange({ ...value, sections });
                setSelection({
                  kind: "field",
                  sectionIndex: targetSection,
                  fieldIndex: sections[targetSection].fields.length - 1,
                });
              }}
              onDelete={() => {
                updateSection(selection.sectionIndex, {
                  fields: value.sections[selection.sectionIndex].fields.filter(
                    (_, i) => i !== selection.fieldIndex,
                  ),
                });
                setSelection({ kind: "section", sectionIndex: selection.sectionIndex });
              }}
              onOpenLogic={() =>
                openLogic({
                  kind: "field",
                  sectionIndex: selection.sectionIndex,
                  fieldIndex: selection.fieldIndex,
                })
              }
            />
          )}

        {mode === "campos" && selection.kind === "settings" && (
          <AppearanceEditor theme={value.theme} onChange={updateTheme} />
        )}
      </section>
    </div>
  );
}

function ModeTab({
  active,
  icon: Icon,
  label,
  onClick,
  badge,
}: {
  active: boolean;
  icon: typeof LayoutGrid;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-[60px] flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition",
        active
          ? "bg-[#5b8fd4]/20 text-[#5b8fd4]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5b8fd4] px-1 text-[9px] text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
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

function LogicSidebar({
  rules,
  sections,
  focus,
  onFocus,
  onSelectTarget,
}: {
  rules: Array<{
    id: string;
    target: LogicTarget;
    title: string;
    subtitle: string;
    showIf: IntegrationShowIf;
  }>;
  sections: IntegrationSection[];
  focus: LogicTarget | null;
  onFocus: (t: LogicTarget) => void;
  onSelectTarget: (t: LogicTarget) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Condiciones
        </p>
        <span className="text-[11px] text-muted-foreground">{rules.length}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Si → entonces mostrar. Elige una regla o una sección/pregunta desde Campos.
      </p>

      {rules.length === 0 && (
        <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          Aún no hay condiciones. Abre una sección o pregunta y pulsa «Lógica».
        </div>
      )}

      <div className="space-y-1.5">
        {rules.map((rule) => {
          const active =
            focus &&
            ((focus.kind === "section" &&
              rule.target.kind === "section" &&
              focus.sectionIndex === rule.target.sectionIndex) ||
              (focus.kind === "field" &&
                rule.target.kind === "field" &&
                focus.sectionIndex === rule.target.sectionIndex &&
                focus.fieldIndex === rule.target.fieldIndex));
          const summary = formatConditionShort(rule.showIf, sections);
          return (
            <button
              key={rule.id}
              type="button"
              onClick={() => {
                onFocus(rule.target);
                onSelectTarget(rule.target);
              }}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left transition",
                active ? "border-[#5b8fd4] bg-[#5b8fd4]/10" : "hover:bg-muted/60",
              )}
            >
              <p className="truncate text-sm font-medium">{rule.title}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{rule.subtitle}</p>
              {summary && (
                <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-[#5b8fd4]">
                  <GitBranch className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="min-w-0">{summary}</span>
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 border-t pt-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Añadir a…
        </p>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {sections.map((section, sectionIndex) => {
            if (section.isWelcome) return null;
            return (
              <div key={section.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => onSelectTarget({ kind: "section", sectionIndex })}
                  className="w-full truncate rounded-lg px-2 py-1.5 text-left text-xs font-medium hover:bg-muted"
                >
                  Sección: {section.title || "Sin título"}
                </button>
                {section.fields.map((field, fieldIndex) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => onSelectTarget({ kind: "field", sectionIndex, fieldIndex })}
                    className="w-full truncate rounded-lg px-2 py-1 pl-4 text-left text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LogicCanvas({
  value,
  focus,
  onFocus,
  onSetSectionBranch,
  onUpdateField,
}: {
  value: IntegrationFormDefinition;
  focus: LogicTarget | null;
  onFocus: (t: LogicTarget | null) => void;
  onSetSectionBranch: (sectionIndex: number, showIf: IntegrationShowIf | undefined) => void;
  onUpdateField: (sectionIndex: number, fieldIndex: number, patch: Partial<IntegrationField>) => void;
}) {
  if (!focus) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5b8fd4]/15 text-[#5b8fd4]">
          <GitBranch className="h-7 w-7" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold">Lógica del formulario</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Elige una condición a la izquierda, o una sección/pregunta, y define cuándo se muestra.
          </p>
        </div>
      </div>
    );
  }

  if (focus.kind === "section") {
    const section = value.sections[focus.sectionIndex];
    if (!section) return null;
    const condition = getSectionCondition(section);
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#5b8fd4]">Sección</p>
            <h2 className="font-heading text-xl font-semibold">{section.title || "Sin título"}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onFocus(null)}>
            Cerrar
          </Button>
        </div>
        <ShowIfEditor
          label="Mostrar esta sección solo si…"
          showIf={condition}
          sections={value.sections}
          excludeFieldId={undefined}
          onChange={(showIf) => onSetSectionBranch(focus.sectionIndex, showIf)}
        />
      </div>
    );
  }

  const field = value.sections[focus.sectionIndex]?.fields[focus.fieldIndex];
  if (!field) return null;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#5b8fd4]">Pregunta</p>
          <h2 className="font-heading text-xl font-semibold">{field.label || "Sin título"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {value.sections[focus.sectionIndex]?.title}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onFocus(null)}>
          Cerrar
        </Button>
      </div>
      <ShowIfEditor
        label="Mostrar esta pregunta solo si…"
        showIf={field.showIf}
        sections={value.sections}
        excludeFieldId={field.id}
        onChange={(showIf) => onUpdateField(focus.sectionIndex, focus.fieldIndex, { showIf })}
      />
    </div>
  );
}

/** Editor compacto Si → Entonces (sin muros de texto). */
function ShowIfEditor({
  label,
  showIf,
  sections,
  excludeFieldId,
  onChange,
}: {
  label: string;
  showIf: IntegrationShowIf | undefined;
  sections: IntegrationSection[];
  excludeFieldId?: string;
  onChange: (showIf: IntegrationShowIf | undefined) => void;
}) {
  const triggerFields = sections
    .flatMap((s) => s.fields)
    .filter(
      (f) =>
        f.id !== excludeFieldId &&
        (f.type === "single_choice" || f.type === "multiple_choice" || f.type === "checkbox"),
    );
  const allTriggers = sections
    .flatMap((s) => s.fields)
    .filter((f) => f.id !== excludeFieldId);

  const trigger = showIf?.field ? findFieldById(sections, showIf.field) : undefined;
  const triggerOptions = trigger?.options ?? [];
  const triggerIsChoice =
    trigger?.type === "single_choice" ||
    trigger?.type === "multiple_choice" ||
    trigger?.type === "checkbox";

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-[#5b8fd4]" />
        <p className="text-sm font-semibold">{label}</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Si responden…</Label>
          <Select
            value={showIf?.field ?? "siempre"}
            onValueChange={(next) => {
              if (next === "siempre") {
                onChange(undefined);
                return;
              }
              const src = findFieldById(sections, next);
              const firstOpt = src?.options?.[0]?.value ?? "";
              onChange(
                src?.type === "multiple_choice"
                  ? { field: next, includes: firstOpt }
                  : { field: next, equals: firstOpt || showIf?.equals || "" },
              );
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="siempre">Siempre visible</SelectItem>
              {(triggerFields.length > 0 ? triggerFields : allTriggers).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showIf?.field && (
          <div>
            <Label className="text-xs text-muted-foreground">
              {trigger?.type === "multiple_choice"
                ? "…y eligen (incluye)"
                : triggerIsChoice
                  ? "…y eligen"
                  : "…y el valor es"}
            </Label>
            {triggerOptions.length > 0 ? (
              <Select
                value={showIf.equals ?? showIf.includes ?? ""}
                onValueChange={(val) =>
                  onChange(
                    trigger?.type === "multiple_choice"
                      ? { field: showIf.field, includes: val }
                      : { field: showIf.field, equals: val },
                  )
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
                value={showIf.equals ?? "true"}
                onValueChange={(val) => onChange({ field: showIf.field, equals: val })}
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
                value={showIf.equals ?? ""}
                onChange={(e) => onChange({ field: showIf.field, equals: e.target.value })}
                placeholder="Valor exacto"
              />
            )}
          </div>
        )}
      </div>

      {showIf?.field && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Entonces: </span>
          se muestra si {formatConditionShort(showIf, sections)?.replace(" → ", " = ") ?? "…"}
        </p>
      )}

      {showIf?.field && (
        <Button variant="outline" size="sm" onClick={() => onChange(undefined)}>
          Quitar condición
        </Button>
      )}
    </div>
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
        <h2 className="font-heading text-xl font-semibold">Diseño</h2>
        <p className="mt-1 text-sm text-muted-foreground">Plantillas y personalización del fondo.</p>
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
        </div>

        <div className="min-w-0">
          <Label>Velo oscuro ({theme?.overlayOpacity ?? 0}%)</Label>
          <Slider
            className="mt-4 w-full max-w-full"
            min={0}
            max={100}
            step={1}
            value={[theme?.overlayOpacity ?? 0]}
            onValueChange={([v]) => onChange({ overlayOpacity: v ?? 0 })}
          />
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
              <Select
                value={theme?.imageFit ?? "cover"}
                onValueChange={(imageFit) => onChange({ imageFit: imageFit as IntegrationImageFit })}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cubrir</SelectItem>
                  <SelectItem value="contain">Contener</SelectItem>
                  <SelectItem value="auto">Tamaño original</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Posición</Label>
              <Select
                value={theme?.imagePosition ?? "center"}
                onValueChange={(imagePosition) =>
                  onChange({ imagePosition: imagePosition as IntegrationImagePosition })
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="top">Arriba</SelectItem>
                  <SelectItem value="bottom">Abajo</SelectItem>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Anclaje</Label>
              <Select
                value={theme?.imageAttachment ?? "fixed"}
                onValueChange={(imageAttachment) =>
                  onChange({ imageAttachment: imageAttachment as IntegrationImageAttachment })
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fijo</SelectItem>
                  <SelectItem value="scroll">Con el scroll</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Repetición</Label>
              <Select
                value={theme?.imageRepeat ?? "no-repeat"}
                onValueChange={(imageRepeat) =>
                  onChange({ imageRepeat: imageRepeat as IntegrationImageRepeat })
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
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
                onValueChange={([v]) => onChange({ imageOpacity: v ?? 0 })}
              />
            </div>
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
  onOpenLogic,
}: {
  section: IntegrationSection;
  sections: IntegrationSection[];
  onChange: (patch: Partial<IntegrationSection>) => void;
  onDelete: () => void;
  onAddField: () => void;
  onOpenLogic: () => void;
}) {
  const condition = getSectionCondition(section);
  const summary = formatConditionShort(condition, sections);

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Sección</h2>
          <p className="mt-1 text-sm text-muted-foreground">Un paso del formulario.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="shrink-0" onClick={onOpenLogic}>
            <GitBranch className="h-4 w-4" />
            Lógica
            {summary && (
              <span className="ml-1 hidden max-w-[140px] truncate text-xs text-[#5b8fd4] sm:inline">
                · activa
              </span>
            )}
          </Button>
          <Button variant="outline" className="shrink-0" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label="Título de la sección" value={section.title} onChange={(title) => onChange({ title })} />
        <Field label="Subtítulo" value={section.subtitle ?? ""} onChange={(subtitle) => onChange({ subtitle })} />
      </div>

      {summary && (
        <button
          type="button"
          onClick={onOpenLogic}
          className="flex w-full items-center gap-2 rounded-xl border border-[#5b8fd4]/30 bg-[#5b8fd4]/5 px-3 py-2 text-left text-xs text-[#5b8fd4] transition hover:bg-[#5b8fd4]/10"
        >
          <GitBranch className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">Se muestra si {summary.replace(" → ", " = ")}</span>
        </button>
      )}

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
  onOpenLogic,
}: {
  field: IntegrationField;
  sectionIndex: number;
  sections: IntegrationSection[];
  onChange: (patch: Partial<IntegrationField>) => void;
  onMove: (sectionIndex: number) => void;
  onDelete: () => void;
  onOpenLogic: () => void;
}) {
  const isChoice = field.type === "single_choice" || field.type === "multiple_choice";
  const summary = formatConditionShort(field.showIf, sections);

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-hidden">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="font-heading text-xl font-semibold">Pregunta</h2>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={onOpenLogic}>
            <GitBranch className="h-4 w-4" />
            Lógica
            {summary && <span className="ml-1 text-xs text-[#5b8fd4]">· activa</span>}
          </Button>
          <Select value={String(sectionIndex)} onValueChange={(next) => onMove(Number(next))}>
            <SelectTrigger className="h-9 w-full min-w-0 sm:w-[200px]">
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

      {summary && (
        <button
          type="button"
          onClick={onOpenLogic}
          className="flex w-full items-center gap-2 rounded-xl border border-[#5b8fd4]/30 bg-[#5b8fd4]/5 px-3 py-2 text-left text-xs text-[#5b8fd4] transition hover:bg-[#5b8fd4]/10"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">Se muestra si {summary.replace(" → ", " = ")}</span>
        </button>
      )}

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
                {Object.entries(FIELD_TYPE_LABELS).map(([type, typeLabel]) => (
                  <SelectItem key={type} value={type}>
                    {typeLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Area
            label="Descripción o ayuda (puedes usar emojis 💙)"
            value={field.description ?? ""}
            onChange={(description) => onChange({ description })}
          />
          <Field
            label="Placeholder"
            value={field.placeholder ?? ""}
            onChange={(placeholder) => onChange({ placeholder })}
          />
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
                <Input
                  className="mt-1"
                  type="number"
                  value={field.min ?? 0}
                  onChange={(e) => onChange({ min: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Máximo</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={field.max ?? 100}
                  onChange={(e) => onChange({ max: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isChoice && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Label>Opciones ({field.options?.length ?? 0})</Label>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                const label = "Nueva opción";
                onChange({
                  options: [...(field.options ?? []), { value: slugifyOptionValue(label), label }],
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Agregar opción
            </Button>
          </div>
          {(field.options ?? []).map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              className="grid min-w-0 gap-2 rounded-xl border p-3 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0 space-y-2">
                <Input
                  className="min-w-0"
                  value={option.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const options = (field.options ?? []).map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            label,
                            value:
                              !item.value || item.value.startsWith("opcion-")
                                ? slugifyOptionValue(label)
                                : item.value,
                          }
                        : item,
                    );
                    onChange({ options });
                  }}
                  placeholder="Texto de la opción"
                />
                <Textarea
                  value={option.description ?? ""}
                  onChange={(e) => {
                    const options = (field.options ?? []).map((item, i) =>
                      i === index ? { ...item, description: e.target.value } : item,
                    );
                    onChange({ options });
                  }}
                  placeholder="Descripción (opcional)"
                  className="min-h-[60px]"
                />
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none hover:text-foreground">
                    Avanzado: valor interno y sigla
                  </summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Input
                      className="font-mono text-xs"
                      value={option.value}
                      onChange={(e) => {
                        const options = (field.options ?? []).map((item, i) =>
                          i === index ? { ...item, value: e.target.value.trim() || item.value } : item,
                        );
                        onChange({ options });
                      }}
                      placeholder="valor-interno"
                    />
                    <Input
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
                </details>
              </div>
              <div className="flex items-start justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange({ options: (field.options ?? []).filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
