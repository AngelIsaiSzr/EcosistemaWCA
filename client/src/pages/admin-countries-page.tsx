import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, ArrowLeft, Flag, Plus, Trash2 } from "lucide-react";
import { Country, insertCountrySchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
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

const FORM_ID = "country-form";

const flagUrl = (code: string, width = 80) => `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;

export default function AdminCountriesPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Country | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [search, setSearch] = useState("");

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

  const nextOrder = countries?.length ? Math.max(...countries.map((c) => c.order)) + 1 : 1;

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const openEdit = (country: Country) => {
    setEditing(country);
    form.reset({
      name: country.name,
      code: country.code,
      students: country.students,
      order: country.order,
    });
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
    mutationFn: async (data: CountryFormValues) => {
      const res = await apiRequest("POST", "/api/countries", {
        ...data,
        code: data.code.toLowerCase(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "País agregado", description: "Se agregó al carrusel de banderas." });
      closePanel();
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
      closePanel();
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

  const sorted = useMemo(() => [...(countries ?? [])].sort((a, b) => a.order - b.order), [countries]);
  const visible = sorted.filter((c) => matchesSearch(search, c.name, c.code));

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

  const watchedCode = form.watch("code");

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const pending = createMutation.isPending || updateMutation.isPending;
  const validCode = watchedCode && /^[a-zA-Z]{2}$/.test(watchedCode);

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
        <title>Países | Ecosistema WCA</title>
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
                Países
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Países</h1>
              <p className="mt-2 text-muted-foreground">
                Gestiona las banderas y el número de estudiantes del carrusel en la página principal.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <AdminSearchInput value={search} onChange={setSearch} placeholder="Buscar país…" />
              <Button onClick={openNew} className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]">
                <Plus className="h-4 w-4" />
                Nuevo país
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
            {sorted.length} países · da clic en uno para editarlo. Pasa el cursor para cambiar el orden.
          </p>

          {visible.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              <AnimatePresence>
                {visible.map((country, i) => {
                  const index = sorted.indexOf(country);
                  return (
                    <AdminTile
                      key={country.id}
                      index={i}
                      selected={panelOpen && editing?.id === country.id}
                      onClick={() => openEdit(country)}
                      className="flex items-center gap-3 p-3 pr-10"
                    >
                      <img
                        src={flagUrl(country.code)}
                        alt={country.name}
                        className="h-8 w-11 shrink-0 rounded-md object-cover ring-1 ring-border transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{country.name}</p>
                        <span className="mt-0.5 inline-flex rounded-full bg-[#5b8fd4]/15 px-2 py-0.5 text-[11px] font-medium text-[#5b8fd4]">
                          {country.students} estudiantes
                        </span>
                      </div>
                      {!search && (
                        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label="Subir"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItem(index, -1);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground transition hover:bg-[#5b8fd4] hover:text-white disabled:opacity-30"
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
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground transition hover:bg-[#5b8fd4] hover:text-white disabled:opacity-30"
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
              {search ? "No hay países que coincidan con tu búsqueda." : "Aún no hay países. Agrega el primero con «Nuevo país»."}
            </AdminEmptyState>
          )}
        </main>
      </div>

      <AdminEditPanel open={panelOpen} onClose={closePanel} variant="modal" widthClass="lg:w-[26rem]">
        <AdminPanelHeader
          media={
            validCode ? (
              <img src={flagUrl(watchedCode)} alt="" className="h-9 w-12 rounded-lg object-cover ring-1 ring-border" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/50">
                <Flag className="h-4 w-4 text-muted-foreground" />
              </div>
            )
          }
          title={editing ? "Editar país" : "Nuevo país"}
          subtitle="Contador del carrusel de banderas"
          onClose={closePanel}
          actions={
            editing
              ? [{ label: "Eliminar país", icon: Trash2, destructive: true, onClick: () => setToDelete(editing.id) }]
              : undefined
          }
        />
        <AdminPanelBody contentKey={editing?.id ?? "new"}>
          <div className="flex h-32 items-center justify-center rounded-2xl border bg-muted/30">
            <AnimatePresence mode="wait">
              {validCode ? (
                <motion.img
                  key={watchedCode.toLowerCase()}
                  src={flagUrl(watchedCode, 160)}
                  alt="Vista previa bandera"
                  initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className="h-20 rounded-xl object-cover shadow-xl"
                />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
                >
                  <Flag className="h-6 w-6" />
                  Escribe el código para ver la bandera
                </motion.div>
              )}
            </AnimatePresence>
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
                      <Input placeholder="México" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Código de 2 letras para la bandera (ej. mx, ve, ar). Estudiantes acepta texto libre como +80.
              </p>
            </form>
          </Form>
        </AdminPanelBody>
        <AdminPanelFooter
          onCancel={closePanel}
          formId={FORM_ID}
          pending={pending}
          submitLabel={editing ? "Guardar cambios" : "Agregar país"}
        />
      </AdminEditPanel>
    </>
  );
}
