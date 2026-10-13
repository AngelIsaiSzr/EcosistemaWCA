import { useMemo, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard,
  Eye,
  FileText,
  Globe,
  Loader2,
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Navbar from "@/components/layout/navbar";
import {
  AdminEmptyState,
  AdminSearchInput,
  AdminTile,
  matchesSearch,
} from "@/components/admin/edit-panel";

type SortKey = "pinned" | "name" | "views" | "newest" | "direction";

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  index,
}: {
  icon: typeof CreditCard;
  label: string;
  value: ReactNode;
  hint?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex min-w-0 items-start gap-3 rounded-2xl border bg-card p-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4]/15 text-[#5b8fd4] ring-1 ring-[#5b8fd4]/25">
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

export default function AdminCardsPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sort, setSort] = useState<SortKey>("pinned");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<{ id: number; name: string } | null>(null);

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

  const publishedCount = cards.filter((c) => c.isPublished).length;
  const draftCount = cards.length - publishedCount;
  const viewsTotal = cards.reduce((sum, c) => sum + (c.viewCount ?? 0), 0);

  const filtered = useMemo(() => {
    let list = [...cards];
    if (directionFilter !== "all") {
      list = list.filter((c) => c.direction === directionFilter);
    }
    list = list.filter((c) => matchesSearch(search, c.name, c.roleTitle, c.slug, c.email));
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
  }, [cards, sort, directionFilter, search]);

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
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href="/talento" className="hover:text-foreground">
                  Inicio
                </Link>
                {" › "}
                Tarjetas
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Tarjetas de presentación</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Crea y gestiona tarjetas digitales estilo Linktree para el equipo WCA.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Nueva tarjeta
              </Button>
              <Button variant="outline" className="h-10 rounded-xl" asChild>
                <Link href="/talento">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al panel
                </Link>
              </Button>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard index={0} icon={CreditCard} label="Tarjetas" value={cards.length} hint="En total" />
            <SummaryCard index={1} icon={Globe} label="Publicadas" value={publishedCount} hint="Visibles en su URL" />
            <SummaryCard index={2} icon={FileText} label="Borradores" value={draftCount} hint="Aún no públicas" />
            <SummaryCard index={3} icon={Eye} label="Vistas" value={viewsTotal} hint="Suma de todas las tarjetas" />
          </div>

          <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDirectionFilter("all")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  directionFilter === "all"
                    ? "border-[#5b8fd4] bg-[#5b8fd4]/10 text-foreground"
                    : "border-transparent bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                Todas <span className="opacity-60">{cards.length}</span>
              </button>
              {CARD_DIRECTIONS.map((d) => {
                const n = cards.filter((c) => c.direction === d.id).length;
                if (!n) return null;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDirectionFilter(d.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      directionFilter === d.id
                        ? "border-[#5b8fd4] bg-[#5b8fd4]/10 text-foreground"
                        : "border-transparent bg-muted/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: getCardDirectionCssColor(d.id) }} />
                    {d.label.replace("Dirección de ", "")} <span className="opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminSearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, cargo o URL…" />
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-10 w-[160px] rounded-xl bg-card">
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
            <AdminEmptyState>
              {search || directionFilter !== "all"
                ? "No hay tarjetas que coincidan con ese filtro."
                : "Aún no hay tarjetas. Crea la primera con «Nueva tarjeta»."}
            </AdminEmptyState>
          ) : (
            <div className="space-y-10">
              {grouped.map(({ direction, items }) => (
                <section key={direction.id}>
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background"
                      style={{ background: getCardDirectionCssColor(direction.id), boxShadow: `0 0 0 2px ${getCardDirectionCssColor(direction.id)}33` }}
                    />
                    <h2 className="font-heading text-lg font-semibold">{direction.label}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((card, i) => {
                      const color = getCardDirectionCssColor(card.direction as CardDirectionId);
                      const pinned = !!card.pinnedAt;
                      return (
                        <AdminTile
                          key={card.id}
                          index={i}
                          onClick={() => navigate(`/talento/tarjetas/${card.id}/editar`)}
                          className="p-5"
                        >
                          <div className="flex items-start gap-3">
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
                            <div className="min-w-0 flex-1 pr-8">
                              <div className="flex items-start gap-1.5">
                                <h3 className="line-clamp-1 font-heading text-base font-semibold leading-snug">
                                  {card.name}
                                </h3>
                                {pinned ? <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5b8fd4]" /> : null}
                              </div>
                              <p className="mt-0.5 line-clamp-1 text-sm" style={{ color }}>
                                {card.roleTitle}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">/{card.slug}</p>
                              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {card.isPublished ? (
                                  <span className="rounded-full px-2 py-0.5" style={{ background: `${color}22`, color }}>
                                    Publicada
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-muted px-2 py-0.5">Borrador</span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  {card.viewCount ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-3 top-3 h-8 w-8 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Más opciones"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onSelect={() => navigate(`/talento/tarjetas/${card.id}/editar`)}>
                                Editar
                              </DropdownMenuItem>
                              {card.isPublished ? (
                                <DropdownMenuItem onSelect={() => window.open(`/${card.slug}`, "_blank")}>
                                  Abrir pública
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem onSelect={() => pinMutation.mutate({ id: card.id, pinned: !pinned })}>
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
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-400 dark:focus:text-red-300"
                                onSelect={() => setToDelete({ id: card.id, name: card.name })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </AdminTile>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Eliminar tarjeta"
        description={`¿Eliminar la tarjeta de ${toDelete?.name ?? ""}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
