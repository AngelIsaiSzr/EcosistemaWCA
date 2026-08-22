import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  IntegrationField,
  IntegrationFormDefinition,
  PHONE_COUNTRIES,
  countryFlagUrl,
  getAllFields,
  isFieldVisible,
  isValidEmail,
  isValidHttpUrl,
  isValidPhoneNumber,
  normalizeUrl,
} from "@shared/integration-form";
import { WcaLogo } from "@/components/integration/wca-logo";

type Answers = Record<string, unknown>;

interface IntegrationFormFlowProps {
  definition: IntegrationFormDefinition;
  slug: string;
  preview?: boolean;
}

const emojiFont = "[font-family:Inter,'Segoe UI Emoji','Noto Color Emoji','Apple Color Emoji',sans-serif]";
const formFieldClass =
  "h-12 border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#87b1e0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]";

function emptyAnswers(definition: IntegrationFormDefinition): Answers {
  const answers: Answers = {
    phone: { dial: "+52", number: "" },
    privacyConsent: false,
  };
  for (const field of (definition.sections ?? []).flatMap((s) => s.fields ?? [])) {
    if (field.type === "multiple_choice") answers[field.id] = [];
    if (field.type === "checkbox") answers[field.id] = false;
  }
  return answers;
}

function visibleFields(fields: IntegrationField[] | undefined, answers: Answers) {
  return (fields ?? []).filter((field) => isFieldVisible(field, answers));
}

function validateField(field: IntegrationField, value: unknown): string | null {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

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
  if (field.type === "number") {
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isInteger(num)) return "Ingresa una edad en números enteros.";
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    if (num < min || num > max) return `La edad debe estar entre ${min} y ${max} años.`;
  }
  return null;
}

export function IntegrationFormFlow({ definition, slug, preview }: IntegrationFormFlowProps) {
  const sections = Array.isArray(definition.sections) ? definition.sections : [];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => emptyAnswers(definition));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});

  const section = sections[step];
  const isLast = step === sections.length - 1;
  const progress = ((step + 1) / Math.max(sections.length, 1)) * 100;

  const currentFields = useMemo(
    () => (section ? visibleFields(section.fields, answers) : []),
    [section, answers],
  );

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
      setStep((s) => s + 1);
      return;
    }
    if (!validateSection()) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    if (preview) {
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = { ...answers };
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
      const res = await fetch(`/api/integration/public/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setSubmitted(true);
    } catch {
      setSubmitError("Hubo un problema de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className={cn("relative z-10 mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center", emojiFont)}
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
      </div>
    );
  }

  return (
    <div className={cn("relative z-10 mx-auto flex w-full max-w-2xl flex-col justify-start px-5 pb-16 pt-14 md:px-8 md:pt-16", emojiFont)}>
      {preview && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-sm text-amber-100">
          Vista previa de prueba. Al enviar no se guardan datos reales.
        </div>
      )}
      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#87b1e0] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div key={section?.id ?? step}>
          {section?.isWelcome ? (
            <div className="flex flex-col items-center text-center">
              <WcaLogo alt="Ecosistema WCA" className="mb-6 h-16 w-16 object-contain" />
              <p className="mb-2 text-sm tracking-wide text-[#87b1e0]">{definition.subtitle}</p>
              <h1 className="font-heading text-4xl font-bold text-white md:text-5xl">{definition.title}</h1>
              <p className="mt-5 max-w-xl text-lg text-white/80">{definition.description}</p>
              <p className="mt-3 max-w-xl text-base text-white/70">{definition.cta}</p>
            </div>
          ) : (
            <div>
              <p className="mb-1 text-sm font-medium text-[#87b1e0]">{section?.title}</p>
              {section?.subtitle && <p className="mb-8 text-white/65">{section.subtitle}</p>}
              <div className="space-y-7">
                {currentFields.map((field) => (
                  <div key={field.id} className="p-1">
                    <FieldControl
                      field={field}
                      value={answers[field.id]}
                      error={errors[field.id]}
                      otherValue={otherValues[field.id] ?? ""}
                      onOtherChange={(text) => setOtherValues((prev) => ({ ...prev, [field.id]: text }))}
                      onChange={(value) => setValue(field.id, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {submitError && (
        <p className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {submitError}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
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
          {section?.isWelcome ? "Iniciar" : isLast ? (submitting ? "Enviando..." : "Enviar") : "Siguiente"}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </Button>
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
}: {
  field: IntegrationField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
}) {
  const selected = Array.isArray(value) ? (value as string[]) : [];

  const toggleMulti = (optionValue: string) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue));
    } else {
      onChange([...selected, optionValue]);
    }
  };

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

      <div className="mt-3">
        {field.type === "short_text" && (
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className={formFieldClass}
          />
        )}
        {field.type === "email" && (
          <Input
            type="email"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={formFieldClass}
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
            className={formFieldClass}
          />
        )}
        {field.type === "number" && (
          <div className="relative">
            <Input
              type="number"
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={1}
              value={value === undefined || value === null ? "" : String(value)}
              onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={field.placeholder}
              className={cn(formFieldClass, "wca-number-input pr-2")}
            />
          </div>
        )}
        {field.type === "long_text" && (
          <Textarea
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn("min-h-[140px]", formFieldClass, "h-auto")}
          />
        )}
        {field.type === "phone" && <PhoneField value={value} onChange={onChange} />}
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
                    "w-full rounded-2xl border px-4 py-4 text-left transition",
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
                    "w-full rounded-2xl border px-4 py-4 text-left transition",
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
                    "w-full rounded-2xl border px-4 py-4 text-left transition",
                    selected.includes("otro")
                      ? "border-[#87b1e0] bg-[#87b1e0]/15"
                      : "border-white/10 bg-white/5 hover:border-white/25",
                  )}
                >
                  <span className="font-medium text-white">Otro</span>
                </button>
                {selected.includes("otro") && (
                  <Input
                    value={otherValue}
                    onChange={(e) => onOtherChange(e.target.value)}
                    placeholder="Especifica..."
                    className={formFieldClass}
                  />
                )}
              </>
            )}
          </div>
        )}
        {field.type === "checkbox" && (
          <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked === true)}
              className="mt-0.5 border-white/40 data-[state=checked]:bg-[#87b1e0]"
            />
            <span className="text-sm leading-relaxed text-white/85">
              {field.label}{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#87b1e0] underline-offset-4 hover:underline"
              >
                Ver política de privacidad
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
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const phone =
    value && typeof value === "object"
      ? (value as { dial?: string; number?: string })
      : { dial: "+52", number: "" };
  const selected = PHONE_COUNTRIES.find((c) => c.dial === (phone.dial ?? "+52")) ?? PHONE_COUNTRIES[0];
  return (
    <div className="flex gap-2">
      <div className="relative w-[158px] shrink-0">
        <img
          src={countryFlagUrl(selected.code)}
          alt=""
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-5 -translate-y-1/2 rounded-sm object-cover"
        />
        <select
          value={phone.dial ?? "+52"}
          onChange={(e) => onChange({ ...phone, dial: e.target.value })}
          className="h-12 w-full appearance-none rounded-md border border-white/15 bg-white/10 pl-10 pr-8 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#87b1e0]"
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.dial} className="bg-[#0b1220] text-white">
              {country.dial} {country.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      </div>
      <Input
        type="tel"
        inputMode="numeric"
        value={phone.number ?? ""}
        onChange={(e) => onChange({ ...phone, number: e.target.value.replace(/[^\d\s-]/g, "") })}
        placeholder="812 000 0000"
        className={cn("min-w-0 flex-1", formFieldClass)}
      />
    </div>
  );
}
