import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { PresentationCard } from "@shared/schema";
import {
  CARD_DIRECTIONS,
  DEFAULT_CARD_THEME,
  normalizeCardSlug,
  type PresentationCardLink,
  type PresentationCardTheme,
} from "@shared/card-directions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { CardPreview } from "@/components/cards/card-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

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
}: {
  cardId?: number;
  mode: "admin" | "owner";
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [state, setState] = useState<EditorState | null>(null);
  const [dirty, setDirty] = useState(false);

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
          <Button className="mt-6" variant="outline" onClick={() => navigate(mode === "admin" ? "/admin/tarjetas" : "/")}>
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

  return (
    <>
      <Helmet>
        <title>
          {mode === "admin" ? `Editar · ${state.name}` : "Mi tarjeta"} | Ecosistema WCA
        </title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {mode === "admin" ? (
                  <>
                    <Link href="/admin" className="hover:text-foreground">
                      Inicio
                    </Link>
                    {" › "}
                    <Link href="/admin/tarjetas" className="hover:text-foreground">
                      Tarjetas
                    </Link>
                    {" › "}
                    Editar
                  </>
                ) : (
                  "Mi tarjeta digital"
                )}
              </p>
              <h1 className="mt-1 font-heading text-3xl font-bold md:text-4xl">
                {mode === "admin" ? "Editar tarjeta" : "Mi tarjeta"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                URL pública:{" "}
                <span className="font-medium text-foreground">
                  ecosistemawca.com/{normalizeCardSlug(state.slug) || state.slug}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.isPublished && (
                <Button variant="outline" asChild>
                  <a href={`/${state.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver pública
                  </a>
                </Button>
              )}
              <Button
                className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !dirty}
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <section className="rounded-2xl border bg-card p-5 space-y-4">
                <h2 className="font-heading text-lg font-semibold">Perfil</h2>
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
                  <Textarea
                    rows={4}
                    value={state.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL de foto</Label>
                  <Input
                    value={state.image}
                    onChange={(e) => updateField("image", e.target.value)}
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
              </section>

              <section className="rounded-2xl border bg-card p-5 space-y-4">
                <h2 className="font-heading text-lg font-semibold">Dirección y tema</h2>
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
                        <SelectItem value="gradient">Degradado</SelectItem>
                        <SelectItem value="mesh">Mesh</SelectItem>
                        <SelectItem value="solid">Sólido</SelectItem>
                      </SelectContent>
                    </Select>
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
                <div className="space-y-2">
                  <Label>Color de acento personalizado (opcional)</Label>
                  <Input
                    value={state.theme.accentColor || ""}
                    onChange={(e) =>
                      updateField("theme", {
                        ...state.theme,
                        accentColor: e.target.value || undefined,
                      })
                    }
                    placeholder="#5b8fd4 o hsl(...)"
                  />
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
              </section>

              <section className="rounded-2xl border bg-card p-5 space-y-4">
                <h2 className="font-heading text-lg font-semibold">Redes fijas</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["linkedIn", "LinkedIn"],
                      ["instagram", "Instagram"],
                      ["twitter", "Twitter / X"],
                      ["github", "GitHub"],
                      ["youtube", "YouTube"],
                      ["tiktok", "TikTok"],
                      ["whatsapp", "WhatsApp (número o URL)"],
                      ["email", "Email"],
                      ["website", "Sitio web"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input
                        value={state[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-lg font-semibold">Botones Linktree</h2>
                  <Button type="button" variant="outline" size="sm" onClick={addLink}>
                    <Plus className="mr-1 h-4 w-4" />
                    Añadir
                  </Button>
                </div>
                {state.links.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay botones. Añade enlaces personalizados (portfolio, agenda, etc.).
                  </p>
                ) : (
                  <div className="space-y-3">
                    {state.links.map((link, index) => (
                      <div key={link.id} className="rounded-xl border p-3 space-y-2">
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
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={link.icon || ""}
                            onChange={(e) => {
                              const next = [...state.links];
                              next[index] = { ...link, icon: e.target.value || undefined };
                              updateField("links", next);
                            }}
                            placeholder="Icono FA (ej. fas fa-link)"
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
              </section>

              <section className="rounded-2xl border bg-card p-5 space-y-4">
                <h2 className="font-heading text-lg font-semibold">Publicación</h2>
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
                    <Select
                      value={state.assignedUserId?.toString() || "none"}
                      onValueChange={(v) =>
                        updateField("assignedUserId", v === "none" ? null : Number(v))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {(usersQuery.data ?? []).map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name} · {u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El usuario asignado podrá editar su tarjeta en /mi-tarjeta.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <aside className="xl:sticky xl:top-24 xl:self-start">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Vista previa</p>
              <div
                className={cn(
                  "overflow-hidden rounded-[2rem] border shadow-2xl ring-1 ring-white/10",
                )}
              >
                <CardPreview card={previewCard} compact />
              </div>
            </aside>
          </div>
        </main>
      </div>
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
