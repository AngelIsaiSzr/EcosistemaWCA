import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navbar from "@/components/layout/navbar";
import { IntegrationFormBuilder } from "@/components/talento/form-builder";
import {
  DEFAULT_INTEGRATION_FORM,
  DEFAULT_INTEGRATION_SLUG,
  IntegrationFormDefinition,
} from "@shared/integration-form";
import { IntegrationForm } from "@shared/schema";

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
  const [definition, setDefinition] = useState<IntegrationFormDefinition>(DEFAULT_INTEGRATION_FORM);
  const isOfficial = formSlug === DEFAULT_INTEGRATION_SLUG;

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
    setDefinition((form.schema as IntegrationFormDefinition) ?? DEFAULT_INTEGRATION_FORM);
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/talento/forms/${encodeURIComponent(formSlug)}`, {
        title,
        slug: isOfficial ? DEFAULT_INTEGRATION_SLUG : slug,
        isPublished: published,
        schema: { ...definition, title: definition.title || title },
      });
      return res.json() as Promise<IntegrationForm>;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integration/public"] });
      toast({ title: "Formulario guardado" });
      if (updated?.slug && updated.slug !== formSlug) {
        navigate(`/talento/${updated.slug}/editar`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

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
          <Link href="/talento">Volver</Link>
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
        <main className="container mx-auto max-w-full px-4 pb-16 pt-24">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link
                href={`/talento/${formSlug}`}
                className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
              <h1 className="font-heading text-2xl font-bold sm:text-3xl">Editar formulario</h1>
              <p className="mt-1 break-words text-sm text-muted-foreground sm:text-base">
                Arrastra preguntas entre secciones, edita textos y configura la apariencia. Al guardar, la tabla de respuestas y la plantilla CSV siguen el nuevo orden.
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
                disabled={isOfficial}
              />
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {typeof window !== "undefined" ? window.location.origin : ""}
                {!slug || slug === DEFAULT_INTEGRATION_SLUG ? "/integracion" : `/f/${slug}`}
                {isOfficial ? " · enlace fijo de integración" : ""}
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

          <div className="min-w-0 max-w-full">
            <IntegrationFormBuilder value={definition} onChange={setDefinition} />
          </div>
        </main>
      </div>
    </>
  );
}
