import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navbar from "@/components/layout/navbar";
import { IntegrationFormBuilder } from "@/components/talento/form-builder";
import {
  DEFAULT_INTEGRATION_FORM,
  DEFAULT_INTEGRATION_SLUG,
  DEFAULT_MIEMBROS_SLUG,
  IntegrationFormDefinition,
} from "@shared/integration-form";
import { IntegrationForm } from "@shared/schema";
import { cn } from "@/lib/utils";

type UserBasic = { id: number; name: string; email: string };

export default function TalentoFormEditorPage({
  params,
}: {
  params?: Record<string | number, string | undefined>;
}) {
  const formSlug = params?.slug || DEFAULT_INTEGRATION_SLUG;
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState(formSlug);
  const [published, setPublished] = useState(true);
  const [accessMode, setAccessMode] = useState<"public" | "restricted">("public");
  const [allowedUserIds, setAllowedUserIds] = useState<number[]>([]);
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [definition, setDefinition] = useState<IntegrationFormDefinition>(DEFAULT_INTEGRATION_FORM);
  const isOfficial = formSlug === DEFAULT_INTEGRATION_SLUG;
  const isReservedSlug = isOfficial || formSlug === DEFAULT_MIEMBROS_SLUG;

  const { data: form, isLoading: formLoading, isError } = useQuery<IntegrationForm>({
    queryKey: ["/api/talento/forms", formSlug],
    queryFn: async () => {
      const res = await fetch(`/api/talento/forms/${encodeURIComponent(formSlug)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo cargar el formulario");
      return res.json();
    },
    enabled: user?.role === "talento" && !!formSlug,
  });

  const { data: platformUsers = [] } = useQuery<UserBasic[]>({
    queryKey: ["/api/talento/users-basic"],
    queryFn: async () => {
      const res = await fetch("/api/talento/users-basic", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar las cuentas");
      return res.json();
    },
    enabled: user?.role === "talento",
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "talento")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!form) return;
    setTitle(form.title);
    setSlug(form.slug);
    setPublished(form.isPublished);
    setAccessMode(form.accessMode === "restricted" ? "restricted" : "public");
    setAllowedUserIds(Array.isArray(form.allowedUserIds) ? form.allowedUserIds : []);
    setAllowMultipleSubmissions(Boolean(form.allowMultipleSubmissions));
    setDefinition((form.schema as IntegrationFormDefinition) ?? DEFAULT_INTEGRATION_FORM);
  }, [form]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return platformUsers;
    return platformUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [platformUsers, userSearch]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/talento/forms/${encodeURIComponent(formSlug)}`, {
        title,
        slug: isReservedSlug ? formSlug : slug,
        isPublished: published,
        accessMode,
        allowedUserIds: accessMode === "restricted" ? allowedUserIds : [],
        allowMultipleSubmissions,
        schema: { ...definition, title: definition.title || title },
      });
      return res.json() as Promise<IntegrationForm>;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integration/public"] });
      toast({ title: "Formulario guardado" });
      if (updated?.slug && updated.slug !== formSlug) {
        navigate(`/talento/formularios/${updated.slug}/editar`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  const toggleUser = (id: number) => {
    setAllowedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  if (isLoading || !user || user.role !== "talento" || formLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Formulario no encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/talento/formularios">Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Editar · {form.title} | Talento y Bienestar</title>
      </Helmet>
      <div className="min-h-screen overflow-x-hidden bg-background">
        <Navbar />
        <main className="container mx-auto max-w-full px-4 pb-6 pt-24">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link
                href={`/talento/formularios/${formSlug}`}
                className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
              <h1 className="font-heading text-2xl font-bold sm:text-3xl">Editar formulario</h1>
              <p className="mt-1 break-words text-sm text-muted-foreground sm:text-base">
                Arrastra preguntas entre secciones, edita textos y configura quién puede verlo o
                responderlo.
              </p>
            </div>
            <Button
              className="w-full shrink-0 bg-[#5b8fd4] hover:bg-[#4a7fc4] sm:w-auto"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>

          <div className="mb-6 grid min-w-0 gap-4 rounded-2xl border bg-card p-4 sm:p-5 md:grid-cols-3">
            <div className="min-w-0">
              <Label>Título público</Label>
              <Input
                className="mt-1 min-w-0"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDefinition((prev) => ({ ...prev, title: e.target.value }));
                }}
              />
            </div>
            <div className="min-w-0">
              <Label>Enlace (slug)</Label>
              <Input
                className="mt-1 min-w-0"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={isReservedSlug}
              />
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {typeof window !== "undefined" ? window.location.origin : ""}
                {!slug || slug === DEFAULT_INTEGRATION_SLUG ? "/integracion" : `/f/${slug}`}
                {isReservedSlug ? " · enlace reservado" : ""}
              </p>
            </div>
            <label className="flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Publicado</p>
                <p className="text-xs text-muted-foreground">Si se apaga, el enlace deja de funcionar.</p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </label>
          </div>

          <div className="mb-6 space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
            <div>
              <h2 className="font-heading text-lg font-semibold">Acceso y respuestas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Define si el formulario es abierto o solo para cuentas específicas de la plataforma.
                Talento y Admin siempre pueden abrirlo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAccessMode("public")}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition",
                  accessMode === "public"
                    ? "border-[#5b8fd4] bg-[#5b8fd4]/10"
                    : "hover:border-muted-foreground/30",
                )}
              >
                <p className="text-sm font-medium">Público (con enlace)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cualquier persona con el link puede verlo y responder.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setAccessMode("restricted")}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition",
                  accessMode === "restricted"
                    ? "border-[#5b8fd4] bg-[#5b8fd4]/10"
                    : "hover:border-muted-foreground/30",
                )}
              >
                <p className="text-sm font-medium">Solo cuentas autorizadas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requiere iniciar sesión y estar en la lista de acceso.
                </p>
              </button>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Permitir varios envíos por correo</p>
                <p className="text-xs text-muted-foreground">
                  Útil para solicitudes recurrentes (ej. miembros). Si está apagado, un correo solo
                  puede responder una vez.
                </p>
              </div>
              <Switch
                checked={allowMultipleSubmissions}
                onCheckedChange={setAllowMultipleSubmissions}
              />
            </label>

            {accessMode === "restricted" && (
              <div className="rounded-xl border p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Cuentas con acceso</p>
                    <p className="text-xs text-muted-foreground">
                      {allowedUserIds.length} seleccionada
                      {allowedUserIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="relative w-full max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Buscar por nombre o correo"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                  {filteredUsers.length === 0 ? (
                    <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                      No hay cuentas que coincidan.
                    </p>
                  ) : (
                    filteredUsers.map((u) => {
                      const checked = allowedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleUser(u.id)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium leading-tight">{u.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {u.email}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 max-w-full">
            <IntegrationFormBuilder value={definition} onChange={setDefinition} />
          </div>
        </main>
      </div>
    </>
  );
}
