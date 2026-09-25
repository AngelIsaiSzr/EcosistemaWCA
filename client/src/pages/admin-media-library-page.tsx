import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Images, Loader2, Replace, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LibraryItem = {
  url: string;
  label: string;
  source: string;
};

const SOURCE_LABEL: Record<string, string> = {
  media: "Sitio",
  subida: "Subidas",
  equipo: "Equipo",
  tarjeta: "Tarjetas",
  testimonio: "Testimonios",
  aliado: "Aliados",
  organigrama: "Organigrama",
};

export default function AdminMediaLibraryPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [replacingUrl, setReplacingUrl] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LibraryItem | null>(null);

  const { data, isLoading: listLoading } = useQuery<{ items: LibraryItem[] }>({
    queryKey: ["/api/media/library"],
    enabled: user?.role === "admin",
    queryFn: async () => {
      const res = await fetch("/api/media/library", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la biblioteca");
      return res.json();
    },
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      if (!needle) return true;
      return (
        item.label.toLowerCase().includes(needle) ||
        item.url.toLowerCase().includes(needle) ||
        (SOURCE_LABEL[item.source] || item.source).toLowerCase().includes(needle)
      );
    });
  }, [items, q, sourceFilter]);

  const sources = useMemo(() => {
    const set = new Set(items.map((i) => i.source));
    return Array.from(set).sort();
  }, [items]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/media/library"] });

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/media/library/upload", {
        method: "POST",
        body,
        credentials: "include",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "No se pudo subir");
      await invalidate();
      toast({ title: "Imagen subida" });
    } catch (error) {
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const replaceFile = async (url: string, file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("url", url);
      const res = await fetch("/api/media/library/replace", {
        method: "POST",
        body,
        credentials: "include",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "No se pudo reemplazar");
      await invalidate();
      toast({ title: "Imagen reemplazada" });
    } catch (error) {
      toast({
        title: "Error al reemplazar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setReplacingUrl(null);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (url: string) => {
      await apiRequest("DELETE", "/api/media/library", { url });
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Imagen eliminada" });
      setToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Biblioteca de imágenes | Administración</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-6xl px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/admin"
                className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Administración
              </Link>
              <h1 className="flex items-center gap-2 font-heading text-3xl font-bold sm:text-4xl">
                <Images className="h-8 w-8" />
                Biblioteca de imágenes
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {items.length} imagen{items.length === 1 ? "" : "es"} en la plataforma. Puedes
                subir, reemplazar o borrar solo las de la carpeta de subidas.
              </p>
            </div>
            <div>
              <input
                ref={uploadRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
              <input
                ref={replaceRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && replacingUrl) void replaceFile(replacingUrl, file);
                }}
              />
              <Button
                className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                disabled={uploading}
                onClick={() => uploadRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Subir
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, URL o fuente…"
              className="sm:max-w-sm"
            />
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSourceFilter("all")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  sourceFilter === "all"
                    ? "border-[#5b8fd4] bg-[#5b8fd4]/15 text-[#5b8fd4]"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Todas
              </button>
              {sources.map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setSourceFilter(source)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    sourceFilter === source
                      ? "border-[#5b8fd4] bg-[#5b8fd4]/15 text-[#5b8fd4]"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {SOURCE_LABEL[source] || source}
                </button>
              ))}
            </div>
          </div>

          {listLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No hay imágenes que coincidan.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((item) => {
                const canMutate = item.source === "subida" || item.url.startsWith("/media/library/");
                return (
                  <div
                    key={`${item.source}-${item.url}`}
                    className="overflow-hidden rounded-xl border bg-card"
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
                        }}
                      />
                    </div>
                    <div className="space-y-2 p-2.5">
                      <div>
                        <p className="truncate text-xs font-medium">{item.label}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {SOURCE_LABEL[item.source] || item.source}
                          {!canMutate ? " · solo lectura" : ""}
                        </p>
                      </div>
                      {canMutate && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 px-2 text-[11px]"
                            disabled={uploading}
                            onClick={() => {
                              setReplacingUrl(item.url);
                              replaceRef.current?.click();
                            }}
                          >
                            <Replace className="mr-1 h-3 w-3" />
                            Reemplazar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => setToDelete(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Dialog open={toDelete != null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar imagen</DialogTitle>
            <DialogDescription>
              Se borrará el archivo de la biblioteca. Si alguna ficha aún apunta a esta URL, la
              imagen dejará de verse ahí.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !toDelete}
              onClick={() => toDelete && deleteMutation.mutate(toDelete.url)}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
