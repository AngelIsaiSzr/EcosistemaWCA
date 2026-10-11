import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Copy,
  FolderPlus,
  History,
  List,
  Loader2,
  Mail,
  MailCheck,
  Pencil,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import type {
  EmailAutomationLog,
  EmailAutomationSettings,
  EmailGroup,
  EmailWeekTemplate,
} from "@shared/schema";
import { parseRecipientList } from "@shared/director-emails";
import {
  EMAIL_PRESET_OPTIONS,
  addDaysIso,
  buildEmailPreset,
  buildSemesterPlan,
  mondayOf,
  presetEmoji,
  type EmailPresetKey,
} from "@shared/email-presets";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  AdminEditPanel,
  AdminEmptyState,
  AdminPanelBody,
  AdminPanelFooter,
  AdminPanelHeader,
  AdminPanelSection,
  AdminPanelTabs,
} from "@/components/admin/edit-panel";
import { EmailCalendar, STATUS_META, type CalendarEmailStatus } from "@/components/email/email-calendar";
import { EmailHtmlEditor } from "@/components/email/email-html-editor";
import {
  EMAIL_GROUP_CLASS,
  EMAIL_GROUP_COLORS,
  EMAIL_GROUP_COLOR_LABEL,
  UNGROUPED_CLASS,
  groupColor,
  type EmailGroupColor,
} from "@/components/email/email-colors";
import { cn } from "@/lib/utils";

/* ───────────── Tipos y utilidades ───────────── */

type Payload = {
  settings: EmailAutomationSettings;
  templates: EmailWeekTemplate[];
  groups: EmailGroup[];
  logs: EmailAutomationLog[];
  sent: Array<{ templateId: number | null; sendDate: string | null; status: string }>;
  stats: { officialSent: number };
  senders: Array<{ id: string; label: string; fromEmail: string; description: string }>;
  senderAvailability: Record<string, boolean>;
  preview: {
    today: string;
    hour: number;
    timezone: string;
    next: { id: number; label: string; sendDate: string | null; sendHour: number } | null;
  };
};

const QUERY_KEY = ["/api/admin/email-automation"];

type View = "calendar" | "list" | "history";
type GroupFilter = "all" | "none" | number;

type EmailDraft = {
  label: string;
  sendDate: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  enabled: boolean;
  groupId: number | null;
  presetKey: string | null;
  customRecipients: boolean;
  recipientsText: string;
  customHour: boolean;
  sendHour: number;
};

type SettingsDraft = {
  enabled: boolean;
  senderId: string;
  sendHour: number;
  recipientsText: string;
  ccText: string;
  bccText: string;
};

type GroupDraft = {
  id?: number;
  name: string;
  kind: "semester" | "event";
  color: EmailGroupColor;
  startDate: string;
  endDate: string;
};

const SELECT_CLASS =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const NAME_SUGGESTIONS = ["Inicio de semestre", "Semana Tec", "Cierre de semestre", "Evento especial", "Aviso importante"];

