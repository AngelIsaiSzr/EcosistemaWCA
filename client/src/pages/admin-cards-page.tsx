import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Eye,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { PresentationCard } from "@shared/schema";
import {
  CARD_DIRECTIONS,
  getCardDirectionCssColor,
  type CardDirectionId,
} from "@shared/card-directions";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navbar from "@/components/layout/navbar";

type SortKey = "pinned" | "name" | "views" | "newest" | "direction";

export default function AdminCardsPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sort, setSort] = useState<SortKey>("pinned");
  const [directionFilter, setDirectionFilter] = useState<string>("all");

  const { data: cards = [], isLoading: cardsLoading } = useQuery<PresentationCard[]>({
    queryKey: ["/api/cards"],
    enabled: user?.role === "talento",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cards", {
        name: "Nueva tarjeta",
        roleTitle: "Cargo",
        bio: "",
        image: "",
        slug: `miembro-${Date.now()}`,
        isPublished: false,
      });
      return res.json() as Promise<PresentationCard>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      navigate(`/talento/tarjetas/${created.id}/editar`);
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo crear", description: error.message, variant: "destructive" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: number; pinned: boolean }) => {
      await apiRequest("PATCH", `/api/cards/${id}`, { pinned });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cards"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({ title: "Tarjeta eliminada" });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    let list = [...cards];
    if (directionFilter !== "all") {
      list = list.filter((c) => c.direction === directionFilter);
    }
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "views") return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      if (sort === "direction") return a.direction.localeCompare(b.direction);
      if (sort === "newest") {
        return (
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        );
      }
      const ap = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const bp = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      if (ap !== bp) return bp - ap;
      return a.order - b.order;
    });
    return list;
  }, [cards, sort, directionFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, PresentationCard[]>();
    for (const card of filtered) {
      const key = card.direction || "direccion-sede";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return CARD_DIRECTIONS.map((d) => ({
      direction: d,
      items: map.get(d.id) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  if (isLoading || !user || user.role !== "talento") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Tarjetas de presentación | Ecosistema WCA</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href="/talento" className="hover:text-foreground">
                  Inicio
                </Link>
                {" › "}
                Tarjetas
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Tarjetas de presentación</h1>
              <p className="mt-2 text-muted-foreground">
                Crea y gestiona tarjetas digitales estilo Linktree para el equipo WCA.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/talento">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al panel
                </Link>
              </Button>
              <Button
                className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                Nueva tarjeta
              </Button>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-full border bg-card px-4 py-1.5 text-sm font-medium">
              {cards.length} tarjetas
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="h-9 w-[220px] bg-card">
                  <SelectValue placeholder="Dirección" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las direcciones</SelectItem>
                  {CARD_DIRECTIONS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label.replace("Dirección de ", "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[160px] bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pinned">Fijados</SelectItem>
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="views">Vistas</SelectItem>
                  <SelectItem value="direction">Dirección</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {cardsLoading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner text="Cargando tarjetas..." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center text-muted-foreground">
              Aún no hay tarjetas. Crea la primera con “Nueva tarjeta”.
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map(({ direction, items }) => (
                <section key={direction.id}>
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: getCardDirectionCssColor(direction.id) }}
                    />
                    <h2 className="font-heading text-lg font-semibold">{direction.label}</h2>
                    <span className="text-sm text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((card) => {
                      const color = getCardDirectionCssColor(card.direction as CardDirectionId);
                      const pinned = !!card.pinnedAt;
                      return (
                        <div
                          key={card.id}
                          className="group relative flex items-start gap-3 rounded-2xl border bg-card p-5 transition hover:shadow-sm"
                          style={{ borderColor: `${color}33` }}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            onClick={() => navigate(`/talento/tarjetas/${card.id}/editar`)}
                          >
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1"
                              style={{ background: `${color}22`, boxShadow: `0 0 0 1px ${color}40` }}
                            >
                              {card.image ? (
                                <img src={card.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <CreditCard className="h-5 w-5" style={{ color }} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5 pr-8">
                              <div className="flex items-start gap-1.5">
                                <h3 className="line-clamp-1 font-heading text-base font-semibold leading-snug">
                                  {card.name}
                                </h3>
                                {pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5b8fd4]" />}
                              </div>
                              <p className="mt-0.5 line-clamp-1 text-sm" style={{ color }}>
                                {card.roleTitle}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                /{card.slug}
                              </p>
                              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {!card.isPublished && (
                                  <span className="rounded-full bg-muted px-2 py-0.5">Borrador</span>
                                )}
                                {card.isPublished && (
                                  <span
                                    className="rounded-full px-2 py-0.5"
                                    style={{ background: `${color}22`, color }}
                                  >
                                    Publicada
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  {card.viewCount ?? 0}
                                </span>
                              </div>
                            </div>
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-3 top-3 h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/talento/tarjetas/${card.id}/editar`)}
                              >
                                Editar
                              </DropdownMenuItem>
                              {card.isPublished && (
                                <DropdownMenuItem
                                  onClick={() => window.open(`/${card.slug}`, "_blank")}
                                >
                                  Abrir pública
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  pinMutation.mutate({ id: card.id, pinned: !pinned })
                                }
                              >
                                {pinned ? (
                                  <>
                                    <PinOff className="mr-2 h-4 w-4" /> Quitar fijado
                                  </>
                                ) : (
                                  <>
                                    <Pin className="mr-2 h-4 w-4" /> Fijar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm(`¿Eliminar la tarjeta de ${card.name}?`)) {
                                    deleteMutation.mutate(card.id);
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
