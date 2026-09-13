import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Eye,
  Globe2,
  Home,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
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
import { DEFAULT_INTEGRATION_SLUG } from "@shared/integration-form";
import { IntegrationForm } from "@shared/schema";

type FormListItem = IntegrationForm & { responseCount: number };

type SortKey = "pinned" | "title" | "responses" | "views" | "newest";

export default function TalentoDashboardPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sort, setSort] = useState<SortKey>("pinned");

  const { data: forms = [], isLoading: formsLoading } = useQuery<FormListItem[]>({
    queryKey: ["/api/talento/forms"],
    enabled: user?.role === "talento",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/talento/forms", {
        title: "Formulario sin título",
      });
      return res.json() as Promise<IntegrationForm>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/forms"] });
      navigate(`/talento/${created.slug}/editar`);
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo crear", description: error.message, variant: "destructive" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ slug, pinned }: { slug: string; pinned: boolean }) => {
      const res = await apiRequest("PATCH", `/api/talento/forms/${slug}`, { pinned });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/forms"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      await apiRequest("DELETE", `/api/talento/forms/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/forms"] });
      toast({ title: "Formulario eliminado" });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  const sorted = useMemo(() => {
    const list = [...forms];
    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "es");
      if (sort === "responses") return (b.responseCount ?? 0) - (a.responseCount ?? 0);
      if (sort === "views") return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      if (sort === "newest") {
        return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      }
      const ap = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const bp = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      if (ap !== bp) return bp - ap;
      return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    });
    return list;
  }, [forms, sort]);

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
        <title>Talento y Bienestar | Formularios</title>
      </Helmet>
      <div className="min-h-screen bg-[#0c0f14] text-white">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-white/70">
              <Home className="h-4 w-4" />
              <span className="text-sm">Inicio</span>
            </div>
            <Button
              className="bg-[#3b82f6] hover:bg-[#2563eb]"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium">
              Formularios
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>Ordenar por</span>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[160px] border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pinned">Fijados</SelectItem>
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="title">Nombre</SelectItem>
                  <SelectItem value="responses">Respuestas</SelectItem>
                  <SelectItem value="views">Vistas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formsLoading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner text="Cargando formularios..." />
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((form) => {
                const pinned = !!form.pinnedAt;
                return (
                  <div
                    key={form.id}
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-[#151a22] px-4 py-4 transition hover:border-white/20 hover:bg-[#1a202b] sm:px-5"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                      onClick={() => navigate(`/talento/${form.slug}`)}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6]/30 to-[#1d4ed8]/20 ring-1 ring-white/10">
                        <Globe2 className="h-5 w-5 text-[#93c5fd]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-heading text-lg font-semibold tracking-tight">
                            {form.title}
                          </h2>
                          {pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-[#3b82f6]" />}
                          {!form.isPublished && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                              Borrador
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-white/50">
                          <span className="inline-flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            {form.viewCount ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {form.responseCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-white/50 hover:bg-white/10 hover:text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/talento/${form.slug}`}>Abrir respuestas</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/talento/${form.slug}/editar`}>Editar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => pinMutation.mutate({ slug: form.slug, pinned: !pinned })}
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
                        {form.slug !== DEFAULT_INTEGRATION_SLUG && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm(`¿Eliminar “${form.title}”? Esta acción no se puede deshacer.`)) {
                                deleteMutation.mutate(form.slug);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}

              {sorted.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-white/50">
                  Aún no hay formularios. Crea el primero con “Nuevo”.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
