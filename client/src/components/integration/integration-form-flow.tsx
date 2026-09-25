import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, CircleCheck, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  IntegrationFormDefinition,
  PHONE_COUNTRIES,
  countryFlagUrl,
  getAllFields,
  isDisplayOnlyField,
  isFieldVisible,
  isSectionVisible,
  isValidEmail,
  isValidHttpUrl,
  isValidPhoneNumber,
  normalizeUrl,
  pruneInvisibleAnswers,
  themeControlRadius,
  type IntegrationCornerStyle,
  type IntegrationFileAnswer,
} from "@shared/integration-form";
import { WcaLogo } from "@/components/integration/wca-logo";

type Answers = Record<string, unknown>;

interface IntegrationFormFlowProps {
  definition: IntegrationFormDefinition;
  slug: string;
  preview?: boolean;
}

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const emojiFont = "[font-family:Inter,'Segoe UI Emoji','Noto Color Emoji','Apple Color Emoji',sans-serif]";
const controlBase =
  "h-12 border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#87b1e0] focus-visible:shadow-[0_0_0_2px_#5b8fd4]";

function controlClass(cornerStyle?: IntegrationCornerStyle) {
  return cn(controlBase, themeControlRadius(cornerStyle));
}

function emptyAnswers(definition: IntegrationFormDefinition): Answers {
  const answers: Answers = {
    phone: { dial: "+52", number: "" },
    privacyConsent: false,
  };
  for (const field of definition.sections.flatMap((s) => s.fields)) {
    if (field.type === "multiple_choice") answers[field.id] = [];
    if (field.type === "checkbox") answers[field.id] = false;
  }
  return answers;
}

function visibleFields(fields: IntegrationField[], answers: Answers) {
  return fields.filter((field) => isFieldVisible(field, answers));
}

function validateField(field: IntegrationField, value: unknown): string | null {
  if (isDisplayOnlyField(field.type)) return null;

  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && value.length === 0) ||
    (field.type === "file" &&
      typeof value === "object" &&
      value !== null &&
      !(value as IntegrationFileAnswer).url);

  if (field.type === "checkbox") {
    if (field.required && value !== true) return "Debes aceptar para continuar.";
    return null;
  }

  if (field.type === "phone") {
    const phone = value as { dial?: string; number?: string } | undefined;
    if (field.required && !phone?.number?.trim()) return "El teléfono es requerido.";
    if (phone?.number?.trim() && !isValidPhoneNumber(phone.number)) {
      return "Ingresa un número de 8 a 15 dígitos, sin la lada.";
    }
    return null;
  }

  if (field.required && empty) return "Este campo es requerido.";
  if (empty) return null;

  if (field.type === "email" && !isValidEmail(String(value))) {
    return "Ingresa un correo válido, por ejemplo nombre@correo.com";
  }
  if (field.type === "url" && !isValidHttpUrl(String(value))) {
    return "Ingresa un enlace válido (puedes pegar LinkedIn o Drive con o sin https).";
  }
  if (field.type === "number" || field.type === "rating") {
    const num = Number(value);
    if (Number.isNaN(num) || (field.type === "number" && !Number.isInteger(num))) {
      return field.type === "rating" ? "Elige una calificación." : "Ingresa un número entero.";
    }
    const min = field.min ?? (field.type === "rating" ? 1 : 0);
    const max = field.max ?? (field.type === "rating" ? 5 : 100);
    if (num < min || num > max) return `El valor debe estar entre ${min} y ${max}.`;
  }
  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return "Ingresa una fecha válida.";
  }
  if (field.type === "time" && !/^\d{2}:\d{2}$/.test(String(value))) {
    return "Ingresa una hora válida.";
  }
  if (field.type === "yes_no" && value !== "si" && value !== "no") {
    return "Elige Sí o No.";
  }
  return null;
}

type DraftPayload = {
  answers: Answers;
  step: number;
  otherValues: Record<string, string>;
  savedAt: number;
};

function draftStorageKey(slug: string) {
  return `integration-form-draft:v1:${slug}`;
}

