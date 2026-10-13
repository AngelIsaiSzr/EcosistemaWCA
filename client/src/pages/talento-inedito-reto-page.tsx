import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
  Globe,
  Link2,
  Loader2,
  Mail,
  MailCheck,
  PlayCircle,
  Search,
  Send,
  Settings2,
  ShieldBan,
  Sparkles,
  Trash2,
  Video,
  Wand2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/navbar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AdminEditPanel,
  AdminPanelBody,
  AdminPanelFooter,
  AdminPanelHeader,
  AdminPanelSection,
  AdminPanelTabs,
} from "@/components/admin/edit-panel";
import { EmailHtmlEditor } from "@/components/email/email-html-editor";
import { analyzeEmailList, splitEmailInput, suggestEmailFix } from "@shared/email-list";
import type { IneditoRetoSettings } from "@shared/schema";

type SenderOption = { id: string; label: string; fromEmail: string };

type RetoSettingsResponse = IneditoRetoSettings & {
  senders: SenderOption[];
  senderAvailability: Record<string, boolean>;
};

type TokenRow = {
  id: number;
  token: string;
  email: string;
  status: string;
  isTest: boolean;
  expiresAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  url: string;
};

type TokensResponse = {
  tokens: TokenRow[];
  counts: Record<string, number>;
};

type SendResult = {
  dryRun: boolean;
  sent: number;
  failed: number;
  results: Array<{ email: string; ok: boolean; url?: string; error?: string }>;
  skipped?: { duplicates: number; invalid: string[] };
  senderId?: string;
};

type SettingsDraft = {
  videoUrl: string;
  linkTtlHours: number;
  senderId: string;
  fromName: string;
  emailSubject: string;
  emailBodyText: string;
  emailBodyHtml: string;
};

type SettingsTab = "video" | "email";

const SIDE_PANEL_MARGIN =
  "lg:mr-[calc(min(46rem,52vw)_+_1.5rem_-_(100vw_-_1024px)_/_2)] xl:mr-[calc(min(46rem,52vw)_+_1.5rem_-_(100vw_-_1280px)_/_2)] 2xl:mr-[calc(min(46rem,52vw)_+_1.5rem_-_(100vw_-_1536px)_/_2)]";

const STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  pending: { label: "Pendiente", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  opened: { label: "Abierto", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  completed: { label: "Completado", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  expired: { label: "Expirado", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300", dot: "bg-zinc-400" },
  revoked: { label: "Revocado", className: "bg-red-500/10 text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

type StatusFilter = "all" | "pending" | "opened" | "completed" | "closed" | "test";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "opened", label: "Abiertos" },
  { id: "completed", label: "Completados" },
  { id: "closed", label: "Expirados / revocados" },
  { id: "test", label: "Pruebas" },
];

function looksLikeGoogleDrive(url: string) {
  return /drive\.google\.com|docs\.google\.com/i.test(url);
}

function looksLikeYoutube(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

function settingsToDraft(s: IneditoRetoSettings): SettingsDraft {
  return {
    videoUrl: s.videoUrl ?? "",
    linkTtlHours: s.linkTtlHours ?? 72,
    senderId: s.senderId ?? "contacto",
    fromName: s.fromName ?? "WCA | INÉDITO",
    emailSubject: s.emailSubject ?? "",
    emailBodyText: s.emailBodyText ?? "",
    emailBodyHtml: s.emailBodyHtml ?? "",
  };
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function timeLeft(value: string | null) {
  if (!value) return "Sin vencimiento";
  const ms = new Date(value).getTime() - Date.now();
  if (ms <= 0) return "Vencido";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `Vence en ${Math.round(h / 24)} días`;
  if (h >= 1) return `Vence en ${h} h`;
  return `Vence en ${Math.max(1, Math.round(ms / 60_000))} min`;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
  index,
  tone = "default",
}: {
  icon: typeof Mail;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
  index: number;
  tone?: "default" | "warning";
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
        tone === "warning" && "border-amber-500/40",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors",
          tone === "warning"
            ? "bg-amber-500/15 text-amber-600 ring-amber-500/25"
            : "bg-[#5b8fd4]/15 text-[#5b8fd4] ring-[#5b8fd4]/25 group-hover:bg-[#5b8fd4] group-hover:text-white",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="truncate font-semibold leading-snug">{value}</div>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </motion.div>
  );
}

function Card({ title, icon: Icon, description, action, children, className }: {
  title: string;
  icon: typeof Mail;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl border bg-card p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1c3d] to-[#0056FF] text-white shadow-md shadow-[#0056FF]/20">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold leading-tight">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export default function TalentoIneditoRetoPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [massEmails, setMassEmails] = useState("");
  const [undeliverable, setUndeliverable] = useState<string[] | null>(null);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [lastTest, setLastTest] = useState<{ to: string; from: string; url: string } | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("video");
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (user?.email && !testTo) setTestTo(user.email);
  }, [user?.email, testTo]);

  const settingsQuery = useQuery<RetoSettingsResponse>({
    queryKey: ["/api/talento/reto/settings"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/reto/settings", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      return res.json();
    },
  });

  const tokensQuery = useQuery<TokensResponse>({
    queryKey: ["/api/talento/reto/tokens"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/reto/tokens?limit=200", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar los enlaces");
      return res.json();
    },
  });

  const settings = settingsQuery.data;
  const senders = settings?.senders ?? [];
  const availability = settings?.senderAvailability ?? {};
  const savedSender = senders.find((s) => s.id === settings?.senderId) ?? senders[0];
  const savedSenderReady = savedSender ? availability[savedSender.id] !== false : false;
  const videoReady = !!settings?.videoUrl?.trim();

  /* ——— Configuración ——— */
  const draftDirty = useMemo(() => {
    if (!draft || !settings) return false;
    return JSON.stringify(draft) !== JSON.stringify(settingsToDraft(settings));
  }, [draft, settings]);

  const openSettings = (tab: SettingsTab = "video") => {
    if (!settings) return;
    if (!settingsOpen || !draft) setDraft(settingsToDraft(settings));
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    if (draftDirty) setDiscardOpen(true);
    else setSettingsOpen(false);
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (d: SettingsDraft) => {
      const res = await apiRequest("PATCH", "/api/talento/reto/settings", d);
      return res.json() as Promise<RetoSettingsResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/talento/reto/settings"], data);
      setDraft(settingsToDraft(data));
      setSettingsOpen(false);
      toast({ title: "Configuración guardada" });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  /* ——— Lista de correos ——— */
  const analysis = useMemo(() => analyzeEmailList(splitEmailInput(massEmails)), [massEmails]);
  const validCount = analysis.valid.length;

  useEffect(() => {
    setUndeliverable(null);
  }, [massEmails]);

  const fixSuggestion = (email: string, suggestion: string) => {
    const pattern = new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    setMassEmails((prev) => prev.replace(pattern, suggestion));
  };

  const fixAllSuggestions = () => {
    setMassEmails((prev) =>
      splitEmailInput(prev)
        .map((e) => suggestEmailFix(e.toLowerCase()) ?? e)
        .join("\n"),
    );
  };

  const cleanList = () => {
    setMassEmails(analysis.valid.join("\n"));
    toast({
      title: "Lista limpia",
      description: `Se quitaron ${analysis.duplicates.length} repetidos y ${analysis.invalid.length} inválidos.`,
    });
  };

  const validateDomainsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/talento/reto/validate-emails", { emails: analysis.valid });
      return res.json() as Promise<{ checkedDomains: number; undeliverable: string[] }>;
    },
    onSuccess: (data) => {
      setUndeliverable(data.undeliverable);
      toast({
        title: data.undeliverable.length ? "Hay dominios que no reciben correo" : "Dominios verificados",
        description: data.undeliverable.length
          ? `${data.undeliverable.length} correo(s) tienen un dominio que no existe o no acepta correo.`
          : `Los ${data.checkedDomains} dominio(s) existen y aceptan correo.`,
        variant: data.undeliverable.length ? "destructive" : undefined,
      });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo verificar", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await apiRequest("POST", "/api/talento/reto/send", { emails: analysis.valid, dryRun });
      return res.json() as Promise<SendResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      if (!data.dryRun) queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      if (data.dryRun) {
        toast({ title: "Simulación lista", description: `Se enviarían ${data.sent} correo(s). No se creó ningún enlace.` });
      } else {
        toast({
          title: data.failed ? "Envío con errores" : "Reto enviado",
          description: `${data.sent} enviado(s)${data.failed ? ` · ${data.failed} fallido(s)` : ""}.`,
          variant: data.failed && !data.sent ? "destructive" : undefined,
        });
        if (data.sent > 0 && data.failed === 0) setMassEmails("");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error en el envío", description: error.message, variant: "destructive" });
    },
  });

  /* ——— Pruebas ——— */
  const testEmailMutation = useMutation({
    mutationFn: async (useDraft: boolean) => {
      const res = await apiRequest("POST", "/api/talento/reto/test-email", {
        to: testTo.trim(),
        draft: useDraft && draft
          ? {
              emailSubject: draft.emailSubject,
              emailBodyText: draft.emailBodyText,
              emailBodyHtml: draft.emailBodyHtml,
              senderId: draft.senderId,
              fromName: draft.fromName,
            }
          : undefined,
      });
      return res.json() as Promise<{ ok: boolean; to: string; fromAddress: string; token: TokenRow }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      setLastTest({ to: data.to, from: data.fromAddress, url: data.token.url });
      toast({ title: "Correo de prueba enviado", description: `Revisa la bandeja de ${data.to} (y spam).` });
    },
    onError: (error: Error) => {
      toast({ title: "La prueba falló", description: error.message, variant: "destructive" });
    },
  });

  const testLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/talento/reto/test-link", { email: testTo.trim() || undefined });
      return res.json() as Promise<TokenRow>;
    },
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      try {
        await navigator.clipboard.writeText(created.url);
        toast({ title: "Enlace de prueba copiado", description: "Ábrelo en una ventana privada para probar el flujo." });
      } catch {
        toast({ title: "Enlace de prueba creado", description: created.url });
      }
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo crear", description: error.message, variant: "destructive" });
    },
  });

  /* ——— Enlaces ——— */
  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/talento/reto/tokens/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      toast({ title: "Enlace revocado", description: "Ya no se puede abrir." });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo revocar", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/talento/reto/tokens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      toast({ title: "Enlace eliminado" });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  const copy = async (text: string, title = "Enlace copiado") => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
    } catch {
      toast({ title: "No se pudo copiar", description: text });
    }
  };

  const tokens = tokensQuery.data?.tokens ?? [];
  const counts = tokensQuery.data?.counts ?? {};
  const filteredTokens = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tokens.filter((t) => {
      if (filter === "test" && !t.isTest) return false;
      if (filter === "pending" && t.status !== "pending") return false;
      if (filter === "opened" && t.status !== "opened") return false;
      if (filter === "completed" && t.status !== "completed") return false;
      if (filter === "closed" && t.status !== "expired" && t.status !== "revoked") return false;
      return !q || t.email.toLowerCase().includes(q);
    });
  }, [tokens, filter, search]);

  const filterCount = (id: StatusFilter) => {
    switch (id) {
      case "all":
        return tokens.length;
      case "test":
        return tokens.filter((t) => t.isTest).length;
      case "closed":
        return tokens.filter((t) => t.status === "expired" || t.status === "revoked").length;
      default:
        return tokens.filter((t) => t.status === id).length;
    }
  };

  if (isLoading || !user || user.role !== "talento") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const panelOpen = settingsOpen && !!draft;
  const draftSender = draft ? senders.find((s) => s.id === draft.senderId) : undefined;
  const draftVideo = draft?.videoUrl.trim() ?? "";
  const totalReal = (counts.pending ?? 0) + (counts.opened ?? 0) + (counts.completed ?? 0) + (counts.expired ?? 0) + (counts.revoked ?? 0);

  return (
    <>
      <Helmet>
        <title>Reto INÉDITO | Talento y Bienestar</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className={cn("transition-[margin] duration-300 ease-out", panelOpen && SIDE_PANEL_MARGIN)}>
            {/* Encabezado */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  <Link href="/talento" className="hover:text-foreground">
                    Inicio
                  </Link>
                  {" › "}
                  <Link href="/talento/inedito" className="hover:text-foreground">
                    INÉDITO
                  </Link>
                  {" › "}
                  Reto
                </p>
                <h1 className="mt-1 font-heading text-4xl font-bold">Reto INÉDITO</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Envía a cada persona preseleccionada un enlace único al vídeo del reto. Cada enlace sirve una sola vez y caduca solo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]" onClick={() => openSettings()}>
                  <Settings2 className="h-4 w-4" />
                  Configuración
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" asChild>
                  <Link href="/talento/inedito">
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </Link>
                </Button>
              </div>
            </div>

            {settingsQuery.isLoading || !settings ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Resumen */}
                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    index={0}
                    icon={videoReady ? PlayCircle : AlertTriangle}
                    tone={videoReady && savedSenderReady ? "default" : "warning"}
                    label="Estado del reto"
                    value={
                      videoReady && savedSenderReady ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Listo para enviar</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">{videoReady ? "Remitente sin configurar" : "Falta el vídeo"}</span>
                      )
                    }
                    hint={`Vigencia ${settings.linkTtlHours} h por enlace${videoReady && savedSenderReady ? "" : " · ábrelo en Configuración"}`}
                    onClick={
                      videoReady && savedSenderReady
                        ? undefined
                        : () => openSettings(videoReady ? "email" : "video")
                    }
                  />
                  <SummaryCard
                    index={1}
                    icon={MailCheck}
                    label="Se envía desde"
                    value={settings.fromName || "WCA | INÉDITO"}
                    hint={savedSender?.fromEmail ?? settings.senderId}
                  />
                  <SummaryCard
                    index={2}
                    icon={Clock}
                    label="Esperando respuesta"
                    value={`${(counts.pending ?? 0) + (counts.opened ?? 0)} enlaces`}
                    hint={`${counts.pending ?? 0} sin abrir · ${counts.opened ?? 0} abiertos`}
                    onClick={() => setFilter("pending")}
                  />
                  <SummaryCard
                    index={3}
                    icon={CheckCircle2}
                    label="Vieron el vídeo completo"
                    value={`${counts.completed ?? 0} personas`}
                    hint={totalReal ? `${Math.round(((counts.completed ?? 0) / totalReal) * 100)}% de ${totalReal} enlaces` : "Aún no hay enlaces"}
                    onClick={() => setFilter("completed")}
                  />
                </div>

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] xl:items-stretch">
                  <div className="flex flex-col gap-6">
                    {/* Envío */}
                    <Card
                      icon={Send}
                      title="Enviar el reto"
                      description="Pega los correos de las personas preseleccionadas. Cada una recibe su propio enlace."
                    >
                      <Textarea
                        rows={7}
                        value={massEmails}
                        onChange={(e) => setMassEmails(e.target.value)}
                        placeholder={"persona1@gmail.com\npersona2@tec.mx, persona3@hotmail.com"}
                        className="resize-y font-mono text-sm"
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Uno por línea o separados por coma, punto y coma o espacio. Puedes pegar una columna de Excel.
                      </p>

                      {massEmails.trim() ? (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {validCount} válido{validCount === 1 ? "" : "s"}
                            </span>
                            {analysis.duplicates.length ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-1 font-medium text-zinc-600 dark:text-zinc-300">
                                <Copy className="h-3.5 w-3.5" />
                                {analysis.duplicates.length} repetido{analysis.duplicates.length === 1 ? "" : "s"} (se envía una vez)
                              </span>
                            ) : null}
                            {analysis.invalid.length ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 font-medium text-red-700 dark:text-red-300">
                                <XCircle className="h-3.5 w-3.5" />
                                {analysis.invalid.length} inválido{analysis.invalid.length === 1 ? "" : "s"}
                              </span>
                            ) : null}
                            {analysis.suspicious.length ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {analysis.suspicious.length} con posible error
                              </span>
                            ) : null}
                            {undeliverable && undeliverable.length === 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                                <Globe className="h-3.5 w-3.5" />
                                Dominios verificados
                              </span>
                            ) : null}
                          </div>

                          {analysis.invalid.length ? (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">
                              <p className="mb-1.5 font-medium text-red-700 dark:text-red-300">No parecen correos (no se enviarán):</p>
                              <p className="break-all font-mono text-xs text-red-700/80 dark:text-red-300/80">{analysis.invalid.slice(0, 12).join(" · ")}{analysis.invalid.length > 12 ? " …" : ""}</p>
                            </div>
                          ) : null}

                          {analysis.suspicious.length ? (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="font-medium text-amber-700 dark:text-amber-300">¿Error de dedo en el dominio?</p>
                                {analysis.suspicious.length > 1 ? (
                                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={fixAllSuggestions}>
                                    <Wand2 className="mr-1 h-3.5 w-3.5" />
                                    Corregir todos
                                  </Button>
                                ) : null}
                              </div>
                              <ul className="space-y-1">
                                {analysis.suspicious.slice(0, 8).map((s) => (
                                  <li key={s.email} className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="font-mono line-through opacity-70">{s.email}</span>
                                    <span>→</span>
                                    <span className="font-mono font-medium">{s.suggestion}</span>
                                    <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => fixSuggestion(s.email, s.suggestion)}>
                                      Corregir
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {undeliverable && undeliverable.length ? (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">
                              <p className="mb-1.5 font-medium text-red-700 dark:text-red-300">Su dominio no existe o no recibe correo:</p>
                              <p className="break-all font-mono text-xs text-red-700/80 dark:text-red-300/80">{undeliverable.join(" · ")}</p>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            {analysis.duplicates.length || analysis.invalid.length ? (
                              <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={cleanList}>
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                                Limpiar lista
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-xs"
                              disabled={!validCount || validateDomainsMutation.isPending}
                              onClick={() => validateDomainsMutation.mutate()}
                            >
                              {validateDomainsMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Globe className="mr-1 h-3.5 w-3.5" />}
                              Verificar dominios
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="min-w-0 text-xs text-muted-foreground">
                          Desde <span className="font-medium text-foreground">{settings.fromName}</span>{" "}
                          &lt;{savedSender?.fromEmail ?? settings.senderId}&gt; · se cambia en Configuración.
                        </p>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            className="h-10 shrink-0 rounded-xl"
                            disabled={sendMutation.isPending || validCount === 0 || !videoReady}
                            onClick={() => sendMutation.mutate(true)}
                          >
                            Simular
                          </Button>
                          <Button
                            className="h-10 shrink-0 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]"
                            disabled={sendMutation.isPending || validCount === 0 || !videoReady || !savedSenderReady}
                            onClick={() => setSendConfirmOpen(true)}
                          >
                            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Enviar{validCount > 0 ? ` a ${validCount}` : ""}
                          </Button>
                        </div>
                      </div>
                      {!videoReady ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Configura primero la URL del vídeo.</p>
                      ) : !savedSenderReady ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          El remitente elegido no tiene contraseña SMTP en el servidor. Elige otro en Configuración › Correo.
                        </p>
                      ) : null}
                    </Card>

                    {lastResult ? (
                      <Card
                        icon={lastResult.dryRun ? Eye : lastResult.failed ? AlertTriangle : CheckCircle2}
                        title={lastResult.dryRun ? "Simulación" : "Resultado del envío"}
                        description={
                          lastResult.dryRun
                            ? `Se enviaría a ${lastResult.sent} persona(s). No se creó ningún enlace ni se mandó nada.`
                            : `${lastResult.sent} enviado(s)${lastResult.failed ? ` · ${lastResult.failed} con error` : ""}.`
                        }
                        action={
                          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setLastResult(null)}>
                            Cerrar
                          </Button>
                        }
                      >
                        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                          {lastResult.results.map((r) => (
                            <li key={r.email} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                              {r.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                              <span className="min-w-0 flex-1 truncate">{r.email}</span>
                              {r.error ? <span className="max-w-[50%] truncate text-xs text-red-600 dark:text-red-400" title={r.error}>{r.error}</span> : null}
                              {r.url ? (
                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(r.url!)} aria-label="Copiar enlace">
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    ) : null}

                    {/* Pruebas */}
                    <Card
                      icon={FlaskConical}
                      title="Probar"
                      description="Recibe el correo real tal como lo verán los participantes (con [PRUEBA] en el asunto)."
                      className="border-dashed border-[#5b8fd4]/40"
                    >
                      <Label className="text-xs">Enviar la prueba a</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="tu@correo.com" />
                        <Button
                          className="shrink-0 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]"
                          disabled={!testTo.trim() || !videoReady || testEmailMutation.isPending}
                          onClick={() => testEmailMutation.mutate(false)}
                        >
                          {testEmailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          Enviar prueba
                        </Button>
                      </div>
                      {lastTest ? (
                        <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                          <p>
                            Enviado a <strong>{lastTest.to}</strong> desde <strong>{lastTest.from}</strong>. Revisa también spam.
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => copy(lastTest.url)}>
                              <Copy className="mr-1 h-3 w-3" />
                              Copiar enlace
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                              <a href={lastTest.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Abrir reto
                              </a>
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">¿Solo quieres probar el vídeo? Crea un enlace sin enviar correo.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 rounded-lg"
                          disabled={!videoReady || testLinkMutation.isPending}
                          onClick={() => testLinkMutation.mutate()}
                        >
                          {testLinkMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
                          Crear enlace
                        </Button>
                      </div>
                    </Card>
                  </div>

                  <div className="min-h-[28rem] xl:min-h-0">
                    {/* Enlaces */}
                    <Card
                      icon={Link2}
                      title="Enlaces"
                      description="Quién lo abrió, quién terminó el vídeo y cuáles siguen vigentes."
                      className="h-full"
                    >
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {FILTERS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                              filter === f.id
                                ? "border-[#5b8fd4] bg-[#5b8fd4]/10 text-foreground"
                                : "border-transparent bg-muted/60 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {f.label} <span className="opacity-60">{filterCount(f.id)}</span>
                          </button>
                        ))}
                      </div>
                      <div className="relative mb-3">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por correo" className="pl-9" />
                      </div>
                      {tokensQuery.isLoading ? (
                        <div className="flex flex-1 items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredTokens.length === 0 ? (
                        <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                          {tokens.length ? "Nada con ese filtro." : "Aún no hay enlaces."}
                        </p>
                      ) : (
                        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                          {filteredTokens.map((t) => {
                            const meta = STATUS_META[t.status] ?? STATUS_META.pending!;
                            const active = t.status === "pending" || t.status === "opened";
                            return (
                              <li key={t.id} className="group rounded-xl border px-3 py-2.5 transition hover:border-foreground/20">
                                <div className="flex items-start gap-3">
                                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                                  <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                                      <span className="truncate">{t.email || "(sin correo)"}</span>
                                      {t.isTest ? (
                                        <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">
                                          prueba
                                        </span>
                                      ) : null}
                                    </p>
                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", meta.className)}>{meta.label}</span>
                                      <span>Creado {formatDate(t.createdAt)}</span>
                                      {t.completedAt ? <span>· terminó {formatDate(t.completedAt)}</span> : t.openedAt ? <span>· abierto {formatDate(t.openedAt)}</span> : null}
                                      {active ? <span>· {timeLeft(t.expiresAt)}</span> : null}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-0.5">
                                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Copiar enlace" onClick={() => copy(t.url)}>
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" asChild>
                                      <a href={t.url} target="_blank" rel="noreferrer" title="Abrir">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    </Button>
                                    {active ? (
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                        title="Revocar"
                                        onClick={() => setRevokeId(t.id)}
                                      >
                                        <ShieldBan className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                        title="Eliminar"
                                        onClick={() => setDeleteId(t.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Configuración */}
      <AdminEditPanel open={panelOpen} onClose={closeSettings} widthClass="lg:w-[min(46rem,52vw)]">
        {draft ? (
          <>
            <AdminPanelHeader
              media={
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1c3d] to-[#0056FF] text-white">
                  <Settings2 className="h-4 w-4" />
                </span>
              }
              title="Configuración del reto"
              subtitle={draftDirty ? "Cambios sin guardar" : "Vídeo, vigencia y correo"}
              onClose={closeSettings}
            />
            <AdminPanelTabs
              layoutId="reto-settings-tab"
              value={settingsTab}
              onChange={setSettingsTab}
              tabs={[
                { id: "video", label: "Vídeo", hasError: !draftVideo },
                { id: "email", label: "Correo", hasError: !draft.emailSubject.trim() || !draft.fromName.trim() },
              ]}
            />
            <AdminPanelBody contentKey={settingsTab}>
              {settingsTab === "video" ? (
                <>
                  <AdminPanelSection title="Vídeo del reto">
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL del vídeo (MP4 / WebM directo)</Label>
                      <Input
                        value={draft.videoUrl}
                        onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
                        placeholder="https://…/reto.mp4 o /media/reto.mp4"
                      />
                    </div>
                    {looksLikeGoogleDrive(draftVideo) || looksLikeYoutube(draftVideo) ? (
                      <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          {looksLikeGoogleDrive(draftVideo) ? "Google Drive" : "YouTube/Vimeo"} no sirve aquí: no se puede detectar el final del vídeo ni
                          forzar un solo uso. Sube un MP4 a <code>/media</code> o a un host de vídeo directo.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Ideal: archivo MP4 en el mismo sitio (/media/…) o una URL https directa.</p>
                    )}
                    {draftVideo && !looksLikeGoogleDrive(draftVideo) && !looksLikeYoutube(draftVideo) ? (
                      <div className="overflow-hidden rounded-xl border bg-black">
                        <video key={draftVideo} src={draftVideo} controls preload="metadata" className="aspect-video w-full" />
                      </div>
                    ) : !draftVideo ? (
                      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
                        <Video className="h-6 w-6" />
                        Aquí verás el vídeo
                      </div>
                    ) : null}
                  </AdminPanelSection>
                  <AdminPanelSection title="Vigencia">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[24, 48, 72, 168].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setDraft({ ...draft, linkTtlHours: h })}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-xs font-medium transition",
                            draft.linkTtlHours === h ? "border-[#5b8fd4] bg-[#5b8fd4]/10 ring-1 ring-[#5b8fd4]/40" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {h === 168 ? "1 semana" : `${h / 24} día${h === 24 ? "" : "s"}`}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={draft.linkTtlHours}
                        onChange={(e) => setDraft({ ...draft, linkTtlHours: Math.min(1440, Math.max(1, Number(e.target.value) || 1)) })}
                        className="w-28"
                      />
                      <span className="text-sm text-muted-foreground">horas</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Al vencer, o en cuanto la persona termina el vídeo, el enlace deja de funcionar. Aplica a los enlaces nuevos.
                    </p>
                  </AdminPanelSection>
                </>
              ) : (
                <>
                  <AdminPanelSection title="Remitente">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Enviar desde</Label>
                        <Select value={draft.senderId} onValueChange={(senderId) => setDraft({ ...draft, senderId })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Elige un correo" />
                          </SelectTrigger>
                          <SelectContent>
                            {senders.map((s) => (
                              <SelectItem key={s.id} value={s.id} disabled={availability[s.id] === false}>
                                <span className="flex flex-col">
                                  <span>{s.fromEmail}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {s.label}
                                    {availability[s.id] === false ? " · sin contraseña en el servidor" : ""}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nombre que verán</Label>
                        <Input value={draft.fromName} maxLength={80} onChange={(e) => setDraft({ ...draft, fromName: e.target.value })} placeholder="WCA | INÉDITO" />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Llegará como <strong className="text-foreground">{draft.fromName || "…"}</strong> &lt;{draftSender?.fromEmail ?? draft.senderId}&gt;. Las
                      contraseñas viven solo en el servidor (Render).
                    </p>
                  </AdminPanelSection>
                  <AdminPanelSection title="Mensaje">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Asunto</Label>
                      <Input value={draft.emailSubject} onChange={(e) => setDraft({ ...draft, emailSubject: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      Variables:
                      {["{{link}}", "{{email}}"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => copy(v, `${v} copiado`)}
                          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground hover:bg-muted/70"
                        >
                          {v}
                        </button>
                      ))}
                      <span>· El enlace único de cada persona reemplaza a {"{{link}}"}.</span>
                    </div>
                    {!draft.emailBodyHtml.includes("{{link}}") && !draft.emailBodyText.includes("{{link}}") ? (
                      <div className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        El correo no incluye {"{{link}}"}: las personas no recibirían su enlace.
                      </div>
                    ) : null}
                    <EmailHtmlEditor
                      html={draft.emailBodyHtml}
                      text={draft.emailBodyText}
                      onHtmlChange={(emailBodyHtml) => setDraft((d) => (d ? { ...d, emailBodyHtml } : d))}
                      onTextChange={(emailBodyText) => setDraft((d) => (d ? { ...d, emailBodyText } : d))}
                    />
                  </AdminPanelSection>
                  <AdminPanelSection title="Probar este borrador">
                    <div className="flex gap-2">
                      <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="tu@correo.com" />
                      <Button
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        disabled={!testTo.trim() || !videoReady || testEmailMutation.isPending || availability[draft.senderId] === false}
                        onClick={() => testEmailMutation.mutate(true)}
                      >
                        {testEmailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                        Enviar prueba
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Se envía un correo real con lo que tienes en pantalla (aunque no lo hayas guardado), desde el remitente elegido.
                      {!videoReady ? " Primero guarda la URL del vídeo." : ""}
                    </p>
                  </AdminPanelSection>
                </>
              )}
            </AdminPanelBody>
            <AdminPanelFooter
              onCancel={closeSettings}
              submitLabel="Guardar"
              pending={saveSettingsMutation.isPending}
              disabled={!draftDirty || !draft.emailSubject.trim() || !draft.fromName.trim()}
              onSubmit={() => saveSettingsMutation.mutate(draft)}
            />
          </>
        ) : null}
      </AdminEditPanel>

      <ConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title={`¿Enviar el reto a ${validCount} persona${validCount === 1 ? "" : "s"}?`}
        description={
          <>
            Cada una recibirá un enlace único de un solo uso desde <strong>{settings?.fromName}</strong> &lt;{savedSender?.fromEmail}&gt;, válido por{" "}
            {settings?.linkTtlHours} h.
            {analysis.suspicious.length ? ` Ojo: ${analysis.suspicious.length} correo(s) parecen tener un error de dedo.` : ""}
            {undeliverable?.length ? ` ${undeliverable.length} correo(s) tienen un dominio que no recibe correo.` : ""}
          </>
        }
        confirmLabel="Enviar"
        onConfirm={() => {
          setSendConfirmOpen(false);
          sendMutation.mutate(false);
        }}
      />

      <ConfirmDialog
        open={revokeId != null}
        onOpenChange={(open) => !open && setRevokeId(null)}
        title="¿Revocar este enlace?"
        description="La persona ya no podrá abrir el reto con este enlace. Puedes enviarle uno nuevo después."
        confirmLabel="Revocar"
        destructive
        onConfirm={() => {
          if (revokeId != null) revokeMutation.mutate(revokeId);
          setRevokeId(null);
        }}
      />

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="¿Eliminar este enlace?"
        description="Se quitará de la lista y de las estadísticas. No se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (deleteId != null) deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
      />

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="¿Descartar los cambios?"
        description="Cerraste la configuración con cambios sin guardar."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          setSettingsOpen(false);
          if (settings) setDraft(settingsToDraft(settings));
        }}
      />
    </>
  );
}
