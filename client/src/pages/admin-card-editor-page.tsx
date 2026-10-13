import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PresentationCard } from "@shared/schema";
import {
  CARD_BACKGROUND_OPTIONS,
  CARD_DIRECTIONS,
  DEFAULT_CARD_THEME,
  cssColorToHexInput,
  normalizeCardSlug,
  resolveCardDirectionColor,
  type CardSocialKey,
  type PresentationCardLink,
  type PresentationCardTheme,
} from "@shared/card-directions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { CardPreview } from "@/components/cards/card-preview";
import { FaIconPicker } from "@/components/cards/fa-icon-picker";
import { ImageUrlInput } from "@/components/media/image-url-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Search,
  Share2,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AutoTextarea } from "@/components/ui/auto-textarea";

function EditorSection({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 overflow-visible rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1c3d] to-[#0056FF] text-white shadow-md shadow-[#0056FF]/20">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="font-heading text-lg font-semibold leading-tight">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type UserBasic = { id: number; name: string; email: string };

type EditorState = {
  name: string;
  roleTitle: string;
  bio: string;
  image: string;
  slug: string;
  direction: string;
  theme: PresentationCardTheme;
  linkedIn: string;
  instagram: string;
  twitter: string;
  github: string;
  youtube: string;
  tiktok: string;
  whatsapp: string;
  email: string;
  website: string;
  links: PresentationCardLink[];
  assignedUserId: number | null;
  isPublished: boolean;
};

function cardToState(card: PresentationCard): EditorState {
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
  const [state, setState] = useState<EditorState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const userPickerRef = useRef<HTMLDivElement>(null);

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
      setState(cardToState(cardQuery.data));
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

  useEffect(() => {
    if (!userPickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!userPickerRef.current?.contains(event.target as Node)) {
        setUserPickerOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userPickerOpen]);

  const updateField = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setDirty(true);
    setState((prev) => (prev ? { ...prev, [key]: value } : prev));
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
      setDirty(false);
      setState(cardToState(updated));
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

  const addLink = () => {
    if (!state) return;
    const link: PresentationCardLink = {
      id: `link-${Date.now()}`,
      title: "Nuevo enlace",
      url: "https://",
      style: "solid",
      order: state.links.length + 1,
      enabled: true,
    };
    updateField("links", [...state.links, link]);
  };

  const moveLink = (index: number, dir: -1 | 1) => {
    if (!state) return;
    const next = [...state.links];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateField(
      "links",
      next.map((l, i) => ({ ...l, order: i + 1 })),
    );
  };

  if (cardQuery.isLoading || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando tarjeta..." />
      </div>
    );
  }

  if (cardQuery.isError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24 text-center">
          <h1 className="font-heading text-2xl font-bold">No disponible</h1>
          <p className="mt-2 text-muted-foreground">
            {(cardQuery.error as Error).message || "No se encontró la tarjeta."}
          </p>
          <Button className="mt-6" variant="outline" onClick={() => navigate(mode === "admin" ? "/talento/tarjetas" : "/")}>
            Volver
          </Button>
        </main>
      </div>
    );
  }

  const previewCard = {
    ...state,
    theme: state.theme,
    links: state.links,
  };
  const usersList = usersQuery.data ?? [];
  const assignedUser = usersList.find((u) => u.id === state.assignedUserId);
  const userQuery = userSearch.trim().toLowerCase();
  const filteredUsers = !userQuery
    ? usersList
    : usersList.filter(
        (u) =>
          u.name.toLowerCase().includes(userQuery) ||
          u.email.toLowerCase().includes(userQuery),
      );

  return (
    <>
      {!embedded && (
        <Helmet>
          <title>
            {mode === "admin" ? `Editar · ${state.name}` : "Mi tarjeta"} | Ecosistema WCA
          </title>
        </Helmet>
      )}
      <div className={cn(!embedded && "min-h-screen bg-background")}>
        {!embedded && <Navbar />}
        <div className={cn(!embedded ? "container mx-auto px-4 pb-16 pt-24" : "space-y-4")}>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {!embedded && (
                <p className="text-sm text-muted-foreground">
                  {mode === "admin" ? (
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
                {mode === "admin" ? "Editar tarjeta" : "Mi tarjeta"}
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
            <div className="flex flex-wrap gap-2">
              {state.isPublished ? (
                <Button variant="outline" className="h-10 rounded-xl" asChild>
                  <a href={`/${state.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver pública
                  </a>
                </Button>
              ) : null}
              {mode === "admin" && !embedded ? (
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

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6 overflow-visible">
              <EditorSection title="Perfil" icon={UserRound}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={state.name} onChange={(e) => updateField("name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo / puesto</Label>
                    <Input
                      value={state.roleTitle}
                      onChange={(e) => updateField("roleTitle", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Biografía</Label>
                  <AutoTextarea
                    value={state.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    maxHeight={220}
                    placeholder="Una o dos frases sobre ti."
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL de foto</Label>
                  <ImageUrlInput
                    value={state.image}
                    onChange={(v) => updateField("image", v)}
                    placeholder="https://..."
                  />
                </div>
                {mode === "admin" && (
                  <div className="space-y-2">
                    <Label>Slug (URL)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/</span>
                      <Input
                        value={state.slug}
                        onChange={(e) => updateField("slug", e.target.value)}
                        onBlur={() => updateField("slug", normalizeCardSlug(state.slug))}
                      />
                    </div>
                  </div>
                )}
              </EditorSection>

              <EditorSection title="Dirección y tema" icon={Palette}>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Select
                    value={state.direction}
                    onValueChange={(v) => updateField("direction", v)}
                    disabled={mode === "owner"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_DIRECTIONS.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {state.direction === "direccion-sede" && (
                  <div className="space-y-2">
                    <Label>Acento de sede</Label>
                    <Select
                      value={state.theme.sedeAccent || "blue-strong"}
                      onValueChange={(v) =>
                        updateField("theme", {
                          ...state.theme,
                          sedeAccent: v as "blue-strong" | "purple",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue-strong">Azul fuerte (Director)</SelectItem>
                        <SelectItem value="purple">Morado (Subdirección)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fondo</Label>
                    <Select
                      value={state.theme.backgroundStyle || "gradient"}
                      onValueChange={(v) =>
                        updateField("theme", {
                          ...state.theme,
                          backgroundStyle: v as PresentationCardTheme["backgroundStyle"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_BACKGROUND_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {
                        CARD_BACKGROUND_OPTIONS.find(
                          (o) => o.id === (state.theme.backgroundStyle || "gradient"),
                        )?.hint
                      }
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Estilo de botones</Label>
                    <Select
                      value={state.theme.buttonStyle || "rounded"}
                      onValueChange={(v) =>
                        updateField("theme", {
                          ...state.theme,
                          buttonStyle: v as PresentationCardTheme["buttonStyle"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">Redondeado</SelectItem>
                        <SelectItem value="pill">Píldora</SelectItem>
                        <SelectItem value="square">Cuadrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(state.theme.backgroundStyle === "solid" ||
                  state.theme.backgroundStyle === "carbon") && (
                  <div className="space-y-2">
                    <Label>
                      {state.theme.backgroundStyle === "carbon"
                        ? "Color base (carbono)"
                        : "Color sólido del fondo"}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Color de fondo"
                        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                        value={cssColorToHexInput(
                          state.theme.backgroundColor,
                          "#0b1220",
                        )}
                        onChange={(e) =>
                          updateField("theme", {
                            ...state.theme,
                            backgroundColor: e.target.value,
                          })
                        }
                      />
                      <Input
                        className="min-w-0 flex-1"
                        value={state.theme.backgroundColor || "#0b1220"}
                        onChange={(e) =>
                          updateField("theme", {
                            ...state.theme,
                            backgroundColor: e.target.value || undefined,
                          })
                        }
                        placeholder="#0b1220, hsl(...), rgb(...)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Restaurar color de fondo"
                        onClick={() =>
                          updateField("theme", {
                            ...state.theme,
                            backgroundColor: "#0b1220",
                          })
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {state.theme.backgroundStyle === "image" && (
                  <div className="space-y-3 rounded-xl border p-3">
                    <div className="space-y-2">
                      <Label>URL de imagen de fondo</Label>
                      <ImageUrlInput
                        value={state.theme.backgroundImage || ""}
                        onChange={(v) =>
                          updateField("theme", {
                            ...state.theme,
                            backgroundImage: v || undefined,
                          })
                        }
                        placeholder="https://... o /media/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>O subir imagen</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2.5 * 1024 * 1024) {
                            toast({
                              title: "Imagen muy pesada",
                              description: "Máximo aprox. 2.5 MB para guardarla en la tarjeta.",
                              variant: "destructive",
                            });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            updateField("theme", {
                              ...state.theme,
                              backgroundImage: String(reader.result || ""),
                            });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Oscurecimiento ({state.theme.backgroundOverlay ?? 55}%)
                      </Label>
                      <Slider
                        min={0}
                        max={90}
                        step={1}
                        value={[state.theme.backgroundOverlay ?? 55]}
                        onValueChange={([value]) =>
                          updateField("theme", {
                            ...state.theme,
                            backgroundOverlay: value ?? 55,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Más oscuro = mejor contraste del texto sobre la foto.
                      </p>
                    </div>
                    {state.theme.backgroundImage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() =>
                          updateField("theme", {
                            ...state.theme,
                            backgroundImage: undefined,
                          })
                        }
                      >
                        Quitar imagen de fondo
                      </Button>
                    ) : null}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Color de acento personalizado</Label>
                    {state.theme.accentColor ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-muted-foreground"
                        onClick={() => {
                          const next = { ...state.theme };
                          delete next.accentColor;
                          updateField("theme", next);
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restaurar
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Color de acento"
                      className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                      value={cssColorToHexInput(
                        state.theme.accentColor ||
                          resolveCardDirectionColor(state.direction, state.theme),
                        "#5b8fd4",
                      )}
                      onChange={(e) =>
                        updateField("theme", {
                          ...state.theme,
                          accentColor: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="min-w-0 flex-1"
                      value={state.theme.accentColor || ""}
                      onChange={(e) =>
                        updateField("theme", {
                          ...state.theme,
                          accentColor: e.target.value.trim() || undefined,
                        })
                      }
                      placeholder="Vacío = color de la dirección (#hex, hsl, rgb…)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Afecta borde de la foto, cargo y botones. Sin personalizar, usa el color de la dirección.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <Label htmlFor="showBrand">Mostrar marca Ecosistema WCA</Label>
                  <Switch
                    id="showBrand"
                    checked={state.theme.showBrand !== false}
                    onCheckedChange={(checked) =>
                      updateField("theme", { ...state.theme, showBrand: checked })
                    }
                  />
                </div>
              </EditorSection>

              <EditorSection title="Redes fijas" icon={Share2}>
                <div className="space-y-2">
                  <Label>Mostrar por defecto como</Label>
                  <Select
                    value={state.theme.socialDisplayDefault || "circle"}
                    onValueChange={(v) =>
                      updateField("theme", {
                        ...state.theme,
                        socialDisplayDefault: v as "circle" | "button",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">Círculos (iconos)</SelectItem>
                      <SelectItem value="button">Botones Linktree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["linkedIn", "LinkedIn"],
                      ["instagram", "Instagram"],
                      ["twitter", "X (antes Twitter)"],
                      ["github", "GitHub"],
                      ["youtube", "YouTube"],
                      ["tiktok", "TikTok"],
                      ["whatsapp", "WhatsApp (número o URL)"],
                      ["email", "Email"],
                      ["website", "Sitio web"],
                    ] as const
                  ).map(([key, label]) => {
                    const socialKey = key as CardSocialKey;
                    const mode =
                      state.theme.socialDisplay?.[socialKey] ??
                      state.theme.socialDisplayDefault ??
                      "circle";
                    return (
                      <div key={key} className="space-y-1.5 rounded-xl border p-3">
                        <Label>{label}</Label>
                        <Input
                          value={state[key]}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder="https://..."
                        />
                        <Select
                          value={mode}
                          onValueChange={(v) =>
                            updateField("theme", {
                              ...state.theme,
                              socialDisplay: {
                                ...(state.theme.socialDisplay ?? {}),
                                [socialKey]: v as "circle" | "button",
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="circle">Círculo</SelectItem>
                            <SelectItem value="button">Botón Linktree</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </EditorSection>

              <EditorSection
                title="Botones Linktree"
                icon={Link2}
                action={
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={addLink}>
                    <Plus className="mr-1 h-4 w-4" />
                    Añadir
                  </Button>
                }
              >
                {state.links.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay botones. Añade enlaces personalizados (portfolio, agenda, etc.).
                  </p>
                ) : (
                  <div className="space-y-3">
                    {state.links.map((link, index) => (
                      <div key={link.id} className="relative z-0 space-y-2 overflow-visible rounded-xl border p-3 focus-within:z-30">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === 0}
                            onClick={() => moveLink(index, -1)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === state.links.length - 1}
                            onClick={() => moveLink(index, 1)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <div className="ml-auto flex items-center gap-2">
                            <Switch
                              checked={link.enabled}
                              onCheckedChange={(checked) => {
                                const next = [...state.links];
                                next[index] = { ...link, enabled: checked };
                                updateField("links", next);
                              }}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() =>
                                updateField(
                                  "links",
                                  state.links.filter((l) => l.id !== link.id),
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={link.title}
                          onChange={(e) => {
                            const next = [...state.links];
                            next[index] = { ...link, title: e.target.value };
                            updateField("links", next);
                          }}
                          placeholder="Título del botón"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const next = [...state.links];
                            next[index] = { ...link, url: e.target.value };
                            updateField("links", next);
                          }}
                          placeholder="https://..."
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <FaIconPicker
                            value={link.icon}
                            onChange={(icon) => {
                              const next = [...state.links];
                              next[index] = { ...link, icon };
                              updateField("links", next);
                            }}
                          />
                          <Select
                            value={link.style || "solid"}
                            onValueChange={(v) => {
                              const next = [...state.links];
                              next[index] = {
                                ...link,
                                style: v as PresentationCardLink["style"],
                              };
                              updateField("links", next);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="solid">Sólido</SelectItem>
                              <SelectItem value="soft">Suave</SelectItem>
                              <SelectItem value="outline">Contorno</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </EditorSection>

              <EditorSection title="Publicación" icon={Globe}>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div>
                    <Label htmlFor="published">Publicada</Label>
                    <p className="text-xs text-muted-foreground">
                      Visible en ecosistemawca.com/{state.slug}
                    </p>
                  </div>
                  <Switch
                    id="published"
                    checked={state.isPublished}
                    onCheckedChange={(checked) => updateField("isPublished", checked)}
                  />
                </div>
                {mode === "admin" && (
                  <div className="space-y-2">
                    <Label>Asignar a usuario</Label>
                    <div ref={userPickerRef} className="relative w-full">
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={userPickerOpen}
                        className="h-10 w-full justify-between font-normal"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUserPickerOpen((prev) => {
                            const next = !prev;
                            if (next) setUserSearch("");
                            return next;
                          });
                        }}
                      >
                        <span className="truncate">
                          {assignedUser
                            ? `${assignedUser.name} · ${assignedUser.email}`
                            : "Sin asignar"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>

                      {userPickerOpen ? (
                        <div
                          className="absolute bottom-[calc(100%+0.5rem)] left-0 z-[200] w-full rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div className="relative mb-2">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              placeholder="Buscar por nombre o email..."
                              className="h-9 pl-8"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-56 overflow-y-auto">
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent",
                                state.assignedUserId == null && "bg-accent/60",
                              )}
                              onClick={() => {
                                updateField("assignedUserId", null);
                                setUserPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  state.assignedUserId == null ? "opacity-100" : "opacity-0",
                                )}
                              />
                              Sin asignar
                            </button>
                            {filteredUsers.length === 0 ? (
                              <p className="px-2 py-3 text-sm text-muted-foreground">
                                No se encontró ningún usuario.
                              </p>
                            ) : (
                              filteredUsers.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent",
                                    state.assignedUserId === u.id && "bg-accent/60",
                                  )}
                                  onClick={() => {
                                    updateField("assignedUserId", u.id);
                                    setUserPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0",
                                      state.assignedUserId === u.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="truncate">
                                    {u.name} · {u.email}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El usuario asignado podrá editar su tarjeta en /mi-tarjeta.
                    </p>
                  </div>
                )}
              </EditorSection>
            </div>

            <aside className="xl:sticky xl:top-24 xl:self-start">
              <div className="overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Vista previa</p>
                <div className="overflow-hidden rounded-[1.75rem] border shadow-2xl ring-1 ring-white/10">
                  <CardPreview card={previewCard} compact />
                </div>
              </div>
            </aside>
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