function readDraft(slug: string): DraftPayload | null {
  try {
    const raw = localStorage.getItem(draftStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(slug: string, payload: Omit<DraftPayload, "savedAt">) {
  try {
    localStorage.setItem(
      draftStorageKey(slug),
      JSON.stringify({ ...payload, savedAt: Date.now() }),
    );
  } catch {
    // quota / private mode
  }
}

function clearDraft(slug: string) {
  try {
    localStorage.removeItem(draftStorageKey(slug));
  } catch {
    // ignore
  }
}

function initialAnswers(definition: IntegrationFormDefinition, slug: string, preview?: boolean): Answers {
  const base = emptyAnswers(definition);
  if (preview) return base;
  const draft = readDraft(slug);
  if (!draft?.answers) return base;
  return { ...base, ...draft.answers };
}

function initialStep(definition: IntegrationFormDefinition, slug: string, preview?: boolean): number {
  if (preview) return 0;
  const draft = readDraft(slug);
  if (!draft || typeof draft.step !== "number") return 0;
  const max = Math.max(0, definition.sections.length - 1);
  return Math.min(Math.max(0, Math.floor(draft.step)), max);
}

function initialOtherValues(slug: string, preview?: boolean): Record<string, string> {
  if (preview) return {};
  const draft = readDraft(slug);
  return draft?.otherValues && typeof draft.otherValues === "object" ? draft.otherValues : {};
}

export function IntegrationFormFlow({ definition, slug, preview }: IntegrationFormFlowProps) {
  const sections = definition.sections;
  const [step, setStep] = useState(() => initialStep(definition, slug, preview));
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers(definition, slug, preview));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [otherValues, setOtherValues] = useState<Record<string, string>>(() =>
    initialOtherValues(slug, preview),
  );

  const section = sections[step];

  // Persistir progreso en caché local (sirve sin cuenta; con cuenta sigue siendo por dispositivo).
  useEffect(() => {
    if (preview || submitted) return;
    const timer = window.setTimeout(() => {
      writeDraft(slug, { answers, step, otherValues });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [answers, step, otherValues, slug, preview, submitted]);

  const sectionIsActive = (index: number, currentAnswers: Answers) => {
    const s = sections[index];
    if (!s) return false;
    return isSectionVisible(s, currentAnswers);
  };

  const findStep = (from: number, direction: 1 | -1, currentAnswers: Answers) => {
    let i = from + direction;
    while (i >= 0 && i < sections.length) {
      if (sectionIsActive(i, currentAnswers)) return i;
      i += direction;
    }
    return from;
  };

  const isLast =
    step === sections.length - 1 ||
    findStep(step, 1, answers) === step;

  const currentFields = useMemo(
    () => (section ? visibleFields(section.fields, answers) : []),
    [section, answers],
  );

  useEffect(() => {
    if (!section || section.isWelcome) return;
    if (currentFields.length > 0) return;
    const next = findStep(step, 1, answers);
    if (next !== step) setStep(next);
    else {
      const prev = findStep(step, -1, answers);
      if (prev !== step) setStep(prev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react when visibility collapses
  }, [step, answers, currentFields.length]);

  useEffect(() => {
    const scrollTop = () => {
      const shell = document.querySelector(".integration-form-shell");
      if (shell instanceof HTMLElement) {
        shell.scrollTo({ top: 0, behavior: "smooth" });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const timer = window.setTimeout(scrollTop, 40);
    return () => window.clearTimeout(timer);
  }, [step, submitted]);

  const setValue = (id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const validateSection = () => {
    const nextErrors: Record<string, string> = {};
    for (const field of currentFields) {
      const message = validateField(field, answers[field.id]);
      if (message) nextErrors[field.id] = message;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = async () => {
    if (section?.isWelcome) {
      setStep((s) => findStep(s, 1, answers));
      return;
    }
    if (!validateSection()) return;
    const next = findStep(step, 1, answers);
    if (next !== step) {
      setStep(next);
      return;
    }
    if (preview) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      let payload = { ...answers };
      for (const field of getAllFields(definition)) {
        if (field.type === "url" && typeof payload[field.id] === "string" && String(payload[field.id]).trim()) {
          payload[field.id] = normalizeUrl(String(payload[field.id]));
        }
      }
      for (const [fieldId, extra] of Object.entries(otherValues)) {
        if (!extra.trim()) continue;
        const current = payload[fieldId];
        if (Array.isArray(current) && current.includes("otro")) {
          payload[fieldId] = [...current.filter((v) => v !== "otro"), extra.trim()];
        }
      }
      payload = pruneInvisibleAnswers(definition, payload);
      const res = await fetch(`/api/integration/public/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setSubmitError(data.message || "Este correo ya envió el formulario.");
        return;
      }
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setSubmitError(data.message || "No se pudo enviar. Revisa los campos.");
        return;
      }
      clearDraft(slug);
      setSubmitted(true);
    } catch {
      setSubmitError("Hubo un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative z-10 mx-auto flex max-w-2xl flex-col items-center justify-center px-6 text-center",
          preview ? "min-h-[640px]" : "min-h-[100dvh]",
          emojiFont,
        )}
      >
        {preview && (
          <p className="mb-4 rounded-full bg-amber-400/15 px-4 py-1 text-sm text-amber-200">
            Modo de prueba: no se guardó ninguna respuesta
          </p>
        )}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#87b1e0] text-white shadow-lg shadow-[#87b1e0]/30">
          <CircleCheck className="h-12 w-12" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-white md:text-4xl">
          {definition.ending.title}
        </h1>
        <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-white/85">
          {definition.ending.message}
        </p>
      </motion.div>
    );
  }

  return (
    <div className={cn("relative z-10 mx-auto flex w-full max-w-2xl flex-col px-5 py-8 md:px-8", preview ? "min-h-[640px]" : "min-h-[100dvh]", emojiFont)}>
      {preview && (
        <div className="mb-4 shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-sm text-amber-100">
          Vista previa de prueba. Al enviar no se guardan datos reales.
        </div>
      )}

      <div className="flex flex-1 flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={section?.id ?? step}
          variants={fade}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn("flex flex-1 flex-col overflow-visible", section?.isWelcome && "justify-center")}
        >
          {section?.isWelcome ? (
            <div className="flex flex-col items-center text-center">
              <WcaLogo alt="Ecosistema WCA" className="mb-6 h-16 w-16 object-contain" />
              <p className="mb-2 text-sm tracking-wide text-[#87b1e0]">{definition.subtitle}</p>
              <h1 className="font-heading text-4xl font-bold text-white md:text-5xl">{definition.title}</h1>
              <p className="mt-5 max-w-xl text-lg text-white/80">{definition.description}</p>
              <p className="mt-3 max-w-xl text-base text-white/70">{definition.cta}</p>
              <Button
                type="button"
                onClick={goNext}
                className="mt-10 h-12 rounded-full bg-[#5b8fd4] px-8 text-base font-semibold text-white hover:bg-[#4a7fc4]"
              >
                Iniciar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-1 text-sm font-medium text-[#87b1e0]">{section?.title}</p>
              {section?.subtitle && <p className="mb-8 text-white/65">{section.subtitle}</p>}
              <div className="space-y-7">
                <AnimatePresence initial={false}>
                  {currentFields.map((field) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="overflow-visible"
                    >
                      <FieldControl
                        field={field}
                        value={answers[field.id]}
                        error={errors[field.id]}
                        slug={slug}
                        cornerStyle={
                          definition.theme?.customizeEnabled
                            ? definition.theme?.cornerStyle
                            : undefined
                        }
                        otherValue={otherValues[field.id] ?? ""}
                        onOtherChange={(text) => setOtherValues((prev) => ({ ...prev, [field.id]: text }))}
                        onChange={(value) => setValue(field.id, value)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {submitError && (
        <p className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {submitError}
        </p>
      )}

      {!section?.isWelcome && (
      <div className="mt-10 flex items-center justify-between gap-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => findStep(s, -1, answers))}
            className="inline-flex items-center gap-1 text-white/90 transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          onClick={goNext}
          disabled={submitting}
          className="h-12 rounded-full bg-[#5b8fd4] px-8 text-base font-semibold text-white hover:bg-[#4a7fc4]"
        >
          {isLast ? (submitting ? "Enviando..." : "Enviar") : "Siguiente"}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
      )}
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  error,
  onChange,
  otherValue,
  onOtherChange,
  slug,
  cornerStyle,
}: {
  field: IntegrationField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
  slug: string;
  cornerStyle?: IntegrationCornerStyle;
}) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const [uploading, setUploading] = useState(false);
  const radius = themeControlRadius(cornerStyle);
  const ctrl = controlClass(cornerStyle);

  const toggleMulti = (optionValue: string) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue));
    } else {
      onChange([...selected, optionValue]);
    }
  };

  const uploadFile = async (file: File, kind: "image" | "file") => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(
        `/api/integration/public/${encodeURIComponent(slug)}/upload?kind=${kind}`,
        { method: "POST", body, credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al subir");
      if (kind === "image") onChange(data.url);
      else onChange({ name: data.name, url: data.url, size: data.size } satisfies IntegrationFileAnswer);
    } catch {
      /* keep previous */
    } finally {
      setUploading(false);
    }
  };

  if (field.type === "separator") {
    return (
      <div className="py-2">
        <div className="border-t border-dashed border-white/25" />
        {field.label && field.label !== "Separador" && (
          <p className="mt-2 text-center text-xs uppercase tracking-wide text-white/40">{field.label}</p>
        )}
      </div>
    );
  }

  if (field.type === "explanation") {
    return (
      <div className={cn(radius, "border border-white/10 bg-white/5 px-4 py-4")}>
        <p className="text-lg font-semibold text-white">{field.label}</p>
        {field.description && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/70">{field.description}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {field.type !== "checkbox" && (
        <>
          <label className="block text-xl font-semibold text-white">
            {field.label}
            {field.required && <span className="text-[#87b1e0]"> *</span>}
          </label>
          {field.description && (
            <p className="mt-1 text-sm text-white/60">{field.description}</p>
          )}
        </>
      )}

      <div className="mt-3 overflow-visible p-1">
        {field.type === "short_text" && (
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className={ctrl}
          />
        )}
        {field.type === "email" && (
          <Input
            type="text"
            inputMode="email"
            autoComplete="email"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={ctrl}
          />
        )}
        {field.type === "url" && (
          <Input
            type="text"
            inputMode="url"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next) onChange(normalizeUrl(next));
            }}
            placeholder={field.placeholder}
            className={ctrl}
          />
        )}
        {field.type === "number" && (
          <Input
            type="number"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={1}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={field.placeholder}
            className={cn(ctrl, "integration-number-input")}
          />
        )}
        {field.type === "long_text" && (
          <Textarea
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(ctrl, "min-h-[140px] h-auto")}
          />
        )}
        {field.type === "phone" && <PhoneField value={value} onChange={onChange} cornerStyle={cornerStyle} />}
        {field.type === "date" && (
          <Input type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={ctrl} />
        )}
        {field.type === "time" && (
          <Input type="time" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={ctrl} />
        )}
        {field.type === "yes_no" && (
          <div className="grid grid-cols-2 gap-3">
            {(field.options?.length
              ? field.options
              : [
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                ]
            ).map((option) => {
              const active = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "border px-4 py-4 text-center font-medium transition",
                    radius,
                    active ? "border-[#87b1e0] bg-[#87b1e0]/15 text-white" : "border-white/10 bg-white/5 text-white/80",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
        {field.type === "dropdown" && (
          <Select value={String(value ?? "") || undefined} onValueChange={onChange}>
            <SelectTrigger className={ctrl}>
              <SelectValue placeholder={field.placeholder || "Elige una opción"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {field.type === "rating" && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: (field.max ?? 5) - (field.min ?? 1) + 1 }, (_, i) => (field.min ?? 1) + i).map(
              (n) => {
                const active = Number(value) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className="rounded-lg p-1 transition hover:scale-110"
                    aria-label={`${n} estrellas`}
                  >
                    <Star className={cn("h-8 w-8", active ? "fill-[#87b1e0] text-[#87b1e0]" : "text-white/30")} />
                  </button>
                );
              },
            )}
          </div>
        )}
        {(field.type === "image_upload" || field.type === "file") && (
          <div className="space-y-3">
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-white/20 bg-white/5 px-4 py-8 text-sm text-white/70 transition hover:border-[#87b1e0]/50",
                radius,
                uploading && "opacity-60",
              )}
            >
              <Upload className="h-6 w-6 text-[#87b1e0]" />
              <span>
                {uploading
                  ? "Subiendo…"
                  : field.type === "image_upload"
                    ? "Elige una imagen"
                    : "Elige un archivo"}
              </span>
              <input
                type="file"
                className="hidden"
                accept={field.type === "image_upload" ? "image/jpeg,image/png,image/webp,image/gif" : undefined}
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file, field.type === "image_upload" ? "image" : "file");
                  e.target.value = "";
                }}
              />
            </label>
            {field.type === "image_upload" && typeof value === "string" && value ? (
              <img src={value} alt="" className="max-h-40 rounded-xl border border-white/10 object-contain" />
            ) : null}
            {field.type === "file" && value && typeof value === "object" ? (
              <a
                href={(value as IntegrationFileAnswer).url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#87b1e0] underline-offset-2 hover:underline"
              >
                {(value as IntegrationFileAnswer).name || "Archivo subido"}
              </a>
            ) : null}
          </div>
        )}
        {field.type === "single_choice" && (
          <div className="space-y-3">
            {field.options?.map((option) => {
              const active = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "w-full border px-4 py-4 text-left transition", radius,
                    active ? "border-[#87b1e0] bg-[#87b1e0]/15" : "border-white/10 bg-white/5 hover:border-white/25",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        active ? "border-[#87b1e0] bg-[#87b1e0]" : "border-white/30",
                      )}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="font-medium text-white">{option.label}</p>
                      {(option.acronym || option.description) && (
                        <p className="mt-1 text-sm leading-relaxed text-white/60">
                          {option.acronym && (
                            <span className="mr-2 inline-flex rounded-full bg-[#87b1e0]/20 px-2 py-0.5 text-xs font-semibold text-[#87b1e0]">
                              {option.acronym}
                            </span>
                          )}
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {field.type === "multiple_choice" && (
          <div className="space-y-3">
            {field.options?.map((option) => {
              const active = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleMulti(option.value)}
                  className={cn(
                    "w-full border px-4 py-4 text-left transition", radius,
                    active ? "border-[#87b1e0] bg-[#87b1e0]/15" : "border-white/10 bg-white/5 hover:border-white/25",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        active ? "border-[#87b1e0] bg-[#87b1e0] text-white" : "border-white/30",
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <p className="font-medium text-white">{option.label}</p>
                      {(option.acronym || option.description) && (
                        <p className="mt-1 text-sm leading-relaxed text-white/60">
                          {option.acronym && (
                            <span className="mr-2 inline-flex rounded-full bg-[#87b1e0]/20 px-2 py-0.5 text-xs font-semibold text-[#87b1e0]">
                              {option.acronym}
                            </span>
                          )}
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {field.allowOther && (
              <>
                <button
                  type="button"
                  onClick={() => toggleMulti("otro")}
                  className={cn(
                    "w-full border px-4 py-4 text-left transition", radius,
                    selected.includes("otro")
                      ? "border-[#87b1e0] bg-[#87b1e0]/15"
                      : "border-white/10 bg-white/5 hover:border-white/25",
                  )}
                >
                  <span className="font-medium text-white">Otro</span>
                </button>
                <AnimatePresence initial={false}>
                  {selected.includes("otro") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      <Input
                        value={otherValue}
                        onChange={(e) => onOtherChange(e.target.value)}
                        placeholder="Especifica..."
                        className={ctrl}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
        {field.type === "checkbox" && (
          <label className={cn("mt-2 flex cursor-pointer items-start gap-3 border border-white/10 bg-white/5 p-4", radius)}>
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked === true)}
              className="mt-0.5 border-white/40 data-[state=checked]:bg-[#87b1e0]"
            />
            <span className="text-sm leading-relaxed text-white/85">
              {field.label}{" "}
              Consulta los{" "}
              <a
                href="/terms#convocatoria"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#87b1e0] underline-offset-4 hover:underline"
              >
                términos de la convocatoria
              </a>{" "}
              y la{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#87b1e0] underline-offset-4 hover:underline"
              >
                política de privacidad
              </a>
              .
            </span>
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

function PhoneField({
  value,
  onChange,
  cornerStyle,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  cornerStyle?: IntegrationCornerStyle;
}) {
  const phone = (value as { dial?: string; number?: string }) ?? { dial: "+52", number: "" };
  const selected = PHONE_COUNTRIES.find((c) => c.dial === (phone.dial ?? "+52")) ?? PHONE_COUNTRIES[0];
  const ctrl = controlClass(cornerStyle);
  return (
    <div className="flex gap-2">
      <Select value={phone.dial ?? "+52"} onValueChange={(dial) => onChange({ ...phone, dial })}>
        <SelectTrigger className={cn(ctrl, "w-[170px]")}>
          <SelectValue>
            <span className="flex items-center gap-2">
              <img src={countryFlagUrl(selected.code)} alt="" className="h-4 w-5 rounded-sm object-cover" />
              {selected.dial}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          collisionPadding={16}
          className="min-w-[min(20rem,calc(100vw-1.5rem))]"
        >
          {PHONE_COUNTRIES.map((country) => (
            <SelectItem key={country.code} value={country.dial} className="pr-3">
              <span className="flex items-center gap-2 whitespace-nowrap">
                <img src={countryFlagUrl(country.code)} alt="" className="h-4 w-5 rounded-sm object-cover" />
                <span>{country.flag}</span>
                {country.dial} {country.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="numeric"
        value={phone.number ?? ""}
        onChange={(e) => onChange({ ...phone, number: e.target.value.replace(/[^\d\s-]/g, "") })}
        placeholder="812 000 0000"
        className={ctrl}
      />
    </div>
  );
}
