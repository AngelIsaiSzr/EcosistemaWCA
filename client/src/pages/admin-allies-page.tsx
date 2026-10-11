import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, ArrowLeft, ImageIcon, Plus, Trash2 } from "lucide-react";
import { Ally, insertAllySchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { ImageUrlInput } from "@/components/media/image-url-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  AdminEditPanel,
  AdminEmptyState,
  AdminPanelBody,
  AdminPanelFooter,
  AdminPanelHeader,
  AdminSearchInput,
  AdminTile,
  matchesSearch,
} from "@/components/admin/edit-panel";

const allyFormSchema = insertAllySchema.extend({
  name: z.string().min(1, "El nombre es requerido"),
  image: z.string().min(5, "Ingresa una URL o ruta de imagen"),
  order: z.number().min(1),
});

type AllyFormValues = z.infer<typeof allyFormSchema>;

const FORM_ID = "ally-form";

export default function AdminAlliesPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Ally | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: allies } = useQuery<Ally[]>({
    queryKey: ["/api/allies"],
    enabled: user?.role === "admin",
  });

  const emptyValues: AllyFormValues = {
    name: "",
    image: "",
    order: 1,
  };

  const form = useForm<AllyFormValues>({
    resolver: zodResolver(allyFormSchema),
    defaultValues: emptyValues,
  });

  const nextOrder = allies?.length ? Math.max(...allies.map((a) => a.order)) + 1 : 1;

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const openEdit = (ally: Ally) => {
    setEditing(ally);
    form.reset({ name: ally.name, image: ally.image, order: ally.order });
    setPanelOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    form.reset({ ...emptyValues, order: nextOrder });
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditing(null);
  };

  const createMutation = useMutation({
    mutationFn: async (data: AllyFormValues) => {
      const res = await apiRequest("POST", "/api/allies", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Aliado agregado", description: "El logo se agregó al carrusel." });
      closePanel();
      queryClient.invalidateQueries({ queryKey: ["/api/allies"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AllyFormValues }) => {
      const res = await apiRequest("PATCH", `/api/allies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Aliado actualizado", description: "Los cambios se guardaron." });
      closePanel();
      queryClient.invalidateQueries({ queryKey: ["/api/allies"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/allies/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Aliado eliminado" });
      queryClient.invalidateQueries({ queryKey: ["/api/allies"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: number; order: number }[]) => {
      await Promise.all(
        updates.map((item) => apiRequest("PATCH", `/api/allies/${item.id}`, { order: item.order })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allies"] });
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo reordenar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AllyFormValues) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { ...data, order: editing.order } });
    } else {
      createMutation.mutate(data);
    }
  };

  const sorted = useMemo(() => [...(allies ?? [])].sort((a, b) => a.order - b.order), [allies]);
  const visible = sorted.filter((ally) => matchesSearch(search, ally.name));

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    reorderMutation.mutate([
      { id: a.id, order: b.order },
      { id: b.id, order: a.order },
    ]);
  };

  const watchedImage = form.watch("image");

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Eliminar este aliado del carrusel? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (toDelete) {
                  deleteMutation.mutate(toDelete);
                  setToDelete(null);
                  closePanel();
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Helmet>
        <title>Aliados | Ecosistema WCA</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href="/admin" className="hover:text-foreground">
                  Inicio
                </Link>
                {" › "}
                Aliados
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Aliados</h1>
              <p className="mt-2 text-muted-foreground">
                Gestiona los logos del carrusel de aliados en la página principal.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <AdminSearchInput value={search} onChange={setSearch} placeholder="Buscar aliado…" />
              <Button onClick={openNew} className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]">
                <Plus className="h-4 w-4" />
                Nuevo aliado
              </Button>
              <Button variant="outline" className="h-10 rounded-xl" asChild>
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al panel
                </Link>
              </Button>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            {sorted.length} aliados · da clic en un logo para editarlo. Pasa el cursor para cambiar el orden.
          </p>

          {visible.length > 0 ? (
            <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              <AnimatePresence>
                {visible.map((ally, i) => {
                  const index = sorted.indexOf(ally);
                  return (
                    <AdminTile
                      key={ally.id}
                      index={i}
                      selected={panelOpen && editing?.id === ally.id}
                      onClick={() => openEdit(ally)}
                      className="p-3"
                    >
                      <div className="flex h-24 items-center justify-center rounded-xl bg-white p-3 ring-1 ring-black/5">
                        <img
                          src={ally.image}
                          alt={ally.name}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-2 truncate text-center text-xs text-muted-foreground">{ally.name}</p>
                      {!search && (
                        <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label="Subir"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItem(index, -1);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-[#5b8fd4] disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Bajar"
                            disabled={index === sorted.length - 1 || reorderMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItem(index, 1);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-[#5b8fd4] disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </AdminTile>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <AdminEmptyState>
              {search ? "No hay aliados que coincidan con tu búsqueda." : "Aún no hay aliados. Agrega el primero con «Nuevo aliado»."}
            </AdminEmptyState>
          )}
        </main>
      </div>

      <AdminEditPanel open={panelOpen} onClose={closePanel} variant="modal" widthClass="lg:w-[28rem]">
        <AdminPanelHeader
          media={
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/50">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          }
          title={editing ? "Editar aliado" : "Nuevo aliado"}
          subtitle="Aparece en el carrusel de logos"
          onClose={closePanel}
          actions={
            editing
              ? [{ label: "Eliminar aliado", icon: Trash2, destructive: true, onClick: () => setToDelete(editing.id) }]
              : undefined
          }
        />
        <AdminPanelBody contentKey={editing?.id ?? "new"}>
          <div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex h-28 items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-black/5">
                {watchedImage ? (
                  <img src={watchedImage} alt="Vista previa en claro" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="flex h-28 items-center justify-center rounded-2xl bg-zinc-950 p-4 ring-1 ring-white/10">
                {watchedImage ? (
                  <img src={watchedImage} alt="Vista previa en oscuro" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-zinc-700" />
                )}
              </div>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>Fondo claro</span>
              <span>Fondo oscuro</span>
            </div>
          </div>
          <Form {...form}>
            <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del aliado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del logo</FormLabel>
                    <FormControl>
                      <ImageUrlInput value={field.value || ""} onChange={field.onChange} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </AdminPanelBody>
        <AdminPanelFooter
          onCancel={closePanel}
          formId={FORM_ID}
          pending={pending}
          submitLabel={editing ? "Guardar cambios" : "Agregar aliado"}
        />
      </AdminEditPanel>
    </>
  );
}
