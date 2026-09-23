import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Ally, insertAllySchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { ImageUrlInput } from "@/components/media/image-url-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const allyFormSchema = insertAllySchema.extend({
  name: z.string().min(1, "El nombre es requerido"),
  image: z.string().min(5, "Ingresa una URL o ruta de imagen"),
  order: z.number().min(1),
});

type AllyFormValues = z.infer<typeof allyFormSchema>;

export default function AdminAlliesPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Ally | null>(null);
  const [toDelete, setToDelete] = useState<number | null>(null);

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

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        image: editing.image,
        order: editing.order,
      });
    } else {
      form.reset({
        ...emptyValues,
        order: allies?.length ? Math.max(...allies.map((a) => a.order)) + 1 : 1,
      });
    }
  }, [editing, allies, form]);

  const createMutation = useMutation({
    mutationFn: async (data: AllyFormValues) => {
      const res = await apiRequest("POST", "/api/allies", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Aliado agregado", description: "El logo se agregó al carrusel." });
      form.reset(emptyValues);
      setEditing(null);
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
      setEditing(null);
      form.reset(emptyValues);
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

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!allies?.length) return;
    const sorted = [...allies].sort((a, b) => a.order - b.order);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    reorderMutation.mutate([
      { id: a.id, order: b.order },
      { id: b.id, order: a.order },
    ]);
  };

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const watchedImage = form.watch("image");

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
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
            <Button variant="outline" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{editing ? "Editar aliado" : "Agregar aliado"}</CardTitle>
                <CardDescription>
                  {editing
                    ? `Actualizando: ${editing.name}`
                    : "Agrega un logo (URL de imagen PNG transparente recomendada)."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <ImageUrlInput
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="https://..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {watchedImage ? (
                      <div className="flex h-28 items-center justify-center rounded-lg border bg-secondary-900/40 p-3">
                        <img
                          src={watchedImage}
                          alt="Vista previa"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : null}
                    <div className="flex justify-end gap-3 pt-2">
                      {editing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditing(null);
                            form.reset(emptyValues);
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {(createMutation.isPending || updateMutation.isPending) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editing ? "Actualizar" : "Agregar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-xl font-medium">Logos del carrusel</h3>
                  <p className="text-sm text-muted-foreground">Usa las flechas para cambiar el orden.</p>
                </div>
                <span className="text-sm text-muted-foreground">{allies?.length ?? 0} aliados</span>
              </div>

              {allies && allies.length > 0 ? (
                <div className="space-y-3">
                  {[...allies]
                    .sort((a, b) => a.order - b.order)
                    .map((ally, index, list) => (
                      <Card key={ally.id} className="overflow-hidden">
                        <div className="flex items-stretch gap-2 p-3 sm:p-4">
                          <div className="flex flex-col justify-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={index === 0 || reorderMutation.isPending}
                              onClick={() => moveItem(index, -1)}
                              aria-label="Subir"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={index === list.length - 1 || reorderMutation.isPending}
                              onClick={() => moveItem(index, 1)}
                              aria-label="Bajar"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-secondary-900/50 p-2">
                            <img
                              src={ally.image}
                              alt={ally.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="truncate font-medium">{ally.name}</h4>
                              <p className="truncate text-xs text-muted-foreground">{ally.image}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditing(ally)}>
                                <Pencil className="mr-1 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setToDelete(ally.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                  Aún no hay aliados. Agrega el primero con el formulario.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
