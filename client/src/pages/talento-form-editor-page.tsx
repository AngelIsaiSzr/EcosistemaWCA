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
import { DEFAULT_INTEGRATION_FORM, IntegrationFormDefinition } from "@shared/integration-form";
import { IntegrationForm } from "@shared/schema";

export default function TalentoFormEditorPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("integracion");
  const [published, setPublished] = useState(true);
  const [definition, setDefinition] = useState<IntegrationFormDefinition>(DEFAULT_INTEGRATION_FORM);

  const { data: form, isLoading: formLoading } = useQuery<IntegrationForm>({
    queryKey: ["/api/talento/form"],
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
    setDefinition((form.schema as IntegrationFormDefinition) ?? DEFAULT_INTEGRATION_FORM);
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/talento/form", {
        title,
        slug,
        isPublished: published,
        schema: { ...definition, title: definition.title || title },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/form"] });
      queryClient.invalidateQueries({ queryKey: ["/api/talento/responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integration/public"] });
      toast({ title: "Formulario guardado" });
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading || !user || user.role !== "talento" || formLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando editor..." />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Editar formulario | Talento y Bienestar</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/talento" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
              <h1 className="font-heading text-3xl font-bold">Editar formulario</h1>
              <p className="mt-1 text-muted-foreground">
                Arrastra preguntas entre secciones, edita textos y configura la apariencia. Al guardar, la tabla de respuestas y la plantilla CSV siguen el nuevo orden.
              </p>
            </div>
            <Button className="bg-[#5b8fd4] hover:bg-[#4a7fc4]" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>

          <div className="mb-6 grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-3">
            <div>
              <Label>Título público</Label>
              <Input className="mt-1" value={title} onChange={(e) => { setTitle(e.target.value); setDefinition((prev) => ({ ...prev, title: e.target.value })); }} />
            </div>
            <div>
              <Label>Enlace (slug)</Label>
              <Input className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">
                {typeof window !== "undefined" ? window.location.origin : ""}
                {!slug || slug === "integracion" ? "/integracion" : `/f/${slug}`}
              </p>
            </div>
            <label className="flex items-center justify-between rounded-xl border px-4">
              <div>
                <p className="text-sm font-medium">Publicado</p>
                <p className="text-xs text-muted-foreground">Si se apaga, el enlace deja de funcionar.</p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </label>
          </div>

          <IntegrationFormBuilder value={definition} onChange={setDefinition} />
        </main>
      </div>
    </>
  );
}