const HOURS = Array.from({ length: 24 }, (_, h) => h);

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatShort(iso: string | null | undefined) {
  if (!iso) return "Sin fecha";
  return parseIso(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

function formatLong(iso: string | null | undefined) {
  if (!iso) return "Sin fecha";
  return parseIso(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "Sin fechas";
  const fmt = (iso: string) => parseIso(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  if (start && end) return `${fmt(start)} – ${fmt(end)} ${parseIso(end).getFullYear()}`;
  return fmt((start ?? end)!);
}

function emptyDraft(defaultHour: number): EmailDraft {
  return {
    label: "",
    sendDate: "",
    subject: "",
    bodyText: "",
    bodyHtml: "",
    enabled: true,
    groupId: null,
    presetKey: null,
    customRecipients: false,
    recipientsText: "",
    customHour: false,
    sendHour: defaultHour,
  };
}

function draftFromTemplate(t: EmailWeekTemplate, defaultHour: number): EmailDraft {
  const own = t.recipientsOverride ?? [];
  return {
    label: t.label,
    sendDate: t.sendDate ?? "",
    subject: t.subject,
    bodyText: t.bodyText,
    bodyHtml: t.bodyHtml,
    enabled: t.enabled,
    groupId: t.groupId ?? null,
    presetKey: t.presetKey ?? null,
    customRecipients: own.length > 0,
    recipientsText: own.join("\n"),
    customHour: t.sendHour != null,
    sendHour: t.sendHour ?? defaultHour,
  };
}

function draftPayload(d: EmailDraft) {
  return {
    label: d.label.trim(),
    sendDate: d.sendDate || null,
    subject: d.subject.trim(),
    bodyText: d.bodyText,
    bodyHtml: d.bodyHtml,
    enabled: d.enabled,
    groupId: d.groupId,
    presetKey: d.presetKey,
    recipientsOverride: d.customRecipients ? d.recipientsText : null,
    sendHour: d.customHour ? d.sendHour : null,
  };
}

function suggestSemesterName(classStart: string) {
  const d = parseIso(classStart);
  const yy = String(d.getFullYear()).slice(-2);
  return d.getMonth() < 6 ? `FJ${yy}` : `AD${yy}`;
}

function nextMonday(today: string) {
  const monday = mondayOf(today);
  return monday >= today ? monday : addDaysIso(monday, 7);
}

/** Siguiente semestre cuyo código (FJyy / ADyy) aún no existe como grupo. */
function nextSemesterSuggestion(today: string, takenNames: Set<string>) {
  let start = nextMonday(today);
  let name = suggestSemesterName(start);
  for (let i = 0; i < 6 && takenNames.has(name.toUpperCase()); i++) {
    const d = parseIso(start);
    const year = d.getFullYear();
    start = d.getMonth() < 6 ? nextMonday(`${year}-08-10`) : nextMonday(`${year + 1}-02-09`);
    name = suggestSemesterName(start);
  }
  return { name, start };
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/* ───────────── Pequeños componentes ───────────── */

function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: typeof Mail }[];
  layoutId: string;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted/60 p-1 text-sm">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "relative inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-background shadow-sm dark:bg-white/10"
                transition={{ type: "spring", stiffness: 450, damping: 36 }}
              />
            )}
            {o.icon ? <o.icon className="relative z-10 h-4 w-4" /> : null}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: CalendarEmailStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "sent" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        status === "today" && "bg-[#5b8fd4]/15 text-[#5b8fd4]",
        status === "scheduled" && "bg-muted text-muted-foreground",
        status === "missed" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        status === "paused" && "bg-muted text-muted-foreground/80",
      )}
    >
      <meta.icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
  children,
  index,
}: {
  icon: typeof Mail;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={onClick ? { y: -3 } : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick || e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group flex min-w-0 items-start gap-3 rounded-2xl border bg-card p-4 transition-[box-shadow,border-color]",
        onClick && "cursor-pointer hover:border-[#5b8fd4]/50 hover:shadow-lg hover:shadow-[#5b8fd4]/10",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4]/15 text-[#5b8fd4] ring-1 ring-[#5b8fd4]/25 transition-colors group-hover:bg-[#5b8fd4] group-hover:text-white">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="truncate font-semibold leading-snug">{value}</div>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </motion.div>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

/* ───────────── Página ───────────── */

export default function AdminEmailAutomationPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading: loadingData } = useQuery<Payload>({
    queryKey: QUERY_KEY,
    enabled: user?.role === "admin",
    queryFn: async () => {
      const res = await fetch("/api/admin/email-automation", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar");
      return res.json();
    },
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) navigate("/auth");
  }, [user, isLoading, navigate]);

  const today = data?.preview.today ?? new Date().toISOString().slice(0, 10);
  const defaultHour = data?.settings?.sendHour ?? 9;
  const templates = data?.templates ?? [];
  const groups = data?.groups ?? [];
  const directors = data?.settings?.recipients ?? [];

  const [view, setView] = useState<View>("calendar");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [calendarMonth, setCalendarMonth] = useState<{ y: number; m: number } | null>(null);

  useEffect(() => {
    if (calendarMonth || !data) return;
    const [y, m] = data.preview.today.split("-").map(Number);
    setCalendarMonth({ y, m: m - 1 });
  }, [data, calendarMonth]);

  /* Estado del panel de correo */
  const [emailTarget, setEmailTarget] = useState<{ kind: "new" } | { kind: "edit"; id: number } | null>(null);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [emailTab, setEmailTab] = useState<"general" | "content" | "send">("general");
  const [periodPick, setPeriodPick] = useState<1 | 2 | 3>(1);
  const [testEmail, setTestEmail] = useState("");
  const [confirmPreset, setConfirmPreset] = useState<EmailPresetKey | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState(false);
  const [confirmSendNow, setConfirmSendNow] = useState(false);
  const lastPresetHtml = useRef("");

  /* Configuración */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"send" | "recipients">("send");
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [settingsBaseline, setSettingsBaseline] = useState("");

  /* Grupos y planeador */
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerGroupId, setPlannerGroupId] = useState<number | "new">("new");
  const [plannerName, setPlannerName] = useState("");
  const [plannerNameTouched, setPlannerNameTouched] = useState(false);
  const [plannerColor, setPlannerColor] = useState<EmailGroupColor>("purple");
  const [plannerStart, setPlannerStart] = useState("");
  const [plannerSelected, setPlannerSelected] = useState<Set<string>>(new Set());

  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!testEmail && user?.email) setTestEmail(user.email);
  }, [user?.email, testEmail]);

  const editing = emailTarget?.kind === "edit" ? templates.find((t) => t.id === emailTarget.id) ?? null : null;
  const isNew = emailTarget?.kind === "new";
  const emailDirty = !!draft && JSON.stringify(draft) !== baseline;
  const settingsDirty = !!settingsDraft && JSON.stringify(settingsDraft) !== settingsBaseline;
  // Ancho del panel + 1.5rem de separación, menos el margen que ya deja el `container` centrado
  // (su ancho máximo cambia por breakpoint). Debe coincidir con el `widthClass` de cada panel.
  const sidePanelMargin =
    emailTarget && draft
      ? "lg:mr-[calc(min(46rem,52vw)_+_1.5rem_-_(100vw_-_1024px)_/_2)] xl:mr-[calc(min(46rem,52vw)_+_1.5rem_-_(100vw_-_1280px)_/_2)] 2xl:mr-[calc(min(46rem,52vw)_+_1.5rem_-_(100vw_-_1536px)_/_2)]"
      : settingsOpen && settingsDraft
        ? "lg:mr-[calc(min(36rem,43vw)_+_1.5rem_-_(100vw_-_1024px)_/_2)] xl:mr-[calc(min(36rem,43vw)_+_1.5rem_-_(100vw_-_1280px)_/_2)] 2xl:mr-[calc(min(36rem,43vw)_+_1.5rem_-_(100vw_-_1536px)_/_2)]"
        : undefined;

  const sentSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of data?.sent ?? []) if (s.templateId && s.sendDate) set.add(`${s.templateId}|${s.sendDate}`);
    return set;
  }, [data?.sent]);

  const statusOf = (t: EmailWeekTemplate): CalendarEmailStatus => {
    if (t.sendDate && sentSet.has(`${t.id}|${t.sendDate}`)) return "sent";
    if (!t.enabled || !t.sendDate) return "paused";
    if (t.sendDate === today) return "today";
    if (t.sendDate < today) return "missed";
    return "scheduled";
  };

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const classesFor = (groupId: number | null | undefined) => {
    const g = groupId != null ? groupById.get(groupId) : undefined;
    return g ? EMAIL_GROUP_CLASS[groupColor(g.color)] : UNGROUPED_CLASS;
  };

  const filteredTemplates = templates.filter((t) =>
    groupFilter === "all" ? true : groupFilter === "none" ? t.groupId == null : t.groupId === groupFilter,
  );
  const ungroupedCount = templates.filter((t) => t.groupId == null).length;

  /* ───── Guardas de cambios sin guardar ───── */

  const guard = (action: () => void) => {
    if (emailDirty || settingsDirty) {
      setDiscardAction(() => action);
      return;
    }
    action();
  };

  const closeAllPanels = () => {
    setEmailTarget(null);
    setSettingsOpen(false);
  };

  const groupForDate = (date?: string) => {
    if (typeof groupFilter === "number") return groupFilter;
    if (!date) return null;
    return groups.find((g) => g.startDate && g.endDate && date >= g.startDate && date <= g.endDate)?.id ?? null;
  };

  const openNewEmail = (date?: string, base?: Partial<EmailDraft>) =>
    guard(() => {
      const next = { ...emptyDraft(defaultHour), sendDate: date ?? "", groupId: groupForDate(date), ...base };
      setSettingsOpen(false);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      lastPresetHtml.current = "";
      setEmailTarget({ kind: "new" });
      setEmailTab("general");
      const suggestion = suggestedPresetFor(next);
      const match = suggestion ? /^p([123])w/.exec(suggestion) : null;
      if (match) setPeriodPick(Number(match[1]) as 1 | 2 | 3);
    });

  const openEmail = (id: number) => {
    if (emailTarget?.kind === "edit" && emailTarget.id === id) return;
    guard(() => {
      const t = templates.find((x) => x.id === id);
      if (!t) return;
      const next = draftFromTemplate(t, defaultHour);
      setSettingsOpen(false);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      lastPresetHtml.current = "";
      setEmailTarget({ kind: "edit", id });
      setEmailTab("general");
      const match = t.presetKey ? /^p([123])w/.exec(t.presetKey) : null;
      if (match) setPeriodPick(Number(match[1]) as 1 | 2 | 3);
    });
  };

  const openSettings = (tab: "send" | "recipients" = "send") =>
    guard(() => {
      if (!data?.settings) return;
      const s = data.settings;
      const next: SettingsDraft = {
        enabled: s.enabled,
        senderId: s.senderId || "contacto",
        sendHour: s.sendHour,
        recipientsText: (s.recipients ?? []).join("\n"),
        ccText: (s.ccRecipients ?? []).join("\n"),
        bccText: (s.bccRecipients ?? []).join("\n"),
      };
      setEmailTarget(null);
      setSettingsDraft(next);
      setSettingsBaseline(JSON.stringify(next));
      setSettingsTab(tab);
      setSettingsOpen(true);
    });

  /* ───── Plantillas precargadas ───── */

  function suggestedPresetFor(d: EmailDraft | null): EmailPresetKey | null {
    if (!d?.sendDate || d.groupId == null) return null;
    const g = groupById.get(d.groupId);
    if (!g?.startDate || g.kind !== "semester") return null;
    const monday = mondayOf(d.sendDate);
    return buildSemesterPlan(g.startDate, g.name).find((item) => item.sendDate === monday)?.presetKey ?? null;
  }

  const applyPreset = (key: EmailPresetKey) => {
    if (!draft) return;
    const g = draft.groupId != null ? groupById.get(draft.groupId) : undefined;
    const content = buildEmailPreset(key, {
      semesterCode: g?.kind === "semester" ? g.name : "",
      customName: key === "custom" ? draft.label : "",
    });
    lastPresetHtml.current = content.bodyHtml;
    setDraft((d) =>
      d
        ? {
            ...d,
            label: content.label,
            subject: content.subject,
            bodyText: content.bodyText,
            bodyHtml: content.bodyHtml,
            presetKey: key,
          }
        : d,
    );
  };

  const choosePreset = (key: EmailPresetKey) => {
    if (!draft) return;
    if (draft.bodyHtml && draft.bodyHtml !== lastPresetHtml.current) {
      setConfirmPreset(key);
      return;
    }
    applyPreset(key);
  };

  /* ───── Mutaciones ───── */

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const toggleEnabledMutation = useMutation({
    mutationFn: async (enabled: boolean) =>
      readJson<EmailAutomationSettings>(await apiRequest("PATCH", "/api/admin/email-automation/settings", { enabled })),
    onMutate: (enabled) => {
      queryClient.setQueryData<Payload>(QUERY_KEY, (old) =>
        old ? { ...old, settings: { ...old.settings, enabled } } : old,
      );
    },
    onSuccess: (_, enabled) =>
      toast({
        title: enabled ? "Automatización activada" : "Automatización pausada",
        description: enabled ? "Los correos se enviarán en su fecha y hora." : "No se enviará nada hasta que la reactives.",
      }),
    onError: (error: Error) => {
      invalidate();
      toast({ title: "No se pudo cambiar", description: error.message, variant: "destructive" });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (s: SettingsDraft) =>
      readJson<EmailAutomationSettings>(
        await apiRequest("PATCH", "/api/admin/email-automation/settings", {
          enabled: s.enabled,
          senderId: s.senderId,
          sendHour: s.sendHour,
          recipients: s.recipientsText,
          ccRecipients: s.ccText,
          bccRecipients: s.bccText,
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<Payload>(QUERY_KEY, (old) => (old ? { ...old, settings: updated } : old));
      const next: SettingsDraft = {
        enabled: updated.enabled,
        senderId: updated.senderId,
        sendHour: updated.sendHour,
        recipientsText: (updated.recipients ?? []).join("\n"),
        ccText: (updated.ccRecipients ?? []).join("\n"),
        bccText: (updated.bccRecipients ?? []).join("\n"),
      };
      setSettingsDraft(next);
      setSettingsBaseline(JSON.stringify(next));
      toast({ title: "Configuración guardada" });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" }),
  });

  const saveEmailMutation = useMutation({
    mutationFn: async (d: EmailDraft) => {
      if (emailTarget?.kind === "edit") {
        return readJson<EmailWeekTemplate>(
          await apiRequest("PATCH", `/api/admin/email-automation/templates/${emailTarget.id}`, draftPayload(d)),
        );
      }
      const result = await readJson<{ templates: EmailWeekTemplate[] }>(
        await apiRequest("POST", "/api/admin/email-automation/templates", draftPayload(d)),
      );
      return result.templates[0];
    },
    onSuccess: (saved) => {
      const wasNew = emailTarget?.kind === "new";
      queryClient.setQueryData<Payload>(QUERY_KEY, (old) =>
        old
          ? {
              ...old,
              templates: wasNew
                ? [...old.templates, saved]
                : old.templates.map((t) => (t.id === saved.id ? saved : t)),
            }
          : old,
      );
      const next = draftFromTemplate(saved, defaultHour);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      lastPresetHtml.current = "";
      setEmailTarget({ kind: "edit", id: saved.id });
      toast({
        title: wasNew ? "Correo creado" : "Cambios guardados",
        description: saved.sendDate
          ? `${saved.enabled ? "Se enviará" : "Quedó pausado para"} el ${formatLong(saved.sendDate)}.`
          : "Sin fecha: no se enviará automáticamente.",
      });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" }),
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/email-automation/templates/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Payload>(QUERY_KEY, (old) =>
        old ? { ...old, templates: old.templates.filter((t) => t.id !== id) } : old,
      );
      setEmailTarget(null);
      toast({ title: "Correo eliminado" });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Nada que probar");
      if (!draft.bodyHtml.trim() || !draft.subject.trim()) throw new Error("Primero elige una plantilla o escribe el correo.");
      return readJson<{ recipients?: string[]; results?: Array<{ to: string; ok: boolean; error?: string }> }>(
        await apiRequest("POST", "/api/admin/email-automation/test", {
          to: testEmail.trim(),
          draft: { subject: draft.subject, bodyText: draft.bodyText || draft.subject, bodyHtml: draft.bodyHtml },
        }),
      );
    },
    onSuccess: (result) => {
      const failed = (result.results ?? []).filter((r) => !r.ok);
      toast({
        title: failed.length ? "La prueba no llegó a todos" : "Prueba enviada",
        description: failed.length
          ? failed.map((f) => `${f.to}: ${f.error ?? "falló"}`).join(" · ")
          : `Revisa ${(result.recipients ?? []).join(", ")}. Si es @tec.mx, revisa spam o cuarentena.`,
        variant: failed.length ? "destructive" : "default",
      });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo enviar la prueba", description: error.message, variant: "destructive" }),
  });

  const sendNowMutation = useMutation({
    mutationFn: async (id: number) =>
      readJson<{ recipients?: string[]; results?: Array<{ to: string; ok: boolean; error?: string }> }>(
        await apiRequest("POST", `/api/admin/email-automation/templates/${id}/send-now`),
      ),
    onSuccess: (result) => {
      const failed = (result.results ?? []).filter((r) => !r.ok);
      toast({
        title: failed.length ? "Envío parcial" : "Correo enviado",
        description: failed.length
          ? failed.map((f) => `${f.to}: ${f.error ?? "falló"}`).join(" · ")
          : `Se envió a ${(result.recipients ?? []).length} destinatarios.`,
        variant: failed.length ? "destructive" : "default",
      });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo enviar", description: error.message, variant: "destructive" }),
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/email-automation/logs/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Payload>(QUERY_KEY, (old) =>
        old ? { ...old, logs: old.logs.filter((l) => l.id !== id) } : old,
      );
      toast({ title: "Prueba eliminada del historial" });
    },
    onError: (error: Error) => toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" }),
  });

  const saveGroupMutation = useMutation({
    mutationFn: async (g: GroupDraft) => {
      const body = {
        name: g.name.trim(),
        kind: g.kind,
        color: g.color,
        startDate: g.startDate || null,
        endDate: g.endDate || null,
      };
      return readJson<EmailGroup>(
        g.id
          ? await apiRequest("PATCH", `/api/admin/email-automation/groups/${g.id}`, body)
          : await apiRequest("POST", "/api/admin/email-automation/groups", body),
      );
    },
    onSuccess: (saved, g) => {
      setGroupDraft(null);
      toast({ title: g.id ? "Grupo actualizado" : "Grupo creado", description: saved.name });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo guardar el grupo", description: error.message, variant: "destructive" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/email-automation/groups/${id}`);
      return id;
    },
    onSuccess: (id) => {
      setGroupDraft(null);
      if (groupFilter === id) setGroupFilter("all");
      toast({ title: "Grupo eliminado", description: "Sus correos siguen guardados como “Sin grupo”." });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" }),
  });

  /* ───── Planeador de semestre ───── */

  const plannerGroup = plannerGroupId === "new" ? null : groupById.get(plannerGroupId) ?? null;
  const plannerCode = plannerGroup ? plannerGroup.name : plannerName.trim();
  const plan = useMemo(() => (plannerStart ? buildSemesterPlan(plannerStart, plannerCode) : []), [plannerStart, plannerCode]);
  const plannerExisting = useMemo(() => {
    if (!plannerGroup) return new Set<string>();
    return new Set(templates.filter((t) => t.groupId === plannerGroup.id && t.presetKey).map((t) => t.presetKey!));
  }, [plannerGroup, templates]);

  useEffect(() => {
    if (!plannerOpen || !plannerStart) return;
    setPlannerSelected(
      new Set(
        buildSemesterPlan(plannerStart)
          .filter((item) => !plannerExisting.has(item.presetKey) && item.sendDate >= today)
          .map((item) => item.presetKey),
      ),
    );
  }, [plannerOpen, plannerStart, plannerExisting, today]);

  const openPlanner = (groupId?: number) => {
    const current =
      groupId != null
        ? groupById.get(groupId)
        : groups.find(
            (x) => x.kind === "semester" && x.startDate && x.endDate && x.startDate <= today && today <= x.endDate,
          );
    if (current) {
      setPlannerGroupId(current.id);
      setPlannerStart(current.startDate ?? nextMonday(today));
    } else {
      const { name, start } = nextSemesterSuggestion(
        today,
        new Set(groups.map((x) => x.name.trim().toUpperCase())),
      );
      setPlannerGroupId("new");
      setPlannerStart(start);
      setPlannerName(name);
      setPlannerNameTouched(false);
      setPlannerColor(EMAIL_GROUP_COLORS[(groups.length + 1) % EMAIL_GROUP_COLORS.length]);
    }
    setPlannerOpen(true);
  };

  const plannerMutation = useMutation({
    mutationFn: async () => {
      const items = plan.filter((item) => plannerSelected.has(item.presetKey) && !plannerExisting.has(item.presetKey));
      if (items.length === 0) throw new Error("Selecciona al menos un correo.");
      let groupId = plannerGroup?.id ?? null;
      if (!plannerGroup) {
        if (!plannerName.trim()) throw new Error("Ponle nombre al semestre.");
        if (groups.some((x) => x.name.trim().toUpperCase() === plannerName.trim().toUpperCase())) {
          throw new Error(`Ya existe un grupo llamado ${plannerName.trim()}. Elígelo en “Grupo” para completarlo.`);
        }
        const created = await readJson<EmailGroup>(
          await apiRequest("POST", "/api/admin/email-automation/groups", {
            name: plannerName.trim(),
            kind: "semester",
            color: plannerColor,
            startDate: mondayOf(plannerStart),
            endDate: addDaysIso(plan[plan.length - 1].sendDate, 4),
          }),
        );
        groupId = created.id;
      }
      await apiRequest("POST", "/api/admin/email-automation/templates", {
        items: items.map((item) => {
          const content = buildEmailPreset(item.presetKey, { semesterCode: plannerCode });
          return {
            label: content.label,
            subject: content.subject,
            bodyText: content.bodyText,
            bodyHtml: content.bodyHtml,
            sendDate: item.sendDate,
            presetKey: item.presetKey,
            groupId,
            enabled: true,
          };
        }),
      });
      return { count: items.length, groupId, first: items[0].sendDate };
    },
    onSuccess: ({ count, groupId, first }) => {
      setPlannerOpen(false);
      if (groupId) setGroupFilter(groupId);
      const [y, m] = first.split("-").map(Number);
      setCalendarMonth({ y, m: m - 1 });
      setView("calendar");
      toast({ title: `${count} correos programados`, description: "Ábrelos desde el calendario para revisarlos o ajustarlos." });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "No se pudo planear", description: error.message, variant: "destructive" }),
  });

  /* ───── Guardar correo ───── */

  const saveEmail = () => {
    if (!draft) return;
    if (!draft.label.trim()) {
      setEmailTab("general");
      toast({ title: "Falta el nombre", description: "Ponle un nombre al correo.", variant: "destructive" });
      return;
    }
    if (!draft.bodyHtml.trim() || !draft.subject.trim()) {
      setEmailTab(draft.bodyHtml.trim() ? "content" : "general");
      toast({
        title: "Falta el contenido",
        description: draft.bodyHtml.trim() ? "Escribe el asunto del correo." : "Elige una plantilla precargada o escribe tu correo.",
        variant: "destructive",
      });
      return;
    }
    if (draft.customRecipients && parseRecipientList(draft.recipientsText).length === 0) {
      setEmailTab("general");
      toast({ title: "Faltan destinatarios", description: "Escribe al menos un correo válido.", variant: "destructive" });
      return;
    }
    const d = draft.bodyText.trim() ? draft : { ...draft, bodyText: draft.subject };
    saveEmailMutation.mutate(d);
  };

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const sender = data?.senders.find((s) => s.id === data?.settings?.senderId);
  const next = data?.preview.next;
  const nextTemplate = next ? templates.find((t) => t.id === next.id) : undefined;
  const editingLogs = editing ? (data?.logs ?? []).filter((l) => l.templateId === editing.id) : [];
  const draftRecipients = draft?.customRecipients ? parseRecipientList(draft.recipientsText) : directors;
  const suggestion = suggestedPresetFor(draft);

  const calendarEmails = filteredTemplates
    .filter((t) => t.sendDate)
    .map((t) => ({
      id: t.id,
      date: t.sendDate!,
      label: t.label,
      emoji: presetEmoji(t.presetKey),
      chipClass: classesFor(t.groupId).chip,
      status: statusOf(t),
      hour: t.sendHour ?? defaultHour,
    }));

  const calendarRanges = groups
    .filter((g) => g.startDate && g.endDate && (groupFilter === "all" || groupFilter === g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      start: g.startDate!,
      end: g.endDate!,
      softClass: EMAIL_GROUP_CLASS[groupColor(g.color)].soft,
      dotClass: EMAIL_GROUP_CLASS[groupColor(g.color)].dot,
    }));

  const listBuckets = [
    ...groups
      .filter((g) => groupFilter === "all" || groupFilter === g.id)
      .map((g) => ({ group: g as EmailGroup | null, items: templates.filter((t) => t.groupId === g.id) })),
    ...(groupFilter === "all" || groupFilter === "none"
      ? [{ group: null, items: templates.filter((t) => t.groupId == null) }]
      : []),
  ].filter((b) => b.group || b.items.length > 0);

  const sortByDate = (a: EmailWeekTemplate, b: EmailWeekTemplate) =>
    (a.sendDate ?? "9999").localeCompare(b.sendDate ?? "9999") || a.id - b.id;

  return (
    <>
      <Helmet>
        <title>Correos y automatización | Ecosistema WCA</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className={cn("transition-[margin] duration-300 ease-out", sidePanelMargin)}>
            {/* Encabezado */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  <Link href="/admin" className="hover:text-foreground">
                    Inicio
                  </Link>
                  {" › "}
                  Correos y automatización
                </p>
                <h1 className="mt-1 font-heading text-4xl font-bold">Correos y automatización</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Programa los recordatorios a directores en el calendario, agrúpalos por semestre o evento y envía correos cuando lo necesites.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]" onClick={() => openNewEmail()}>
                  <Plus className="h-4 w-4" />
                  Nuevo correo
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => openPlanner()}>
                  <Sparkles className="h-4 w-4" />
                  Planear semestre
                </Button>
                <Button variant="ghost" className="h-10 rounded-xl" onClick={() => openSettings()}>
                  <Settings2 className="h-4 w-4" />
                  Configuración
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" asChild>
                  <Link href="/admin">
                    <ArrowLeft className="h-4 w-4" />
                    Volver al panel
                  </Link>
                </Button>
              </div>
            </div>

            {loadingData || !data ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Resumen */}
                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    index={0}
                    icon={MailCheck}
                    label="Automatización"
                    value={
                      <span className={data.settings.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {data.settings.enabled ? "Activa" : "Pausada"}
                      </span>
                    }
                    hint={data.settings.enabled ? `Envía a las ${hourLabel(defaultHour)} (CDMX)` : "No se enviará nada"}
                  >
                    <Switch
                      checked={data.settings.enabled}
                      disabled={toggleEnabledMutation.isPending}
                      onCheckedChange={(v) => toggleEnabledMutation.mutate(v)}
                      aria-label="Activar automatización"
                    />
                  </SummaryCard>
                  <SummaryCard
                    index={1}
                    icon={CalendarDays}
                    label="Próximo envío"
                    value={next ? `${presetEmoji(nextTemplate?.presetKey)} ${next.label}` : "Nada programado"}
                    hint={next ? `${formatLong(next.sendDate)} · ${hourLabel(next.sendHour)}` : "Agrega correos desde el calendario"}
                    onClick={next ? () => openEmail(next.id) : undefined}
                  />
                  <SummaryCard
                    index={2}
                    icon={Users}
                    label="Destinatarios"
                    value={`${directors.length} directores`}
                    hint={`Desde ${sender?.fromEmail ?? data.settings.senderId}`}
                    onClick={() => openSettings("recipients")}
                  />
                  <SummaryCard
                    index={3}
                    icon={History}
                    label="Enviados automáticamente"
                    value={`${data.stats.officialSent} correos`}
                    hint="Ver historial completo"
                    onClick={() => setView("history")}
                  />
                </div>

                {/* Grupos + vista */}
                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { id: "all" as GroupFilter, name: "Todos", count: templates.length, dot: "bg-foreground/60", group: null },
                        ...groups.map((g) => ({
                          id: g.id as GroupFilter,
                          name: g.name,
                          count: templates.filter((t) => t.groupId === g.id).length,
                          dot: EMAIL_GROUP_CLASS[groupColor(g.color)].dot,
                          group: g,
                        })),
                        ...(ungroupedCount > 0
                          ? [{ id: "none" as GroupFilter, name: "Sin grupo", count: ungroupedCount, dot: UNGROUPED_CLASS.dot, group: null }]
                          : []),
                      ] as const
                    ).map((chip) => {
                      const active = groupFilter === chip.id;
                      return (
                        <motion.div key={String(chip.id)} layout className="group/chip relative">
                          <button
                            type="button"
                            onClick={() => setGroupFilter(chip.id)}
                            className={cn(
                              "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition",
                              active
                                ? "border-[#5b8fd4] bg-[#5b8fd4]/10 font-medium text-foreground"
                                : "border-border text-muted-foreground hover:border-[#5b8fd4]/50 hover:text-foreground",
                              chip.group && "pr-8",
                            )}
                          >
                            <span className={cn("h-2 w-2 rounded-full", chip.dot)} />
                            {chip.name}
                            <span className="text-xs text-muted-foreground">{chip.count}</span>
                          </button>
                          {chip.group && (
                            <button
                              type="button"
                              aria-label={`Editar ${chip.name}`}
                              onClick={() => {
                                const g = chip.group!;
                                setGroupDraft({
                                  id: g.id,
                                  name: g.name,
                                  kind: g.kind === "event" ? "event" : "semester",
                                  color: groupColor(g.color),
                                  startDate: g.startDate ?? "",
                                  endDate: g.endDate ?? "",
                                });
                              }}
                              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground group-hover/chip:opacity-100"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full text-muted-foreground"
                      onClick={() =>
                        setGroupDraft({
                          name: "",
                          kind: "event",
                          color: EMAIL_GROUP_COLORS[(groups.length + 1) % EMAIL_GROUP_COLORS.length],
                          startDate: "",
                          endDate: "",
                        })
                      }
                    >
                      <FolderPlus className="h-4 w-4" />
                      Grupo
                    </Button>
                  </div>
                  <div className="w-full sm:w-auto sm:min-w-[22rem]">
                    <Segmented
                      value={view}
                      onChange={setView}
                      layoutId="email-view"
                      options={[
                        { id: "calendar", label: "Calendario", icon: CalendarDays },
                        { id: "list", label: "Lista", icon: List },
                        { id: "history", label: "Historial", icon: History },
                      ]}
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {view === "calendar" && calendarMonth && (
                      <>
                        <EmailCalendar
                          year={calendarMonth.y}
                          month={calendarMonth.m}
                          onMonthChange={(y, m) => setCalendarMonth({ y, m })}
                          today={today}
                          emails={calendarEmails}
                          ranges={calendarRanges}
                          selectedId={emailTarget?.kind === "edit" ? emailTarget.id : null}
                          onDayClick={(date) => openNewEmail(date)}
                          onEmailClick={openEmail}
                        />
                        <p className="mt-3 text-xs text-muted-foreground">
                          Da clic en un día para programar un correo, o en un correo para editarlo.
                        </p>
                      </>
                    )}

                    {view === "list" &&
                      (listBuckets.length === 0 ? (
                        <AdminEmptyState>
                          Aún no hay correos. Usa <strong>Planear semestre</strong> o <strong>Nuevo correo</strong>.
                        </AdminEmptyState>
                      ) : (
                        <div className="space-y-6">
                          {listBuckets.map(({ group, items }) => {
                            const cls = group ? EMAIL_GROUP_CLASS[groupColor(group.color)] : UNGROUPED_CLASS;
                            const sentCount = items.filter((t) => statusOf(t) === "sent").length;
                            const pct = items.length ? Math.round((sentCount / items.length) * 100) : 0;
                            return (
                              <motion.section
                                key={group?.id ?? "none"}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="overflow-hidden rounded-2xl border bg-card"
                              >
                                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                                  <span className={cn("h-2.5 w-2.5 rounded-full", cls.dot)} />
                                  <div className="min-w-0">
                                    <p className="font-heading font-semibold">
                                      {group?.name ?? "Sin grupo"}
                                      {group && (
                                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-[11px] font-normal text-muted-foreground">
                                          {group.kind === "event" ? "Evento" : "Semestre"}
                                        </span>
                                      )}
                                    </p>
                                    {group && <p className="text-xs text-muted-foreground">{formatRange(group.startDate, group.endDate)}</p>}
                                  </div>
                                  <div className="ml-auto flex items-center gap-3">
                                    <div className="hidden w-36 sm:block">
                                      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                                        <span>Enviados</span>
                                        <span>
                                          {sentCount}/{items.length}
                                        </span>
                                      </div>
                                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <motion.div
                                          className={cn("h-full rounded-full", cls.bar)}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.6, ease: "easeOut" }}
                                        />
                                      </div>
                                    </div>
                                    {group?.kind === "semester" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-lg"
                                        title="Agrega las semanas que le faltan a este semestre (sin tocar las que ya existen)"
                                        onClick={() => openPlanner(group.id)}
                                      >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Completar semestre
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 rounded-lg"
                                      onClick={() => openNewEmail(undefined, { groupId: group?.id ?? null })}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Correo
                                    </Button>
                                  </div>
                                </div>
                                {items.length === 0 ? (
                                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Este grupo aún no tiene correos.</p>
                                ) : (
                                  <div className="divide-y">
                                    {[...items].sort(sortByDate).map((t, i) => {
                                      const d = t.sendDate ? parseIso(t.sendDate) : null;
                                      const selected = emailTarget?.kind === "edit" && emailTarget.id === t.id;
                                      return (
                                        <motion.button
                                          key={t.id}
                                          type="button"
                                          initial={{ opacity: 0, x: -8 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: Math.min(i, 12) * 0.03 }}
                                          onClick={() => openEmail(t.id)}
                                          className={cn(
                                            "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[#5b8fd4]/[0.05]",
                                            selected && "bg-[#5b8fd4]/[0.08]",
                                            !t.enabled && "opacity-60",
                                          )}
                                        >
                                          <div className="w-12 shrink-0 text-center">
                                            {d ? (
                                              <>
                                                <p className="text-[10px] uppercase text-muted-foreground">
                                                  {d.toLocaleDateString("es-MX", { weekday: "short" })}
                                                </p>
                                                <p className="font-heading text-xl font-bold leading-none">{d.getDate()}</p>
                                                <p className="text-[10px] uppercase text-muted-foreground">
                                                  {d.toLocaleDateString("es-MX", { month: "short" })}
                                                </p>
                                              </>
                                            ) : (
                                              <p className="text-[11px] text-muted-foreground">Sin fecha</p>
                                            )}
                                          </div>
                                          <span className={cn("h-9 w-1 shrink-0 rounded-full", cls.bar)} />
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">
                                              <span className="mr-1.5">{presetEmoji(t.presetKey)}</span>
                                              {t.label}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
                                          </div>
                                          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                                            <StatusPill status={statusOf(t)} />
                                            <span className="text-[11px] text-muted-foreground">
                                              {hourLabel(t.sendHour ?? defaultHour)}
                                              {(t.recipientsOverride?.length ?? 0) > 0 ? ` · ${t.recipientsOverride!.length} destinatarios propios` : ""}
                                            </span>
                                          </div>
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                )}
                              </motion.section>
                            );
                          })}
                        </div>
                      ))}

                    {view === "history" && (
                      <div className="overflow-hidden rounded-2xl border bg-card">
                        <div className="border-b px-4 py-3">
                          <p className="font-heading font-semibold">Historial de envíos</p>
                          <p className="text-xs text-muted-foreground">Últimos 60 movimientos. Las pruebas se pueden borrar.</p>
                        </div>
                        {data.logs.length === 0 ? (
                          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Aún no hay envíos registrados.</p>
                        ) : (
                          <div className="divide-y">
                            {data.logs.map((log, i) => (
                              <motion.div
                                key={log.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(i, 15) * 0.02 }}
                                className="flex items-start gap-3 px-4 py-3 text-sm"
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    log.status === "sent"
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : log.status === "partial"
                                        ? "bg-amber-500/10 text-amber-500"
                                        : "bg-red-500/10 text-red-500",
                                  )}
                                >
                                  {log.kind === "test" ? <Mail className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium">
                                    {log.kind === "test" ? "Prueba" : log.kind === "manual" ? "Envío manual" : "Envío automático"}
                                    <span className="font-normal text-muted-foreground">
                                      {" · "}
                                      {log.status === "sent" ? "Enviado" : log.status === "partial" ? "Parcial" : "Error"}
                                    </span>
                                  </p>
                                  <p className="truncate text-muted-foreground">{log.subject}</p>
                                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                    {log.createdAt ? new Date(log.createdAt).toLocaleString("es-MX") : ""} · {(log.recipients ?? []).join(", ")}
                                  </p>
                                  {log.errorMessage && <p className="mt-1 text-xs text-destructive">{log.errorMessage}</p>}
                                </div>
                                {log.kind === "test" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteLogMutation.mutate(log.id)}
                                    disabled={deleteLogMutation.isPending}
                                    aria-label="Eliminar prueba"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        </main>
      </div>

      {/* ───── Panel de correo ───── */}
      <AdminEditPanel
        open={!!emailTarget && !!draft}
        onClose={() => guard(() => setEmailTarget(null))}
        widthClass="lg:w-[min(46rem,52vw)]"
      >
        {draft && emailTarget ? (
          <>
            <AdminPanelHeader
              media={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4]/15 text-lg">
                  {presetEmoji(draft.presetKey)}
                </span>
              }
              title={draft.label || (isNew ? "Nuevo correo" : "Correo")}
              subtitle={
                <>
                  {draft.sendDate ? formatLong(draft.sendDate) : "Sin fecha"}
                  {draft.groupId != null && groupById.get(draft.groupId) ? ` · ${groupById.get(draft.groupId)!.name}` : ""}
                </>
              }
              onClose={() => guard(() => setEmailTarget(null))}
              actions={
                editing
                  ? [
                      {
                        label: "Duplicar",
                        icon: Copy,
                        onClick: () => openNewEmail(undefined, { ...draft, label: `${draft.label} (copia)`, sendDate: "" }),
                      },
                      { label: "Eliminar correo", icon: Trash2, destructive: true, onClick: () => setConfirmDeleteEmail(true) },
                    ]
                  : undefined
              }
            />
            <AdminPanelTabs
              tabs={[
                { id: "general", label: "General" },
                { id: "content", label: "Contenido", hasError: !draft.bodyHtml.trim() },
                { id: "send", label: "Probar y enviar" },
              ]}
              value={emailTab}
              onChange={setEmailTab}
              layoutId="email-panel-tab"
            />
            <AdminPanelBody contentKey={`${emailTarget.kind === "edit" ? emailTarget.id : "new"}-${emailTab}`}>
              {emailTab === "general" && (
                <>
                  <AdminPanelSection title="Plantilla">
                    {suggestion && draft.presetKey !== suggestion && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => choosePreset(suggestion)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[#5b8fd4]/40 bg-[#5b8fd4]/[0.07] px-3 py-2.5 text-left text-sm transition hover:bg-[#5b8fd4]/15"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 text-[#5b8fd4]" />
                        <span className="min-w-0 flex-1">
                          Sugerida para esta fecha:{" "}
                          <strong>
                            {presetEmoji(suggestion)} {EMAIL_PRESET_OPTIONS.find((o) => o.key === suggestion)?.label}
                          </strong>
                        </span>
                        <span className="text-xs font-medium text-[#5b8fd4]">Usar</span>
                      </motion.button>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs text-muted-foreground">Semanas de periodo</Label>
                        <div className="flex gap-1 rounded-lg bg-muted/60 p-0.5 text-xs">
                          {([1, 2, 3] as const).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setPeriodPick(n)}
                              className={cn(
                                "rounded-md px-2.5 py-1 font-medium transition",
                                periodPick === n ? "bg-background text-foreground shadow-sm dark:bg-white/10" : "text-muted-foreground",
                              )}
                            >
                              Periodo {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((w) => {
                          const key = `p${periodPick}w${w}` as EmailPresetKey;
                          const active = draft.presetKey === key;
                          return (
                            <motion.button
                              key={key}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => choosePreset(key)}
                              className={cn(
                                "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-xs transition",
                                active
                                  ? "border-[#5b8fd4] bg-[#5b8fd4]/10 font-semibold text-foreground ring-1 ring-[#5b8fd4]"
                                  : "border-border text-muted-foreground hover:border-[#5b8fd4]/50 hover:text-foreground",
                                suggestion === key && !active && "border-dashed border-[#5b8fd4]/60",
                              )}
                            >
                              <span className="text-base">{presetEmoji(key)}</span>
                              Semana {w}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {EMAIL_PRESET_OPTIONS.filter((o) => o.category !== "periodo").map((o) => {
                        const active = draft.presetKey === o.key;
                        return (
                          <motion.button
                            key={o.key}
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => choosePreset(o.key)}
                            className={cn(
                              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                              active
                                ? "border-[#5b8fd4] bg-[#5b8fd4]/10 font-semibold ring-1 ring-[#5b8fd4]"
                                : "border-border text-muted-foreground hover:border-[#5b8fd4]/50 hover:text-foreground",
                              suggestion === o.key && !active && "border-dashed border-[#5b8fd4]/60",
                            )}
                          >
                            <span className="text-base">{o.emoji}</span>
                            {o.label}
                          </motion.button>
                        );
                      })}
                    </div>
                    <FieldHint>
                      Al elegir una plantilla se llenan el nombre, el asunto y el contenido. Después puedes editar todo en “Contenido”.
                    </FieldHint>
                  </AdminPanelSection>

                  <AdminPanelSection title="Datos">
                    <div className="space-y-2">
                      <Label htmlFor="email-label">Nombre</Label>
                      <Input
                        id="email-label"
                        value={draft.label}
                        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                        placeholder="Ej. Periodo 3 · Semana 1"
                        className="h-10 rounded-xl"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {NAME_SUGGESTIONS.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setDraft({ ...draft, label: name })}
                            className="rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground transition hover:border-[#5b8fd4]/50 hover:text-foreground"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email-date">Fecha de envío</Label>
                        <Input
                          id="email-date"
                          type="date"
                          value={draft.sendDate}
                          onChange={(e) => setDraft({ ...draft, sendDate: e.target.value })}
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-group">Grupo</Label>
                        <select
                          id="email-group"
                          className={SELECT_CLASS}
                          value={draft.groupId ?? ""}
                          onChange={(e) => setDraft({ ...draft, groupId: e.target.value ? Number(e.target.value) : null })}
                        >
                          <option value="">Sin grupo</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} · {g.kind === "event" ? "Evento" : "Semestre"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <FieldHint>
                      {draft.sendDate
                        ? `Se enviará el ${formatLong(draft.sendDate)}${draft.sendDate < today ? " (esta fecha ya pasó)" : ""}.`
                        : "Sin fecha no se envía automáticamente; puedes mandarlo a mano desde “Probar y enviar”."}
                    </FieldHint>

                    <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{draft.enabled ? "Programado" : "Pausado"}</p>
                        <p className="text-xs text-muted-foreground">
                          {draft.enabled ? "Se enviará solo en su fecha." : "Se queda guardado pero no se enviará."}
                        </p>
                      </div>
                      <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                    </div>
                  </AdminPanelSection>

                  <AdminPanelSection title="Hora y destinatarios">
                    <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Hora de envío</p>
                        <p className="text-xs text-muted-foreground">
                          {draft.customHour ? "Hora propia para este correo." : `Usa la hora general (${hourLabel(defaultHour)}).`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AnimatePresence initial={false}>
                          {draft.customHour && (
                            <motion.select
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                              value={draft.sendHour}
                              onChange={(e) => setDraft({ ...draft, sendHour: Number(e.target.value) })}
                            >
                              {HOURS.map((h) => (
                                <option key={h} value={h}>
                                  {hourLabel(h)}
                                </option>
                              ))}
                            </motion.select>
                          )}
                        </AnimatePresence>
                        <Switch
                          checked={draft.customHour}
                          onCheckedChange={(v) => setDraft({ ...draft, customHour: v })}
                          aria-label="Usar hora propia"
                        />
                      </div>
                    </div>

                    <Segmented
                      value={draft.customRecipients ? "custom" : "directors"}
                      onChange={(v) => setDraft({ ...draft, customRecipients: v === "custom" })}
                      layoutId="email-recipients-mode"
                      options={[
                        { id: "directors", label: `Directores (${directors.length})`, icon: Users },
                        { id: "custom", label: "Otros destinatarios", icon: Mail },
                      ]}
                    />
                    <AnimatePresence initial={false} mode="wait">
                      {draft.customRecipients ? (
                        <motion.div
                          key="custom"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 overflow-hidden"
                        >
                          <AutoTextarea
                            value={draft.recipientsText}
                            onChange={(e) => setDraft({ ...draft, recipientsText: e.target.value })}
                            placeholder="nombre@tec.mx"
                            className="rounded-xl py-[7px]"
                          />
                          <FieldHint>
                            Uno por línea. {parseRecipientList(draft.recipientsText).length} correos válidos.
                          </FieldHint>
                        </motion.div>
                      ) : (
                        <motion.p key="directors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-muted-foreground">
                          Usa la lista general de directores.{" "}
                          <button type="button" className="font-medium text-[#5b8fd4] hover:underline" onClick={() => openSettings("recipients")}>
                            Editar lista
                          </button>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </AdminPanelSection>
                </>
              )}

              {emailTab === "content" && (
                <>
                  <AdminPanelSection title="Asunto">
                    <Input
                      value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      placeholder="🚀 Recordatorio directores · Periodo 3 · Semana 1 | Ecosistema WCA"
                      className="h-10 rounded-xl"
                    />
                  </AdminPanelSection>
                  <AdminPanelSection title="Correo">
                    {draft.bodyHtml ? (
                      <EmailHtmlEditor
                        html={draft.bodyHtml}
                        text={draft.bodyText}
                        onHtmlChange={(html) => setDraft((d) => (d ? { ...d, bodyHtml: html } : d))}
                        onTextChange={(text) => setDraft((d) => (d ? { ...d, bodyText: text } : d))}
                      />
                    ) : (
                      <AdminEmptyState>
                        <p>Este correo aún no tiene contenido.</p>
                        <div className="mt-3 flex justify-center gap-2">
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEmailTab("general")}>
                            Elegir plantilla
                          </Button>
                          <Button size="sm" className="rounded-lg bg-[#5b8fd4] hover:bg-[#4a7fc4]" onClick={() => applyPreset("custom")}>
                            Empezar en blanco
                          </Button>
                        </div>
                      </AdminEmptyState>
                    )}
                  </AdminPanelSection>
                </>
              )}

              {emailTab === "send" && (
                <>
                  <AdminPanelSection title="Enviar una prueba">
                    <FieldHint>Manda este correo (tal como está ahora, aunque no lo hayas guardado) solo a ti para revisarlo.</FieldHint>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="correo@tec.mx"
                        className="h-10 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 shrink-0 rounded-xl"
                        disabled={testMutation.isPending || !testEmail.trim()}
                        onClick={() => testMutation.mutate()}
                      >
                        {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Enviar prueba
                      </Button>
                    </div>
                  </AdminPanelSection>

                  <AdminPanelSection title="Enviar ahora">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-sm">
                        Se manda en este momento a <strong>{draftRecipients.length} destinatarios</strong>
                        {draft.customRecipients ? " propios" : " (directores)"}, sin esperar a su fecha.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Si lo envías el mismo día que tiene programado, el envío automático ya no se repite.
                      </p>
                      <Button
                        type="button"
                        className="mt-3 h-10 w-full rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]"
                        disabled={!editing || emailDirty || sendNowMutation.isPending || draftRecipients.length === 0}
                        onClick={() => setConfirmSendNow(true)}
                      >
                        {sendNowMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar ahora
                      </Button>
                      {(!editing || emailDirty) && (
                        <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
                          Guarda el correo primero para poder enviarlo.
                        </p>
                      )}
                    </div>
                  </AdminPanelSection>

                  {editing && (
                    <AdminPanelSection title="Envíos de este correo">
                      {editingLogs.length === 0 ? (
                        <FieldHint>Todavía no se ha enviado.</FieldHint>
                      ) : (
                        <div className="space-y-2">
                          {editingLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs">
                              <span className="font-medium">
                                {log.kind === "test" ? "Prueba" : log.kind === "manual" ? "Envío manual" : "Envío automático"}
                              </span>
                              <span className="text-muted-foreground">
                                {log.createdAt ? new Date(log.createdAt).toLocaleString("es-MX") : ""} ·{" "}
                                {log.status === "sent" ? "Enviado" : log.status === "partial" ? "Parcial" : "Error"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </AdminPanelSection>
                  )}
                </>
              )}
            </AdminPanelBody>
            <AnimatePresence initial={false}>
              {emailDirty && !isNew && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-5 text-xs text-amber-600 dark:text-amber-400"
                >
                  <span className="block pb-2">Hay cambios sin guardar en este correo.</span>
                </motion.p>
              )}
            </AnimatePresence>
            <AdminPanelFooter
              onCancel={() => guard(() => setEmailTarget(null))}
              onSubmit={saveEmail}
              pending={saveEmailMutation.isPending}
              disabled={!isNew && !emailDirty}
              submitLabel={isNew ? "Crear correo" : "Guardar cambios"}
            />
          </>
        ) : null}
      </AdminEditPanel>

      {/* ───── Panel de configuración ───── */}
      <AdminEditPanel open={settingsOpen && !!settingsDraft} onClose={() => guard(() => setSettingsOpen(false))} widthClass="lg:w-[min(36rem,43vw)]">
        {settingsDraft && data ? (
          <>
            <AdminPanelHeader
              media={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4] text-white">
                  <Settings2 className="h-4 w-4" />
                </span>
              }
              title="Configuración de envío"
              subtitle={`Zona horaria: ${data.preview.timezone}`}
              onClose={() => guard(() => setSettingsOpen(false))}
            />
            <AdminPanelTabs
              tabs={[
                { id: "send", label: "Envío" },
                { id: "recipients", label: "Destinatarios" },
              ]}
              value={settingsTab}
              onChange={setSettingsTab}
              layoutId="email-settings-tab"
            />
            <AdminPanelBody contentKey={settingsTab}>
              {settingsTab === "send" ? (
                <AdminPanelSection title="Envío">
                  <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">Automatización {settingsDraft.enabled ? "activa" : "pausada"}</p>
                      <p className="text-xs text-muted-foreground">
                        {settingsDraft.enabled ? "Los correos programados salen solos." : "Ningún correo programado se enviará."}
                      </p>
                    </div>
                    <Switch checked={settingsDraft.enabled} onCheckedChange={(v) => setSettingsDraft({ ...settingsDraft, enabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender">Enviar desde</Label>
                    <select
                      id="sender"
                      className={SELECT_CLASS}
                      value={settingsDraft.senderId}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, senderId: e.target.value })}
                    >
                      {data.senders.map((s) => {
                        const available = !!data.senderAvailability?.[s.id];
                        return (
                          <option key={s.id} value={s.id} disabled={!available}>
                            {s.label}
                            {!available ? " (no configurado en servidor)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <FieldHint>{data.senders.find((s) => s.id === settingsDraft.senderId)?.description}</FieldHint>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sendHour">Hora general de envío</Label>
                    <select
                      id="sendHour"
                      className={SELECT_CLASS}
                      value={settingsDraft.sendHour}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, sendHour: Number(e.target.value) })}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </select>
                    <FieldHint>Cada correo puede tener su propia hora; si no, usa esta.</FieldHint>
                  </div>
                </AdminPanelSection>
              ) : (
                <AdminPanelSection title="Destinatarios">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="recipients">Directores</Label>
                      <span className="text-xs text-muted-foreground">
                        {parseRecipientList(settingsDraft.recipientsText).length} correos
                      </span>
                    </div>
                    <AutoTextarea
                      id="recipients"
                      maxHeight={320}
                      value={settingsDraft.recipientsText}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, recipientsText: e.target.value })}
                      placeholder={"nombre@tec.mx\notro@gmail.com"}
                      className="rounded-xl py-[7px]"
                    />
                    <FieldHint>Uno por línea. Sin CC/CCO, cada director recibe su propio correo.</FieldHint>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cc">Copia (CC)</Label>
                      <AutoTextarea
                        id="cc"
                        value={settingsDraft.ccText}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, ccText: e.target.value })}
                        placeholder="nombre@ecosistemawca.com"
                        className="rounded-xl py-[7px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bcc">Copia oculta (CCO)</Label>
                      <AutoTextarea
                        id="bcc"
                        value={settingsDraft.bccText}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, bccText: e.target.value })}
                        placeholder="nombre@ecosistemawca.com"
                        className="rounded-xl py-[7px]"
                      />
                    </div>
                  </div>
                  <FieldHint>
                    Con CC o CCO se manda un solo correo: los directores aparecen juntos en “Para”, los de CC se ven y los de CCO quedan ocultos.
                  </FieldHint>
                </AdminPanelSection>
              )}
            </AdminPanelBody>
            <AdminPanelFooter
              onCancel={() => guard(() => setSettingsOpen(false))}
              onSubmit={() => saveSettingsMutation.mutate(settingsDraft)}
              pending={saveSettingsMutation.isPending}
              disabled={!settingsDirty}
              submitLabel="Guardar configuración"
            />
          </>
        ) : null}
      </AdminEditPanel>

      {/* ───── Grupo ───── */}
      <AdminEditPanel open={!!groupDraft} onClose={() => setGroupDraft(null)} variant="modal" widthClass="lg:w-[30rem]">
        {groupDraft ? (
          <>
            <AdminPanelHeader
              media={
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white", EMAIL_GROUP_CLASS[groupDraft.color].bar)}>
                  <FolderPlus className="h-4 w-4" />
                </span>
              }
              title={groupDraft.id ? "Editar grupo" : "Nuevo grupo"}
              subtitle="Agrupa correos de un semestre o de un evento"
              onClose={() => setGroupDraft(null)}
              actions={
                groupDraft.id
                  ? [{ label: "Eliminar grupo", icon: Trash2, destructive: true, onClick: () => setConfirmDeleteGroup(true) }]
                  : undefined
              }
            />
            <AdminPanelBody>
              <AdminPanelSection title="Grupo">
                <Segmented
                  value={groupDraft.kind}
                  onChange={(kind) => setGroupDraft({ ...groupDraft, kind })}
                  layoutId="group-kind"
                  options={[
                    { id: "semester", label: "Semestre", icon: CalendarDays },
                    { id: "event", label: "Evento", icon: Sparkles },
                  ]}
                />
                <div className="space-y-2">
                  <Label htmlFor="group-name">Nombre</Label>
                  <Input
                    id="group-name"
                    value={groupDraft.name}
                    onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
                    placeholder={groupDraft.kind === "semester" ? "FJ27" : "WCA | Conecta"}
                    className="h-10 rounded-xl"
                  />
                  {groupDraft.kind === "semester" && <FieldHint>Usa el código del Tec (AD26, FJ27…); aparece en el correo de cierre.</FieldHint>}
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMAIL_GROUP_COLORS.map((c) => (
                      <motion.button
                        key={c}
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        title={EMAIL_GROUP_COLOR_LABEL[c]}
                        aria-label={EMAIL_GROUP_COLOR_LABEL[c]}
                        onClick={() => setGroupDraft({ ...groupDraft, color: c })}
                        className={cn(
                          "h-8 w-8 rounded-full transition",
                          EMAIL_GROUP_CLASS[c].bar,
                          groupDraft.color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="group-start">Inicio</Label>
                    <Input
                      id="group-start"
                      type="date"
                      value={groupDraft.startDate}
                      onChange={(e) => setGroupDraft({ ...groupDraft, startDate: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-end">Fin</Label>
                    <Input
                      id="group-end"
                      type="date"
                      value={groupDraft.endDate}
                      onChange={(e) => setGroupDraft({ ...groupDraft, endDate: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
                <FieldHint>Con fechas, el calendario sombrea el periodo del grupo con su color.</FieldHint>
              </AdminPanelSection>
            </AdminPanelBody>
            <AdminPanelFooter
              onCancel={() => setGroupDraft(null)}
              onSubmit={() => {
                if (!groupDraft.name.trim()) {
                  toast({ title: "Falta el nombre", description: "Ponle nombre al grupo.", variant: "destructive" });
                  return;
                }
                saveGroupMutation.mutate(groupDraft);
              }}
              pending={saveGroupMutation.isPending}
              submitLabel={groupDraft.id ? "Guardar grupo" : "Crear grupo"}
            />
          </>
        ) : null}
      </AdminEditPanel>

      {/* ───── Planeador de semestre ───── */}
      <AdminEditPanel open={plannerOpen} onClose={() => setPlannerOpen(false)} variant="modal" widthClass="lg:w-[42rem]">
        {plannerOpen ? (
          <>
            <AdminPanelHeader
              media={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4] text-white">
                  <CalendarPlus className="h-4 w-4" />
                </span>
              }
              title="Planear semestre"
              subtitle="3 periodos de 5 semanas con 2 Semanas Tec entre ellos"
              onClose={() => setPlannerOpen(false)}
            />
            <AdminPanelBody>
              <AdminPanelSection title="Semestre">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="planner-group">Grupo</Label>
                    <select
                      id="planner-group"
                      className={SELECT_CLASS}
                      value={plannerGroupId}
                      onChange={(e) => {
                        const v = e.target.value === "new" ? "new" : Number(e.target.value);
                        setPlannerGroupId(v);
                        const g = v === "new" ? null : groupById.get(v);
                        if (g?.startDate) setPlannerStart(g.startDate);
                        if (v === "new") {
                          const s = nextSemesterSuggestion(
                            today,
                            new Set(groups.map((x) => x.name.trim().toUpperCase())),
                          );
                          setPlannerStart(s.start);
                          setPlannerName(s.name);
                          setPlannerNameTouched(false);
                        }
                      }}
                    >
                      <option value="new">+ Nuevo semestre</option>
                      {groups
                        .filter((g) => g.kind === "semester")
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planner-start">Inicio de clases</Label>
                    <Input
                      id="planner-start"
                      type="date"
                      value={plannerStart}
                      onChange={(e) => {
                        setPlannerStart(e.target.value);
                        if (plannerGroupId === "new" && !plannerNameTouched && e.target.value) {
                          setPlannerName(suggestSemesterName(e.target.value));
                        }
                      }}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {plannerGroupId === "new" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid gap-3 overflow-hidden sm:grid-cols-2"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="planner-name">Código del semestre</Label>
                        <Input
                          id="planner-name"
                          value={plannerName}
                          onChange={(e) => {
                            setPlannerName(e.target.value);
                            setPlannerNameTouched(true);
                          }}
                          placeholder="FJ27"
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex h-10 items-center gap-2">
                          {EMAIL_GROUP_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              aria-label={EMAIL_GROUP_COLOR_LABEL[c]}
                              onClick={() => setPlannerColor(c)}
                              className={cn(
                                "h-7 w-7 rounded-full transition",
                                EMAIL_GROUP_CLASS[c].bar,
                                plannerColor === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <FieldHint>Cada correo cae en el lunes de su semana. Después puedes mover cualquiera desde el calendario.</FieldHint>
              </AdminPanelSection>

              {plan.length > 0 && (
                <AdminPanelSection
                  title="Correos a programar"
                  action={
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        className="text-[#5b8fd4] hover:underline"
                        onClick={() =>
                          setPlannerSelected(new Set(plan.filter((i) => !plannerExisting.has(i.presetKey)).map((i) => i.presetKey)))
                        }
                      >
                        Todos
                      </button>
                      <button type="button" className="text-muted-foreground hover:underline" onClick={() => setPlannerSelected(new Set())}>
                        Ninguno
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    {(["Periodo 1", "Semana Tec #1", "Periodo 2", "Semana Tec #2", "Periodo 3", "Cierre"] as const).map((phase) => {
                      const items = plan.filter((i) => i.phase === phase);
                      return (
                        <div key={phase} className="rounded-xl border">
                          <p className="border-b bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {phase}
                          </p>
                          <div className="divide-y">
                            {items.map((item) => {
                              const exists = plannerExisting.has(item.presetKey);
                              const past = item.sendDate < today;
                              const checked = exists || plannerSelected.has(item.presetKey);
                              return (
                                <label
                                  key={item.presetKey}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/30",
                                    exists && "cursor-default opacity-60",
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={exists}
                                    onCheckedChange={(v) =>
                                      setPlannerSelected((prev) => {
                                        const nextSet = new Set(prev);
                                        if (v) nextSet.add(item.presetKey);
                                        else nextSet.delete(item.presetKey);
                                        return nextSet;
                                      })
                                    }
                                  />
                                  <span className="text-base">{presetEmoji(item.presetKey)}</span>
                                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {exists ? "Ya existe" : past ? `${formatShort(item.sendDate)} · ya pasó` : formatShort(item.sendDate)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AdminPanelSection>
              )}
            </AdminPanelBody>
            <AdminPanelFooter
              onCancel={() => setPlannerOpen(false)}
              onSubmit={() => plannerMutation.mutate()}
              pending={plannerMutation.isPending}
              disabled={plan.filter((i) => plannerSelected.has(i.presetKey) && !plannerExisting.has(i.presetKey)).length === 0}
              submitLabel={`Programar ${plan.filter((i) => plannerSelected.has(i.presetKey) && !plannerExisting.has(i.presetKey)).length} correos`}
            />
          </>
        ) : null}
      </AdminEditPanel>

      {/* ───── Confirmaciones ───── */}
      <ConfirmDialog
        open={discardAction != null}
        onOpenChange={(open) => !open && setDiscardAction(null)}
        title="Cambios sin guardar"
        description="Tienes cambios sin guardar. Si continúas, se perderán."
        confirmLabel="Descartar cambios"
        destructive
        onConfirm={() => {
          const action = discardAction;
          setDiscardAction(null);
          setDraft(baseline ? (JSON.parse(baseline) as EmailDraft) : null);
          setSettingsDraft(settingsBaseline ? (JSON.parse(settingsBaseline) as SettingsDraft) : null);
          closeAllPanels();
          action?.();
        }}
      />

      <ConfirmDialog
        open={confirmPreset != null}
        onOpenChange={(open) => !open && setConfirmPreset(null)}
        title="Reemplazar el contenido"
        description="Ya editaste el contenido de este correo. Si usas otra plantilla, se reemplazarán el nombre, el asunto y el contenido."
        confirmLabel="Usar plantilla"
        onConfirm={() => {
          if (confirmPreset) applyPreset(confirmPreset);
          setConfirmPreset(null);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteEmail}
        onOpenChange={setConfirmDeleteEmail}
        title="Eliminar correo"
        description={`“${draft?.label ?? ""}” se borrará y ya no se enviará. El historial de envíos se conserva.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          setConfirmDeleteEmail(false);
          if (editing) deleteEmailMutation.mutate(editing.id);
        }}
      />

      <ConfirmDialog
        open={confirmSendNow}
        onOpenChange={setConfirmSendNow}
        title="¿Enviar ahora?"
        description={`“${draft?.label ?? ""}” se enviará en este momento a ${draftRecipients.length} destinatarios.`}
        confirmLabel="Enviar"
        onConfirm={() => {
          setConfirmSendNow(false);
          if (editing) sendNowMutation.mutate(editing.id);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteGroup}
        onOpenChange={setConfirmDeleteGroup}
        title="Eliminar grupo"
        description={`El grupo “${groupDraft?.name ?? ""}” se eliminará. Sus correos no se borran: quedan como “Sin grupo” y se siguen enviando.`}
        confirmLabel="Eliminar grupo"
        destructive
        onConfirm={() => {
          setConfirmDeleteGroup(false);
          if (groupDraft?.id) deleteGroupMutation.mutate(groupDraft.id);
        }}
      />
    </>
  );
}
