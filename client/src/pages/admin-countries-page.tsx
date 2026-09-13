import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { Country, insertCountrySchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const countryFormSchema = insertCountrySchema.extend({
  name: z.string().min(1, "El nombre es requerido"),
  code: z
    .string()
    .min(2, "Código ISO de 2 letras")
    .max(2, "Código ISO de 2 letras")
    .regex(/^[a-zA-Z]{2}$/, "Usa el código ISO (ej. mx, co, es)"),
  students: z.string().min(1, "Indica el número o texto (ej. +80, 8)"),
  order: z.number().min(1),
});

type CountryFormValues = z.infer<typeof countryFormSchema>;

export default function AdminCountriesPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Country | null>(null);
  const [toDelete, setToDelete] = useState<number | null>(null);

  const { data: countries } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
    enabled: user?.role === "admin",
  });

  const emptyValues: CountryFormValues = {
    name: "",
    code: "",
    students: "",
    order: 1,
  };

  const form = useForm<CountryFormValues>({
    resolver: zodResolver(countryFormSchema),
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
        code: editing.code,
        students: editing.students,
        order: editing.order,
      });
    } else {
      form.reset({
        ...emptyValues,
        order: countries?.length ? Math.max(...countries.map((c) => c.order)) + 1 : 1,
      });
    }
  }, [editing, countries, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CountryFormValues) => {
      const res = await apiRequest("POST", "/api/countries", {
        ...data,
        code: data.code.toLowerCase(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "País agregado", description: "Se agregó al carrusel de banderas." });
      form.reset(emptyValues);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CountryFormValues }) => {
      const res = await apiRequest("PATCH", `/api/countries/${id}`, {
        ...data,
        code: data.code.toLowerCase(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "País actualizado", description: "Los cambios se guardaron." });
      setEditing(null);
      form.reset(emptyValues);
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/countries/${id}`);
    },
    onSuccess: () => {
      toast({ title: "País eliminado" });
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: number; order: number }[]) => {
      await Promise.all(
        updates.map((item) =>
          apiRequest("PATCH", `/api/countries/${item.id}`, { order: item.order }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo reordenar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CountryFormValues) => {
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        data: { ...data, order: editing.order },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!countries?.length) return;
    const sorted = [...countries].sort((a, b) => a.order - b.order);
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

  const watchedCode = form.watch("code");

  return (
    <>
      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Eliminar este país del carrusel? Esta acción no se puede deshacer.
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
        <title>Países | Ecosistema WCA</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8">
            <p className="text-sm text-muted-foreground">
              <Link href="/admin" className="hover:text-foreground">
                Inicio
              </Link>
              {" › "}
              Países
            </p>
            <h1 className="mt-1 font-heading text-4xl font-bold">Países</h1>
            <p className="mt-2 text-muted-foreground">
              Gestiona las banderas y el número de estudiantes del carrusel en la página principal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{editing ? "Editar país" : "Agregar país"}</CardTitle>
                <CardDescription>
                  {editing
                    ? `Actualizando: ${editing.name}`
                    : "Agrega un país con su código ISO y cantidad de estudiantes."}
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
                            <Input placeholder="México" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código ISO</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="mx"
                              maxLength={2}
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                            />
                          </FormControl>
                          <FormDescription>
                            Código de 2 letras para la bandera (flagcdn), ej. mx, ve, ar.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="students"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estudiantes</FormLabel>
                          <FormControl>
                            <Input placeholder="+80 o 8" {...field} />
                          </FormControl>
                          <FormDescription>
                            Texto libre: puede ser un número o algo como +80.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {watchedCode && watchedCode.length === 2 ? (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <img
                          src={`https://flagcdn.com/w80/${watchedCode.toLowerCase()}.png`}
                          alt="Vista previa bandera"
                          className="h-10 w-14 object-contain shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground">Vista previa de bandera</span>
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
                  <h3 className="text-xl font-medium">Países del carrusel</h3>
                  <p className="text-sm text-muted-foreground">Usa las flechas para cambiar el orden.</p>
                </div>
                <span className="text-sm text-muted-foreground">{countries?.length ?? 0} países</span>
              </div>

              {countries && countries.length > 0 ? (
                <div className="space-y-3">
                  {[...countries]
                    .sort((a, b) => a.order - b.order)
                    .map((country, index, list) => (
                      <Card key={country.id} className="overflow-hidden">
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
                          <img
                            src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`}
                            alt={country.name}
                            className="h-12 w-16 shrink-0 self-center object-contain shadow-sm"
                          />
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="truncate font-medium">{country.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {country.students}{" "}
                                {country.students === "1" ? "estudiante" : "estudiantes"} ·{" "}
                                <span className="uppercase">{country.code}</span>
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditing(country)}>
                                <Pencil className="mr-1 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setToDelete(country.id)}
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
                  Aún no hay países. Agrega el primero con el formulario.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
