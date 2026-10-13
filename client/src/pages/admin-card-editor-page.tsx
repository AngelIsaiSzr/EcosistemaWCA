import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PresentationCard } from "@shared/schema";
import {
  DEFAULT_CARD_THEME,
  normalizeCardSlug,
  resolveCardDirectionColor,
  type PresentationCardTheme,
} from "@shared/card-directions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { CARD_SOCIALS, CardPreview, type CardPreviewArea } from "@/components/cards/card-preview";
import { CardPhoneCanvas } from "@/components/cards/card-phone-canvas";
import {
  AppearancePanel,
  LinksPanel,
  ProfilePanel,
  PublishPanel,
  SocialsPanel,
  type CardEditorSection,
  type CardEditorState,
  type UserBasic,
} from "@/components/cards/card-editor-panels";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Globe,
  Link2,
  Loader2,
  Palette,
  Save,
  Share2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function cardToState(card: PresentationCard): CardEditorState {
  return {
    name: card.name ?? "",
    roleTitle: card.roleTitle ?? "",
    bio: card.bio ?? "",
    image: card.image ?? "",
    slug: card.slug ?? "",
    direction: card.direction ?? "direccion-sede",
    theme: { ...DEFAULT_CARD_THEME, ...(card.theme ?? {}) },
    linkedIn: card.linkedIn ?? "",
    instagram: card.instagram ?? "",
    twitter: card.twitter ?? "",
    github: card.github ?? "",
    youtube: card.youtube ?? "",
    tiktok: card.tiktok ?? "",
    whatsapp: card.whatsapp ?? "",
    email: card.email ?? "",
    website: card.website ?? "",
    links: Array.isArray(card.links) ? [...card.links].sort((a, b) => a.order - b.order) : [],
    assignedUserId: card.assignedUserId ?? null,
    isPublished: !!card.isPublished,
  };
}

/** Ordena claves y descarta vacíos para comparar estados sin falsos positivos. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
        .sort()
        .map((k) => [k, canonical(obj[k])]),
    );
  }
  return value;
}

/** Huella del estado según cómo se ve la tarjeta (valores por defecto resueltos). */
function editorStateKey(state: CardEditorState): string {
  const t = state.theme;
  const socialDefault = t.socialDisplayDefault ?? "circle";
  const theme = {
    ...DEFAULT_CARD_THEME,
    ...t,
    sedeAccent: t.sedeAccent === "purple" ? "purple" : undefined,
    socialDisplayDefault: socialDefault,
    socialDisplay: Object.fromEntries(
      CARD_SOCIALS.map((s) => [s.key, t.socialDisplay?.[s.key] ?? socialDefault]),
    ),
  };
  return JSON.stringify(
    canonical({
      ...state,
      slug: normalizeCardSlug(state.slug) || state.slug,
      theme,
      links: state.links.map((l, i) => ({ ...l, order: i + 1 })),
    }),
  );
}

const SECTIONS: { id: CardEditorSection; label: string; icon: LucideIcon }[] = [
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "apariencia", label: "Diseño", icon: Palette },
  { id: "redes", label: "Redes", icon: Share2 },
  { id: "enlaces", label: "Enlaces", icon: Link2 },
  { id: "publicacion", label: "Publicar", icon: Globe },
];

