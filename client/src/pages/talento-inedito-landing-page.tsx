import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, LayoutTemplate, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { IneditoLandingSettings } from "@shared/schema";

export default function TalentoIneditoLandingPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const settingsQuery = useQuery<IneditoLandingSettings>({
    queryKey: ["/api/talento/inedito/landing"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/inedito/landing", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/talento/inedito/landing", { isEnabled });
      return res.json() as Promise<IneditoLandingSettings>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/talento/inedito/landing"], data);
      queryClient.setQueryData(["/api/inedito/landing"], { isEnabled: data.isEnabled });
      toast({
        title: data.isEnabled ? "Landing activada" : "Landing desactivada",
        description: data.isEnabled
          ? "Cualquier persona puede ver /inedito."
          : "Solo cuentas Admin y Talento pueden ver /inedito.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading || !user || user.role !== "talento") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const isEnabled = settingsQuery.data?.isEnabled ?? true;

  return (
    <>
      <Helmet>
        <title>Landing INÉDITO | Talento y Bienestar</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8">
            <p className="text-sm text-muted-foreground">
              <Link href="/talento" className="hover:text-foreground">
                Inicio
              </Link>
              {" › "}
              <Link href="/talento/inedito" className="hover:text-foreground">
                INÉDITO
              </Link>
              {" › "}
              Landing
            </p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-4xl font-bold">Landing INÉDITO</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Activa o desactiva la página pública y, más adelante, edita la información por
                  secciones.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="/inedito" target="_blank" rel="noopener noreferrer">
                  Ver landing
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="grid max-w-3xl gap-6">
            <section className="rounded-2xl border bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-lg font-semibold">Visibilidad pública</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Con la landing desactivada, `/inedito` solo es visible para cuentas{" "}
                    <strong className="text-foreground">Admin</strong> y{" "}
                    <strong className="text-foreground">Talento</strong>. El resto verá que la
                    página no está disponible.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 pt-1">
                  {settingsQuery.isLoading || saveMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => saveMutation.mutate(checked)}
                      aria-label="Activar landing pública"
                    />
                  )}
                  <Label className="text-xs text-muted-foreground">
                    {isEnabled ? "Activa" : "Desactivada"}
                  </Label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-dashed bg-card/60 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-semibold">Edición por secciones</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Pronto podrás editar textos e imágenes del hero, experiencia, beneficios,
                    proceso, FAQ y CTA desde aquí. Por ahora el contenido se mantiene en código.
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Próximamente
                  </span>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
