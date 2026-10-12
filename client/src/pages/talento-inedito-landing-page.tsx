import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import {
  AlignLeft,
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Columns,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  HelpCircle,
  Images,
  LayoutGrid,
  ListOrdered,
  Loader2,
  Megaphone,
  Monitor,
  MoreHorizontal,
  MousePointerClick,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Settings2,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/navbar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminPanelBody, AdminPanelTabs } from "@/components/admin/edit-panel";
import {
  GlobalSettingsEditor,
  SectionContentEditor,
  SectionDesignEditor,
} from "@/components/inedito/landing-editor-fields";
import { LANDING_PREVIEW_MSG } from "@/components/inedito/landing-view";
import {
  DEFAULT_LANDING_CONTENT,
  SECTION_TYPE_META,
  LANDING_SECTION_TYPES,
  cloneLandingContent,
  createLandingSection,
  duplicateLandingSection,
  normalizeLandingContent,
  type IneditoLandingContent,
  type LandingSection,
  type LandingSectionStyle,
  type LandingSectionType,
} from "@shared/inedito-landing";

type LandingSettingsResponse = {
  id: number;
  isEnabled: boolean;
  customized: boolean;
  content: IneditoLandingContent;
  updatedAt: string;
};

const TYPE_ICON: Record<LandingSectionType, LucideIcon> = {
  hero: Monitor,
  stats: BarChart3,
  text: AlignLeft,
  gallery: Images,
  cards: LayoutGrid,
  split: Columns,
  steps: ListOrdered,
  faq: HelpCircle,
  cta: Megaphone,
};

const DEVICES = {
  desktop: { label: "Escritorio", width: 1280, icon: Monitor },
  tablet: { label: "Tablet", width: 820, icon: Tablet },
  mobile: { label: "Celular", width: 390, icon: Smartphone },
} as const;
type Device = keyof typeof DEVICES;

const GLOBAL = "__global__";

function sectionName(section: LandingSection) {
  const title = section.title.replace(/[*=]/g, "").replace(/\s+/g, " ").trim();
  return title || section.navLabel || SECTION_TYPE_META[section.type].label;
}

/* ───────────── Historial (deshacer / rehacer) ───────────── */

