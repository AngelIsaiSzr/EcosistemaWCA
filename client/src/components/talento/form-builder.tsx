import { useMemo, useState, type ReactNode } from "react";
import { GitBranch, LayoutGrid, Palette } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  IntegrationField,
  IntegrationFieldType,
  IntegrationFormDefinition,
  IntegrationSection,
  IntegrationShowIf,
  IntegrationTheme,
  createEmptyField,
  newFieldId,
} from "@shared/integration-form";
import type { CatalogItem } from "./form-builder-catalog-data";
import { FormBuilderCatalog } from "./form-builder-catalog";
import { FormBuilderFieldSettings } from "./form-builder-field-settings";
import { FormBuilderCanvas, type BuilderSelection } from "./form-builder-canvas";
import { FormBuilderDesign } from "./form-builder-design";

type BuilderMode = "elementos" | "diseno" | "logica";

type AsideMode = "catalog" | "settings";

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

function findFieldById(sections: IntegrationSection[], id: string): IntegrationField | undefined {
  for (const section of sections) {
    const found = section.fields.find((f) => f.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Sección real (no bienvenida) más cercana en la dirección indicada. */
function neighborSectionIndex(
  sections: IntegrationSection[],
  from: number,
  direction: -1 | 1,
): number | null {
  let i = from + direction;
  while (i >= 0 && i < sections.length) {
    if (!sections[i]?.isWelcome) return i;
    i += direction;
  }
  return null;
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

export function IntegrationFormBuilder({
  value,
  onChange,
}: {
  value: IntegrationFormDefinition;
  onChange: (next: IntegrationFormDefinition) => void;
}) {
  const [mode, setMode] = useState<BuilderMode>("elementos");
  const [asideMode, setAsideMode] = useState<AsideMode>("catalog");
  const [selection, setSelection] = useState<BuilderSelection>({ kind: "welcome" });
  const [logicFocus, setLogicFocus] = useState<LogicTarget | null>(null);

  const update = (patch: Partial<IntegrationFormDefinition>) => onChange({ ...value, ...patch });
  const updateTheme = (patch: Partial<IntegrationTheme>) => {
    const next: IntegrationTheme = { ...value.theme, ...patch };
    if ("background" in patch && patch.background === undefined) {
      delete next.background;
    }
    onChange({ ...value, theme: next });
  };

  const updateSection = (index: number, patch: Partial<IntegrationSection>) => {
    const sections = value.sections.map((section, i) =>
      i === index ? { ...section, ...patch } : section,
    );
    onChange({ ...value, sections });
  };

  const updateField = (
    sectionIndex: number,
    fieldIndex: number,
    patch: Partial<IntegrationField>,
  ) => {
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
    setSelection({ kind: "section", sectionIndex: value.sections.length });
  };

  /** Sección donde caen los campos nuevos: la última tocada, la última real, o una nueva. */
  const targetSectionIndex = (sections: IntegrationSection[]): number => {
    if (
      (selection.kind === "section" || selection.kind === "field") &&
      sections[selection.sectionIndex] &&
      !sections[selection.sectionIndex].isWelcome
    ) {
      return selection.sectionIndex;
    }
    for (let i = sections.length - 1; i >= 0; i--) {
      if (!sections[i].isWelcome) return i;
    }
    return -1;
  };

  const addFieldOfType = (type: IntegrationFieldType) => {
    const sections = value.sections.map((section) => ({ ...section, fields: [...section.fields] }));
    let index = targetSectionIndex(sections);
    if (index < 0) {
      sections.push({
        id: newFieldId("seccion"),
        title: "Nueva sección",
        subtitle: "",
        fields: [],
      });
      index = sections.length - 1;
    }
    sections[index].fields.push(createEmptyField(type));
    onChange({ ...value, sections });
    setSelection({
      kind: "field",
      sectionIndex: index,
      fieldIndex: sections[index].fields.length - 1,
    });
  };

  /** Inserta un campo en una posición exacta (arrastre desde el catálogo). */
  const insertFieldAt = (
    sectionIndex: number,
    fieldIndex: number,
    type: IntegrationFieldType,
  ) => {
    const section = value.sections[sectionIndex];
    if (!section) return;
    const fields = [...section.fields];
    const index = Math.max(0, Math.min(fieldIndex, fields.length));
    fields.splice(index, 0, createEmptyField(type));
    const sections = value.sections.map((item, i) =>
      i === sectionIndex ? { ...item, fields } : item,
    );
    onChange({ ...value, sections });
    setSelection({ kind: "field", sectionIndex, fieldIndex: index });
  };

  /** Mueve una pregunta a una posición concreta, dentro o entre secciones. */
  const moveFieldTo = (
    from: { sectionIndex: number; fieldIndex: number },
    to: { sectionIndex: number; fieldIndex: number },
  ) => {
    const sections = value.sections.map((section) => ({ ...section, fields: [...section.fields] }));
    const source = sections[from.sectionIndex];
    const target = sections[to.sectionIndex];
    if (!source || !target) return;
    const [field] = source.fields.splice(from.fieldIndex, 1);
    if (!field) return;

    let index = to.fieldIndex;
    if (from.sectionIndex === to.sectionIndex && from.fieldIndex < to.fieldIndex) index -= 1;
    index = Math.max(0, Math.min(index, target.fields.length));
    target.fields.splice(index, 0, field);

    onChange({ ...value, sections });
    setSelection({ kind: "field", sectionIndex: to.sectionIndex, fieldIndex: index });
  };

  const handlePick = (item: CatalogItem) => {
    if (item.kind === "structure") {
      if (item.id === "welcome") setSelection({ kind: "welcome" });
      else if (item.id === "ending") setSelection({ kind: "ending" });
      else addSection();
      return;
    }
    addFieldOfType(item.type);
  };

  const duplicateBlock = (target: BuilderSelection) => {
    if (target.kind === "section") {
      const section = value.sections[target.sectionIndex];
      if (!section) return;
      const copy: IntegrationSection = {
        ...section,
        id: newFieldId("seccion"),
        title: `${section.title} (copia)`,
        fields: section.fields.map((field) => ({ ...field, id: newFieldId() })),
      };
      const sections = [...value.sections];
      sections.splice(target.sectionIndex + 1, 0, copy);
      onChange({ ...value, sections });
      setSelection({ kind: "section", sectionIndex: target.sectionIndex + 1 });
      return;
    }
    if (target.kind !== "field") return;
    const field = value.sections[target.sectionIndex]?.fields[target.fieldIndex];
    if (!field) return;
    const sections = value.sections.map((section, i) => {
      if (i !== target.sectionIndex) return section;
      const fields = [...section.fields];
      fields.splice(target.fieldIndex + 1, 0, { ...field, id: newFieldId() });
      return { ...section, fields };
    });
    onChange({ ...value, sections });
    setSelection({
      kind: "field",
      sectionIndex: target.sectionIndex,
      fieldIndex: target.fieldIndex + 1,
    });
  };

  const moveBlock = (target: BuilderSelection, direction: -1 | 1) => {
    if (target.kind === "section") {
      const dest = neighborSectionIndex(value.sections, target.sectionIndex, direction);
      if (dest == null) return;
      onChange({ ...value, sections: moveItem(value.sections, target.sectionIndex, dest) });
      setSelection({ kind: "section", sectionIndex: dest });
      return;
    }
    if (target.kind !== "field") return;
    const section = value.sections[target.sectionIndex];
    if (!section) return;

    const within = target.fieldIndex + direction;
    if (within >= 0 && within < section.fields.length) {
      const sections = value.sections.map((item, i) =>
        i === target.sectionIndex
          ? { ...item, fields: moveItem(item.fields, target.fieldIndex, within) }
          : item,
      );
      onChange({ ...value, sections });
      setSelection({ kind: "field", sectionIndex: target.sectionIndex, fieldIndex: within });
      return;
    }

    const dest = neighborSectionIndex(value.sections, target.sectionIndex, direction);
    if (dest == null) return;
    const sections = value.sections.map((item) => ({ ...item, fields: [...item.fields] }));
    const [field] = sections[target.sectionIndex].fields.splice(target.fieldIndex, 1);
    if (!field) return;
    const destIndex = direction === -1 ? sections[dest].fields.length : 0;
    sections[dest].fields.splice(destIndex, 0, field);
    onChange({ ...value, sections });
    setSelection({ kind: "field", sectionIndex: dest, fieldIndex: destIndex });
  };

  const deleteBlock = (target: BuilderSelection) => {
    if (target.kind === "section") {
      onChange({
        ...value,
        sections: value.sections.filter((_, i) => i !== target.sectionIndex),
      });
      setSelection({ kind: "welcome" });
      setAsideMode("catalog");
      return;
    }
    if (target.kind !== "field") return;
    const section = value.sections[target.sectionIndex];
    if (!section) return;
    updateSection(target.sectionIndex, {
      fields: section.fields.filter((_, i) => i !== target.fieldIndex),
    });
    setSelection({ kind: "section", sectionIndex: target.sectionIndex });
    setAsideMode("catalog");
  };

  const openLogic = (target: LogicTarget) => {
    setLogicFocus(target);
    setMode("logica");
    if (target.kind === "section") setSelection({ kind: "section", sectionIndex: target.sectionIndex });
    else
      setSelection({
        kind: "field",
        sectionIndex: target.sectionIndex,
        fieldIndex: target.fieldIndex,
      });
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
    <div className="flex h-[min(78vh,880px)] min-h-[560px] w-full min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card">
      {/* Rail estilo forms.app */}
      <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r bg-muted/30 py-3">
        <ModeTab
          active={mode === "elementos"}
          icon={LayoutGrid}
          label="Elementos"
          onClick={() => {
            setMode("elementos");
            setAsideMode("catalog");
          }}
        />
        <ModeTab
          active={mode === "diseno"}
          icon={Palette}
          label="Diseño"
          onClick={() => setMode("diseno")}
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
      <aside className="flex w-full max-w-[300px] shrink-0 flex-col overflow-hidden border-r bg-card sm:max-w-[320px]">
        {mode === "elementos" &&
          (asideMode === "settings" ? (
            <FormBuilderFieldSettings
              definition={value}
              selection={selection}
              onClose={() => setAsideMode("catalog")}
              onUpdateDefinition={update}
              onUpdateSection={updateSection}
              onUpdateField={updateField}
            />
          ) : (
            <FormBuilderCatalog onPick={handlePick} />
          ))}

        {mode === "diseno" && (
          <FormBuilderDesign theme={value.theme} onChange={updateTheme} />
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
      {mode === "elementos" || mode === "diseno" ? (
        <FormBuilderCanvas
          definition={value}
          selection={mode === "elementos" ? selection : null}
          onSelect={mode === "elementos" ? setSelection : () => {}}
          onOpenSettings={
            mode === "elementos"
              ? (target) => {
                  setSelection(target);
                  setAsideMode("settings");
                }
              : () => {}
          }
          onUpdateDefinition={mode === "elementos" ? update : () => {}}
          onUpdateSection={mode === "elementos" ? updateSection : () => {}}
          onUpdateField={mode === "elementos" ? updateField : () => {}}
          onDuplicate={mode === "elementos" ? duplicateBlock : () => {}}
          onMove={mode === "elementos" ? moveBlock : () => {}}
          onDelete={mode === "elementos" ? deleteBlock : () => {}}
          onInsertField={mode === "elementos" ? insertFieldAt : undefined}
          onMoveFieldTo={mode === "elementos" ? moveFieldTo : undefined}
        />
      ) : (
        <section className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <LogicCanvas
            value={value}
            focus={logicFocus}
            onFocus={setLogicFocus}
            onSetSectionBranch={setSectionBranch}
            onUpdateField={updateField}
            onOpenLogic={openLogic}
          />
        </section>
      )}
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
        Si → entonces mostrar. Elige una regla o una sección/pregunta de la lista.
      </p>

      {rules.length === 0 && (
        <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          Aún no hay condiciones. Elige una sección o pregunta abajo para crear la primera.
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
  onOpenLogic,
}: {
  value: IntegrationFormDefinition;
  focus: LogicTarget | null;
  onFocus: (t: LogicTarget | null) => void;
  onSetSectionBranch: (sectionIndex: number, showIf: IntegrationShowIf | undefined) => void;
  onUpdateField: (sectionIndex: number, fieldIndex: number, patch: Partial<IntegrationField>) => void;
  onOpenLogic: (target: LogicTarget) => void;
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
        (f.type === "single_choice" ||
          f.type === "multiple_choice" ||
          f.type === "checkbox" ||
          f.type === "yes_no" ||
          f.type === "dropdown"),
    );
  const allTriggers = sections
    .flatMap((s) => s.fields)
    .filter((f) => f.id !== excludeFieldId);

  const trigger = showIf?.field ? findFieldById(sections, showIf.field) : undefined;
  const triggerOptions = trigger?.options ?? [];
  const triggerIsChoice =
    trigger?.type === "single_choice" ||
    trigger?.type === "multiple_choice" ||
    trigger?.type === "checkbox" ||
    trigger?.type === "yes_no" ||
    trigger?.type === "dropdown";

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