function RailTab({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
  horizontal,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick: () => void;
  horizontal?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex shrink-0 items-center rounded-xl font-medium transition",
        horizontal ? "gap-1.5 px-3 py-2 text-xs" : "w-[60px] flex-col gap-1 px-1 py-2 text-[10px]",
        active
          ? "bg-[#5b8fd4]/20 text-[#5b8fd4]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={horizontal ? "h-4 w-4" : "h-5 w-5"} />
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5b8fd4] px-1 text-[9px] text-white",
            !horizontal && "absolute right-1 top-1",
          )}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export function PresentationCardEditor({
  cardId,
  mode,
  embedded = false,
}: {
  cardId?: number;
  mode: "admin" | "owner";
  embedded?: boolean;
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [state, setState] = useState<CardEditorState | null>(null);
  /** Huella de lo guardado; "Sin guardar" solo si el estado actual difiere. */
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const dirty = useMemo(
    () => state !== null && savedKey !== null && editorStateKey(state) !== savedKey,
    [state, savedKey],
  );
  const [section, setSection] = useState<CardEditorSection>("perfil");
  /** Solo en pantallas angostas: alterna entre panel y vista previa. */
  const [showPreview, setShowPreview] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const cardQuery = useQuery<PresentationCard>({
    queryKey: cardId ? ["/api/cards", cardId] : ["/api/cards/mine"],
    queryFn: async () => {
      const url = cardId ? `/api/cards/${cardId}` : "/api/cards/mine";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo cargar la tarjeta");
      }
      return res.json();
    },
  });

  const usersQuery = useQuery<UserBasic[]>({
    queryKey: ["/api/users/list-basic"],
    enabled: mode === "admin",
  });

  useEffect(() => {
    if (cardQuery.data && !dirty) {
      const next = cardToState(cardQuery.data);
      setState(next);
      setSavedKey(editorStateKey(next));
    }
  }, [cardQuery.data, dirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const updateField = <K extends keyof CardEditorState>(key: K, value: CardEditorState[K]) => {
    setState((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setTheme = (patch: Partial<PresentationCardTheme>) => {
    setState((prev) => (prev ? { ...prev, theme: { ...prev.theme, ...patch } } : prev));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!state || !cardQuery.data) throw new Error("Sin datos");
      const payload: Record<string, unknown> = {
        name: state.name,
        roleTitle: state.roleTitle,
        bio: state.bio,
        image: state.image,
        direction: state.direction,
        theme: state.theme,
        linkedIn: state.linkedIn || null,
        instagram: state.instagram || null,
        twitter: state.twitter || null,
        github: state.github || null,
        youtube: state.youtube || null,
        tiktok: state.tiktok || null,
        whatsapp: state.whatsapp || null,
        email: state.email || null,
        website: state.website || null,
        links: state.links.map((l, i) => ({ ...l, order: i + 1 })),
        isPublished: state.isPublished,
      };
      if (mode === "admin") {
        payload.slug = normalizeCardSlug(state.slug) || state.slug;
        payload.assignedUserId = state.assignedUserId;
      }
      const res = await apiRequest("PATCH", `/api/cards/${cardQuery.data.id}`, payload);
      return res.json() as Promise<PresentationCard>;
    },
    onSuccess: (updated) => {
      const next = cardToState(updated);
      setState(next);
      setSavedKey(editorStateKey(next));
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards", updated.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards/mine"] });
      toast({ title: "Guardado", description: "La tarjeta se actualizó correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    },
  });

  const requestLeave = (href: string) => {
    if (!dirty) {
      navigate(href);
      return;
    }
    setPendingHref(href);
    setLeaveOpen(true);
  };

  const openSection = (next: CardEditorSection) => {
    setSection(next);
    setShowPreview(false);
  };

  if (cardQuery.isLoading || (!state && !cardQuery.isError)) {
    return (
      <div className={cn("flex items-center justify-center", embedded ? "min-h-[320px]" : "min-h-screen")}>
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (cardQuery.isError || !state) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24 text-center">
          <h1 className="font-heading text-2xl font-bold">No disponible</h1>
          <p className="mt-2 text-muted-foreground">
            {(cardQuery.error as Error | null)?.message || "No se encontró la tarjeta."}
          </p>
          <Button className="mt-6" variant="outline" onClick={() => navigate(mode === "admin" ? "/talento/tarjetas" : "/")}>
            Volver
          </Button>
        </main>
      </div>
    );
  }

  const isAdmin = mode === "admin";
  const accent = state.theme.accentColor || resolveCardDirectionColor(state.direction, state.theme);
  const previewCard = { ...state, theme: state.theme, links: state.links };
  const badges: Partial<Record<CardEditorSection, number>> = {
    redes: CARD_SOCIALS.filter((s) => state[s.key].trim()).length,
    enlaces: state.links.length,
  };
  const previewArea: CardPreviewArea | null = section === "publicacion" ? null : section;

  /* En modo embebido el contenedor es más angosto: se pasa a 3 columnas hasta 2xl. */
  const wide = embedded
    ? { show: "2xl:flex", hide: "2xl:hidden", row: "2xl:flex-row", panelWidth: "flex-1 2xl:w-[380px] 2xl:flex-none 2xl:border-r" }
    : { show: "lg:flex", hide: "lg:hidden", row: "lg:flex-row", panelWidth: "flex-1 lg:w-[400px] lg:flex-none lg:border-r xl:w-[440px]" };

  return (
    <>
      {!embedded && (
        <Helmet>
          <title>
            {isAdmin ? `Editar · ${state.name}` : "Mi tarjeta"} | Ecosistema WCA
          </title>
        </Helmet>
      )}
      <div className={cn(!embedded ? "flex h-[100dvh] flex-col overflow-hidden bg-background" : "space-y-4")}>
        {!embedded && <Navbar />}
        {!embedded && <div className="h-[4.5rem] shrink-0" />}
        <div className={cn(!embedded ? "flex min-h-0 flex-1 flex-col" : "space-y-5")}>
          <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", !embedded && "shrink-0 border-b bg-card/60 px-4 py-3 backdrop-blur")}>
            <div>
              {!embedded && (
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? (
                    <>
                      <button type="button" className="hover:text-foreground" onClick={() => requestLeave("/talento")}>
                        Inicio
                      </button>
                      {" › "}
                      <button type="button" className="hover:text-foreground" onClick={() => requestLeave("/talento/tarjetas")}>
                        Tarjetas
                      </button>
                      {" › "}
                      Editar
                    </>
                  ) : (
                    "Mi tarjeta digital"
                  )}
                </p>
              )}
              <h1
                className={cn(
                  "flex flex-wrap items-center gap-2 font-heading font-bold",
                  embedded ? "text-xl md:text-2xl" : "mt-1 text-3xl md:text-4xl",
                )}
              >
                {isAdmin ? "Editar tarjeta" : "Mi tarjeta"}
                {dirty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Sin guardar
                  </span>
                ) : null}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                URL pública:{" "}
                <span className="font-medium text-foreground">
                  ecosistemawca.com/{normalizeCardSlug(state.slug) || state.slug}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openSection("publicacion")}
                title="Estado de publicación"
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition hover:bg-muted",
                  state.isPublished
                    ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn("h-2 w-2 rounded-full", state.isPublished ? "bg-emerald-500" : "bg-muted-foreground/50")}
                />
                {state.isPublished ? "Publicada" : "Borrador"}
              </button>
              {state.isPublished ? (
                <Button variant="outline" className="h-10 rounded-xl" asChild>
                  <a href={`/${state.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver pública
                  </a>
                </Button>
              ) : null}
              {isAdmin && !embedded ? (
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => requestLeave("/talento/tarjetas")}>
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
              ) : null}
              <Button
                className={cn(
                  "h-10 rounded-xl",
                  dirty
                    ? "bg-[#5b8fd4] text-white shadow-lg shadow-[#5b8fd4]/25 hover:bg-[#4a7fc4]"
                    : "bg-muted text-muted-foreground hover:bg-muted",
                )}
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !dirty}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saveMutation.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>

          {/* Estudio: rail · panel · lienzo (mismo patrón que el editor de formularios) */}
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-card",
              embedded ? "h-[min(82vh,880px)] min-h-[600px] rounded-2xl border" : "flex-1",
              wide.row,
            )}
          >
            {/* Pestañas horizontales en pantallas angostas */}
            <nav className={cn("flex shrink-0 gap-1 overflow-x-auto border-b bg-muted/30 p-2", wide.hide)}>
              {SECTIONS.map((s) => (
                <RailTab
                  key={s.id}
                  horizontal
                  active={!showPreview && section === s.id}
                  icon={s.icon}
                  label={s.label}
                  badge={badges[s.id]}
                  onClick={() => openSection(s.id)}
                />
              ))}
              <RailTab
                horizontal
                active={showPreview}
                icon={Eye}
                label="Vista previa"
                onClick={() => setShowPreview(true)}
              />
            </nav>

            {/* Rail vertical */}
            <nav className={cn("hidden w-[72px] shrink-0 flex-col items-center gap-1 border-r bg-muted/30 py-3", wide.show)}>
              {SECTIONS.map((s) => (
                <RailTab
                  key={s.id}
                  active={section === s.id}
                  icon={s.icon}
                  label={s.label}
                  badge={badges[s.id]}
                  onClick={() => openSection(s.id)}
                />
              ))}
            </nav>

            {/* Panel de la sección */}
            <aside
              className={cn(
                "min-h-0 w-full shrink-0 flex-col overflow-y-auto",
                wide.panelWidth,
                showPreview ? "hidden" : "flex",
                wide.show,
              )}
            >
              <div className="p-4 sm:p-5">
                {section === "perfil" && <ProfilePanel state={state} update={updateField} accent={accent} />}
                {section === "apariencia" && (
                  <AppearancePanel
                    state={state}
                    update={updateField}
                    setTheme={setTheme}
                    accent={accent}
                    canChangeDirection={isAdmin}
                  />
                )}
                {section === "redes" && <SocialsPanel state={state} update={updateField} setTheme={setTheme} />}
                {section === "enlaces" && <LinksPanel state={state} update={updateField} />}
                {section === "publicacion" && (
                  <PublishPanel
                    state={state}
                    update={updateField}
                    isAdmin={isAdmin}
                    users={usersQuery.data ?? []}
                  />
                )}
              </div>
            </aside>

            {/* Lienzo con paneo y zoom: teléfono a tamaño real */}
            <CardPhoneCanvas className={cn(showPreview ? "block" : "hidden", wide.show)}>
              {(safeArea) => (
                <CardPreview
                  card={previewCard}
                  compact
                  className={cn("min-h-full rounded-none", safeArea)}
                  editable={{ active: previewArea, onSelect: openSection }}
                />
              )}
            </CardPhoneCanvas>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Tienes cambios sin guardar"
        description="Si sales ahora se perderán. ¿Quieres salir de todos modos?"
        confirmLabel="Salir sin guardar"
        destructive
        onConfirm={() => {
          const href = pendingHref;
          setLeaveOpen(false);
          setPendingHref(null);
          if (href) navigate(href);
        }}
      />
    </>
  );
}

export default function AdminCardEditorPage({
  params,
}: {
  params?: Record<string | number, string | undefined>;
}) {
  const id = parseInt(params?.id || "", 10);
  if (Number.isNaN(id)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner text="Tarjeta inválida..." />
      </div>
    );
  }
  return <PresentationCardEditor cardId={id} mode="admin" />;
}