function useHistory(initial: IneditoLandingContent | null) {
  const [present, setPresent] = useState<IneditoLandingContent | null>(initial);
  const past = useRef<IneditoLandingContent[]>([]);
  const future = useRef<IneditoLandingContent[]>([]);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const [, force] = useState(0);

  const commit = useCallback((next: IneditoLandingContent, coalesceKey?: string) => {
    setPresent((prev) => {
      if (!prev) return next;
      const now = Date.now();
      const coalesce = coalesceKey && lastKey.current?.key === coalesceKey && now - lastKey.current.at < 900;
      if (!coalesce) {
        past.current.push(prev);
        if (past.current.length > 80) past.current.shift();
      }
      lastKey.current = coalesceKey ? { key: coalesceKey, at: now } : null;
      future.current = [];
      return next;
    });
    force((n) => n + 1);
  }, []);

  const reset = useCallback((next: IneditoLandingContent) => {
    past.current = [];
    future.current = [];
    lastKey.current = null;
    setPresent(next);
    force((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    setPresent((prev) => {
      const target = past.current.pop();
      if (!target || !prev) return prev;
      future.current.push(prev);
      return target;
    });
    lastKey.current = null;
    force((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    setPresent((prev) => {
      const target = future.current.pop();
      if (!target || !prev) return prev;
      past.current.push(prev);
      return target;
    });
    lastKey.current = null;
    force((n) => n + 1);
  }, []);

  const breakCoalesce = useCallback(() => {
    lastKey.current = null;
  }, []);

  return {
    present,
    commit,
    reset,
    undo,
    redo,
    breakCoalesce,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}

/* ───────────── Vista previa ───────────── */

function PreviewFrame({
  device,
  iframeRef,
}: {
  device: Device;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = device === "desktop" ? 16 : 24;
  const target = DEVICES[device].width;
  const availW = Math.max(0, box.w - pad * 2);
  const availH = Math.max(0, box.h - pad * 2);
  const scale = availW > 0 ? Math.min(1, availW / target) : 1;
  const frameH = availH / scale;

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      {box.w > 0 ? (
        <div
          className={cn(
            "absolute left-1/2 top-1/2 overflow-hidden bg-[#020617] shadow-2xl ring-1 ring-black/10 transition-[width,height] duration-300 dark:ring-white/10",
            device === "desktop" ? "rounded-xl" : "rounded-[1.75rem] ring-4 ring-zinc-800 dark:ring-zinc-700",
          )}
          style={{ width: target * scale, height: availH, transform: "translate(-50%, -50%)" }}
        >
          <iframe
            ref={iframeRef}
            src="/inedito?editor=1"
            title="Vista previa de la landing"
            className="origin-top-left border-0"
            style={{ width: target, height: frameH, transform: `scale(${scale})` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ───────────── Lista de secciones ───────────── */

function SectionRow({
  section,
  index,
  total,
  selected,
  onSelect,
  onToggle,
  onDuplicate,
  onMove,
  onDelete,
  onDragEnd,
}: {
  section: LandingSection;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onMove: (to: number) => void;
  onDelete: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const Icon = TYPE_ICON[section.type];
  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="relative list-none"
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 30px rgba(0,0,0,0.18)", zIndex: 10 }}
    >
      <div
        className={cn(
          "group flex items-center gap-1 rounded-xl border bg-card pr-1 transition-colors",
          selected ? "border-[#5b8fd4] bg-[#5b8fd4]/[0.07] ring-1 ring-[#5b8fd4]/30" : "border-transparent hover:border-border hover:bg-muted/40",
        )}
      >
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="flex h-11 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
          aria-label="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              selected ? "bg-[#5b8fd4] text-white" : "bg-muted text-muted-foreground",
              !section.enabled && "opacity-50",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className={cn("min-w-0", !section.enabled && "opacity-50")}>
            <span className="block truncate text-sm font-medium leading-tight">{sectionName(section)}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {SECTION_TYPE_META[section.type].label}
              {!section.enabled ? " · oculta" : ""}
            </span>
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 shrink-0", section.enabled && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
          onClick={onToggle}
          aria-label={section.enabled ? "Ocultar sección" : "Mostrar sección"}
          title={section.enabled ? "Ocultar" : "Mostrar"}
        >
          {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Más opciones">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(index - 1)}>
              <ChevronUp className="mr-2 h-4 w-4" />
              Subir
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === total - 1} onSelect={() => onMove(index + 1)}>
              <ChevronDown className="mr-2 h-4 w-4" />
              Bajar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggle}>
              {section.enabled ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {section.enabled ? "Ocultar" : "Mostrar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-400 dark:focus:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Reorder.Item>
  );
}

function AddSectionDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: LandingSectionType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar sección</DialogTitle>
          <DialogDescription>Se agrega debajo de la sección seleccionada. Después puedes cambiar textos, imágenes y diseño.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_SECTION_TYPES.map((type) => {
            const meta = SECTION_TYPE_META[type];
            const Icon = TYPE_ICON[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => onAdd(type)}
                className="group flex flex-col items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-[#5b8fd4]/60 hover:shadow-lg hover:shadow-[#5b8fd4]/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1c3d] to-[#0056FF] text-white shadow-md">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-heading text-sm font-semibold">{meta.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{meta.description}</span>
                </span>
                {meta.variants.length > 1 ? (
                  <span className="mt-auto flex flex-wrap gap-1">
                    {meta.variants.map((v) => (
                      <span key={v.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {v.label}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 rounded-lg", active && "bg-background text-foreground shadow-sm dark:bg-white/10")}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/* ───────────── Página ───────────── */

export default function TalentoIneditoLandingPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const settingsQuery = useQuery<LandingSettingsResponse>({
    queryKey: ["/api/talento/inedito/landing"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/inedito/landing", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      return res.json();
    },
  });

  const history = useHistory(null);
  const content = history.present;
  const [baseline, setBaseline] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(GLOBAL);
  const [tab, setTab] = useState<"content" | "design">("content");
  const [device, setDevice] = useState<Device>("desktop");
  const [pane, setPane] = useState<"sections" | "edit" | "preview">("edit");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "discard" | "restore" | { leave: string }>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewReady = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !settingsQuery.data) return;
    initialized.current = true;
    const loaded = normalizeLandingContent(settingsQuery.data.content);
    history.reset(loaded);
    setBaseline(JSON.stringify(loaded));
    setSelected(loaded.sections[0]?.id ?? GLOBAL);
  }, [settingsQuery.data, history]);

  const dirty = !!content && baseline !== null && JSON.stringify(content) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /* Vista previa: enviar borrador y selección al iframe. */
  const post = useCallback((message: Record<string, unknown>) => {
    const win = iframeRef.current?.contentWindow;
    if (win && previewReady.current) win.postMessage(message, window.location.origin);
  }, []);

  const contentRef = useRef(content);
  contentRef.current = content;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; id?: string };
      if (data?.type === LANDING_PREVIEW_MSG.ready) {
        previewReady.current = true;
        if (contentRef.current) post({ type: LANDING_PREVIEW_MSG.content, content: contentRef.current });
        post({ type: LANDING_PREVIEW_MSG.selected, id: selectedRef.current === GLOBAL ? null : selectedRef.current });
      } else if (data?.type === LANDING_PREVIEW_MSG.select && data.id) {
        setSelected(data.id);
        setPane((p) => (p === "preview" ? p : "edit"));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  useEffect(() => {
    if (content) post({ type: LANDING_PREVIEW_MSG.content, content });
  }, [content, post]);

  useEffect(() => {
    post({ type: LANDING_PREVIEW_MSG.selected, id: selected === GLOBAL ? null : selected });
  }, [selected, post]);

  const selectAndScroll = (id: string) => {
    setSelected(id);
    setPane("edit");
    if (id !== GLOBAL) post({ type: LANDING_PREVIEW_MSG.scrollTo, id });
  };

  /* Edición */
  const sections = content?.sections ?? [];
  const current = sections.find((s) => s.id === selected) ?? null;

  const commitSections = (next: LandingSection[], key?: string) => {
    if (!content) return;
    history.commit({ ...content, sections: next }, key);
  };

  const patchSection = (id: string, patch: Partial<LandingSection>) => {
    commitSections(
      sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      `s:${id}:${Object.keys(patch).join(",")}`,
    );
  };

  const patchStyle = (id: string, patch: Partial<LandingSectionStyle>) => {
    commitSections(
      sections.map((s) => (s.id === id ? { ...s, style: { ...s.style, ...patch } } : s)),
      `st:${id}:${Object.keys(patch).join(",")}`,
    );
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = sections.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    commitSections(next);
  };

  const addSection = (type: LandingSectionType) => {
    const created = createLandingSection(type);
    const at = sections.findIndex((s) => s.id === selected);
    const next = sections.slice();
    next.splice(at >= 0 ? at + 1 : next.length, 0, created);
    commitSections(next);
    setAddOpen(false);
    setTab("content");
    setSelected(created.id);
    setPane("edit");
    window.setTimeout(() => post({ type: LANDING_PREVIEW_MSG.scrollTo, id: created.id }), 120);
    toast({ title: `${SECTION_TYPE_META[type].label} agregada`, description: "Edita su contenido en el panel derecho." });
  };

  const duplicateSection = (id: string) => {
    const at = sections.findIndex((s) => s.id === id);
    if (at < 0) return;
    const copy = duplicateLandingSection(sections[at]!);
    const next = sections.slice();
    next.splice(at + 1, 0, copy);
    commitSections(next);
    setSelected(copy.id);
    window.setTimeout(() => post({ type: LANDING_PREVIEW_MSG.scrollTo, id: copy.id }), 120);
  };

  const deleteSection = (id: string) => {
    const at = sections.findIndex((s) => s.id === id);
    const next = sections.filter((s) => s.id !== id);
    commitSections(next);
    if (selected === id) setSelected(next[Math.min(at, next.length - 1)]?.id ?? GLOBAL);
    toast({ title: "Sección eliminada", description: "Puedes deshacerlo con el botón ↶ o Ctrl+Z." });
  };

  /* Guardado */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/talento/inedito/landing", { content });
      return res.json() as Promise<LandingSettingsResponse>;
    },
    onSuccess: (data) => {
      const saved = normalizeLandingContent(data.content);
      setBaseline(JSON.stringify(saved));
      if (JSON.stringify(saved) !== JSON.stringify(content)) history.commit(saved);
      queryClient.setQueryData(["/api/talento/inedito/landing"], data);
      queryClient.setQueryData(["/api/inedito/landing"], { isEnabled: data.isEnabled, content: data.content });
      toast({ title: "Landing guardada", description: data.isEnabled ? "Los cambios ya están en /inedito." : "Los cambios se verán cuando actives la landing." });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/talento/inedito/landing", { isEnabled });
      return res.json() as Promise<LandingSettingsResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<LandingSettingsResponse>(["/api/talento/inedito/landing"], (prev) =>
        prev ? { ...prev, isEnabled: data.isEnabled } : data,
      );
      queryClient.setQueryData(["/api/inedito/landing"], (prev: { content?: unknown } | undefined) => ({
        ...(prev ?? {}),
        isEnabled: data.isEnabled,
      }));
      toast({
        title: data.isEnabled ? "Landing activada" : "Landing desactivada",
        description: data.isEnabled ? "Cualquier persona puede ver /inedito." : "Solo cuentas Admin y Talento pueden ver /inedito.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  /* Atajos de teclado */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        if (dirty && !saveMutation.isPending) saveMutation.mutate();
        return;
      }
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return;
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        history.undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        history.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saveMutation, history]);

  const requestLeave = (href: string) => {
    if (dirty) setConfirm({ leave: href });
    else navigate(href);
  };

  const stats = useMemo(() => {
    const visible = sections.filter((s) => s.enabled).length;
    return { visible, hidden: sections.length - visible };
  }, [sections]);

  if (isLoading || !user || user.role !== "talento" || !content) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const isEnabled = settingsQuery.data?.isEnabled ?? true;
  const customized = settingsQuery.data?.customized ?? false;

  const sectionList = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Secciones</p>
          <p className="text-[11px] text-muted-foreground">
            {stats.visible} visibles{stats.hidden ? ` · ${stats.hidden} ocultas` : ""}
          </p>
        </div>
        <Button type="button" size="sm" className="h-8 rounded-lg bg-[#5b8fd4] px-2.5 text-white hover:bg-[#4a7fc4]" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>
      <div className="wca-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <button
          type="button"
          onClick={() => {
            setSelected(GLOBAL);
            setPane("edit");
          }}
          className={cn(
            "mb-2 flex w-full items-center gap-2.5 rounded-xl border px-2 py-2 text-left transition-colors",
            selected === GLOBAL ? "border-[#5b8fd4] bg-[#5b8fd4]/[0.07] ring-1 ring-[#5b8fd4]/30" : "border-dashed hover:bg-muted/40",
          )}
        >
          <span className={cn("ml-6 flex h-8 w-8 items-center justify-center rounded-lg", selected === GLOBAL ? "bg-[#5b8fd4] text-white" : "bg-muted text-muted-foreground")}>
            <Settings2 className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-tight">Ajustes generales</span>
            <span className="block text-[11px] text-muted-foreground">Colores, letras, menú, pie, SEO</span>
          </span>
        </button>
        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            La landing no tiene secciones.
            <Button type="button" variant="link" className="block w-full" onClick={() => setAddOpen(true)}>
              Agregar la primera
            </Button>
          </div>
        ) : (
          <Reorder.Group axis="y" values={sections} onReorder={(next) => commitSections(next, "reorder")} className="space-y-1">
            {sections.map((section, i) => (
              <SectionRow
                key={section.id}
                section={section}
                index={i}
                total={sections.length}
                selected={selected === section.id}
                onSelect={() => selectAndScroll(section.id)}
                onToggle={() => patchSection(section.id, { enabled: !section.enabled })}
                onDuplicate={() => duplicateSection(section.id)}
                onMove={(to) => moveSection(i, to)}
                onDelete={() => setDeleteId(section.id)}
                onDragEnd={history.breakCoalesce}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );

  const inspector = (
    <div className="flex h-full min-h-0 flex-col">
      {selected === GLOBAL || !current ? (
        <>
          <div className="flex items-center gap-3 px-5 pb-3 pt-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1c3d] to-[#0056FF] text-white">
              <Settings2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-heading text-base font-semibold leading-tight">Ajustes generales</h2>
              <p className="text-xs text-muted-foreground">Aplican a toda la landing.</p>
            </div>
          </div>
          <AdminPanelBody contentKey="global">
            <GlobalSettingsEditor content={content} onChange={(next) => history.commit(next, "global")} />
          </AdminPanelBody>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 px-5 pb-3 pt-4">
            {(() => {
              const Icon = TYPE_ICON[current.type];
              return (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1c3d] to-[#0056FF] text-white">
                  <Icon className="h-4 w-4" />
                </span>
              );
            })()}
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-heading text-base font-semibold leading-tight">{sectionName(current)}</h2>
              <p className="truncate text-xs text-muted-foreground">{SECTION_TYPE_META[current.type].label}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {current.enabled ? "Visible" : "Oculta"}
              <Switch checked={current.enabled} onCheckedChange={(enabled) => patchSection(current.id, { enabled })} aria-label="Visible" />
            </label>
          </div>
          {!current.enabled ? (
            <div className="mx-5 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Esta sección está oculta: no aparece en la landing ni en la vista previa.
            </div>
          ) : null}
          <AdminPanelTabs
            layoutId="inedito-inspector-tab"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "content", label: "Contenido" },
              { id: "design", label: "Diseño" },
            ]}
          />
          <AdminPanelBody contentKey={`${current.id}:${tab}`}>
            {tab === "content" ? (
              <SectionContentEditor
                section={current}
                patch={(p) => patchSection(current.id, p)}
                patchStyle={(p) => patchStyle(current.id, p)}
              />
            ) : (
              <SectionDesignEditor
                section={current}
                patch={(p) => patchSection(current.id, p)}
                patchStyle={(p) => patchStyle(current.id, p)}
              />
            )}
          </AdminPanelBody>
        </>
      )}
    </div>
  );

  const preview = (
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.18)_1px,transparent_0)] [background-size:18px_18px]">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MousePointerClick className="h-3.5 w-3.5" />
          Haz clic en una sección para editarla
        </p>
        <div className="flex items-center gap-0.5 rounded-xl bg-muted/70 p-1">
          {(Object.keys(DEVICES) as Device[]).map((d) => {
            const Icon = DEVICES[d].icon;
            return (
              <ToolbarIconButton key={d} label={DEVICES[d].label} onClick={() => setDevice(d)} active={device === d}>
                <Icon className="h-4 w-4" />
              </ToolbarIconButton>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <PreviewFrame device={device} iframeRef={iframeRef} />
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Helmet>
        <title>Editor de landing INÉDITO | Talento y Bienestar</title>
      </Helmet>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        <Navbar />
        <div className="h-[4.5rem] shrink-0" />

        {/* Barra superior */}
        <header className="shrink-0 border-b bg-card/60 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={() => requestLeave("/talento/inedito")} aria-label="Volver">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  <button type="button" className="hover:text-foreground" onClick={() => requestLeave("/talento")}>
                    Talento
                  </button>
                  {" › "}
                  <button type="button" className="hover:text-foreground" onClick={() => requestLeave("/talento/inedito")}>
                    INÉDITO
                  </button>
                  {" › "}Landing
                </p>
                <h1 className="flex items-center gap-2 truncate font-heading text-lg font-bold leading-tight sm:text-xl">
                  Editor de landing
                  {dirty ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Sin guardar
                    </span>
                  ) : customized ? null : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Diseño original</span>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  "flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium",
                  isEnabled ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                )}
              >
                {visibilityMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {isEnabled ? "Pública" : "Desactivada"}
                <Switch
                  checked={isEnabled}
                  disabled={visibilityMutation.isPending}
                  onCheckedChange={(checked) => visibilityMutation.mutate(checked)}
                  aria-label="Landing pública"
                />
              </label>

              <div className="flex items-center gap-0.5 rounded-xl bg-muted/70 p-1">
                <ToolbarIconButton label="Deshacer (Ctrl+Z)" onClick={history.undo} disabled={!history.canUndo}>
                  <Undo2 className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label="Rehacer (Ctrl+Y)" onClick={history.redo} disabled={!history.canRedo}>
                  <Redo2 className="h-4 w-4" />
                </ToolbarIconButton>
              </div>

              <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
                <a href="/inedito" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Ver landing
                </a>
              </Button>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" aria-label="Más opciones">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem disabled={!dirty} onSelect={() => setConfirm("discard")}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    Descartar cambios sin guardar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setConfirm("restore")}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Cargar el diseño original
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                className={cn(
                  "h-9 rounded-xl px-4",
                  dirty ? "bg-[#5b8fd4] text-white shadow-lg shadow-[#5b8fd4]/25 hover:bg-[#4a7fc4]" : "bg-muted text-muted-foreground hover:bg-muted",
                )}
                onClick={() => saveMutation.mutate()}
                disabled={!dirty || saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                {saveMutation.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>

          {/* Pestañas en pantallas chicas */}
          <div className="mt-3 flex gap-1 rounded-xl bg-muted/60 p-1 text-sm lg:hidden">
            {(
              [
                { id: "sections", label: "Secciones" },
                { id: "edit", label: "Editar" },
                { id: "preview", label: "Vista previa" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPane(t.id)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 font-medium transition-colors",
                  pane === t.id ? "bg-background text-foreground shadow-sm dark:bg-white/10" : "text-muted-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)_23rem] 2xl:grid-cols-[18rem_minmax(0,1fr)_27rem]">
          <aside className={cn("h-full min-h-0 border-r bg-card/40", pane === "sections" ? "block" : "hidden", "lg:block")}>{sectionList}</aside>
          <section className={cn("h-full min-h-0", pane === "preview" ? "block" : "hidden", "lg:block")}>{preview}</section>
          <aside className={cn("h-full min-h-0 border-l bg-card", pane === "edit" ? "block" : "hidden", "lg:block")}>{inspector}</aside>
        </div>
      </div>

      <AddSectionDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addSection} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="¿Eliminar esta sección?"
        description={
          deleteId ? (
            <>
              Se quitará <strong>{sectionName(sections.find((s) => s.id === deleteId) ?? sections[0]!)}</strong> de la landing. Puedes deshacerlo antes de
              guardar. Si solo quieres esconderla un tiempo, mejor ocúltala.
            </>
          ) : null
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (deleteId) deleteSection(deleteId);
          setDeleteId(null);
        }}
      />

      <ConfirmDialog
        open={confirm === "discard"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="¿Descartar los cambios?"
        description="Volverás a la última versión guardada. Lo que no hayas guardado se perderá."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          if (baseline) {
            const restored = JSON.parse(baseline) as IneditoLandingContent;
            history.commit(restored);
            if (!restored.sections.some((s) => s.id === selected)) setSelected(restored.sections[0]?.id ?? GLOBAL);
          }
          setConfirm(null);
        }}
      />

      <ConfirmDialog
        open={confirm === "restore"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="¿Cargar el diseño original?"
        description="El editor se llenará con la landing original de INÉDITO (textos, imágenes y secciones). No se guarda hasta que pulses Guardar, y puedes deshacerlo con Ctrl+Z."
        confirmLabel="Cargar original"
        onConfirm={() => {
          const original = cloneLandingContent(DEFAULT_LANDING_CONTENT);
          history.commit(original);
          setSelected(original.sections[0]?.id ?? GLOBAL);
          setConfirm(null);
          toast({ title: "Diseño original cargado", description: "Revisa la vista previa y pulsa Guardar para aplicarlo." });
        }}
      />

      <ConfirmDialog
        open={typeof confirm === "object" && confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Tienes cambios sin guardar"
        description="Si sales ahora se perderán. ¿Quieres salir de todos modos?"
        confirmLabel="Salir sin guardar"
        destructive
        onConfirm={() => {
          const target = typeof confirm === "object" && confirm ? confirm.leave : null;
          setConfirm(null);
          setBaseline(JSON.stringify(content));
          if (target) window.setTimeout(() => navigate(target), 0);
        }}
      />
    </TooltipProvider>
  );
}
