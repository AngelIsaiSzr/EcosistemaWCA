import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Copy,
  ExternalLink,
  FlaskConical,
  Loader2,
  Mail,
  Save,
  ShieldBan,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IneditoRetoSettings } from "@shared/schema";

type TokenRow = {
  id: number;
  token: string;
  email: string;
  status: string;
  isTest: boolean;
  expiresAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  url: string;
};

type TokensResponse = {
  tokens: TokenRow[];
  counts: Record<string, number>;
};

function looksLikeGoogleDrive(url: string) {
  return /drive\.google\.com|docs\.google\.com/i.test(url);
}

export default function TalentoIneditoRetoPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState("");
  const [linkTtlHours, setLinkTtlHours] = useState(168);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [massEmails, setMassEmails] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const settingsQuery = useQuery<IneditoRetoSettings>({
    queryKey: ["/api/talento/reto/settings"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/reto/settings", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      return res.json();
    },
  });

  useEffect(() => {
    if (!settingsQuery.data || settingsHydrated) return;
    setVideoUrl(settingsQuery.data.videoUrl ?? "");
    setEmailSubject(settingsQuery.data.emailSubject ?? "");
    setEmailBodyText(settingsQuery.data.emailBodyText ?? "");
    setEmailBodyHtml(settingsQuery.data.emailBodyHtml ?? "");
    setLinkTtlHours(settingsQuery.data.linkTtlHours ?? 168);
    setSettingsHydrated(true);
  }, [settingsQuery.data, settingsHydrated]);

  const tokensQuery = useQuery<TokensResponse>({
    queryKey: ["/api/talento/reto/tokens"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/reto/tokens?limit=60", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar los enlaces");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/talento/reto/settings", {
        videoUrl,
        emailSubject,
        emailBodyText,
        emailBodyHtml,
        linkTtlHours,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/settings"] });
      toast({ title: "Configuración guardada" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/talento/reto/test-link", {
        email: testEmail.trim() || undefined,
      });
      return res.json() as Promise<TokenRow>;
    },
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      try {
        await navigator.clipboard.writeText(created.url);
        toast({
          title: "Enlace de prueba creado",
          description: "Copiado al portapapeles. Ábrelo en una pestaña privada para probar.",
        });
      } catch {
        toast({ title: "Enlace de prueba creado", description: created.url });
      }
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo crear", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const emails = massEmails
        .split(/[\n,;]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      const res = await apiRequest("POST", "/api/talento/reto/send", { emails, dryRun });
      return res.json() as Promise<{
        dryRun: boolean;
        sent: number;
        failed: number;
        results: Array<{ email: string; ok: boolean; url?: string; error?: string }>;
      }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      toast({
        title: data.dryRun ? "Simulación lista" : "Envío completado",
        description: `${data.sent} ok · ${data.failed} fallidos`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error en envío", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/talento/reto/tokens/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/reto/tokens"] });
      toast({ title: "Enlace revocado" });
    },
  });

  const emailCount = useMemo(
    () =>
      [
        ...new Set(
          massEmails
            .split(/[\n,;]+/)
            .map((e) => e.trim().toLowerCase())
            .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
        ),
      ].length,
    [massEmails],
  );

  if (isLoading || !user || user.role !== "talento") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const driveWarning = looksLikeGoogleDrive(videoUrl);

  return (
    <>
      <Helmet>
        <title>Reto INÉDITO | Talento y Bienestar</title>
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
              Reto INÉDITO
            </p>
            <h1 className="mt-1 font-heading text-4xl font-bold">Reto INÉDITO</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Segunda etapa de selección de WCA | INÉDITO: enlaces personales, temporales y de un
              solo uso para el vídeo del reto.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <h2 className="font-heading text-lg font-semibold">Vídeo y vigencia</h2>
                <div className="space-y-2">
                  <Label>URL del vídeo (mp4 / webm / https directo)</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://…/reto.mp4 o /media/reto.mp4"
                  />
                  {driveWarning ? (
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Google Drive no es fiable aquí: el reproductor no controla bien el “fin del
                      vídeo”, los enlaces de descarga caducan y no se puede forzar un solo uso.
                      Sube un MP4 a <code>/media</code>, tu CDN o un host de vídeo directo.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ideal: archivo MP4 en el mismo sitio (<code>/media/…</code>) o URL https
                      directa. Evita embeds de YouTube/Drive para este flujo.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Vigencia del enlace (horas)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={linkTtlHours}
                    onChange={(e) => setLinkTtlHours(Number(e.target.value) || 168)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Por defecto 168 h (7 días). Tras expirar o completar el vídeo, el enlace muere.
                  </p>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <h2 className="font-heading text-lg font-semibold">Correo masivo</h2>
                <p className="text-sm text-muted-foreground">
                  Usa <code>{"{{link}}"}</code> y <code>{"{{email}}"}</code> en el cuerpo. Cada
                  persona recibe la misma estructura con un enlace distinto.
                </p>
                <div className="space-y-2">
                  <Label>Asunto</Label>
                  <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Texto plano</Label>
                  <Textarea
                    rows={6}
                    value={emailBodyText}
                    onChange={(e) => setEmailBodyText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HTML (opcional)</Label>
                  <Textarea
                    rows={6}
                    value={emailBodyHtml}
                    onChange={(e) => setEmailBodyHtml(e.target.value)}
                  />
                </div>
                <Button
                  className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar configuración
                </Button>
              </section>

              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <h2 className="font-heading text-lg font-semibold">Envío a preseleccionados</h2>
                <div className="space-y-2">
                  <Label>Correos (uno por línea, o separados por coma)</Label>
                  <Textarea
                    rows={8}
                    value={massEmails}
                    onChange={(e) => setMassEmails(e.target.value)}
                    placeholder={"persona1@correo.com\npersona2@correo.com"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {emailCount} correo{emailCount === 1 ? "" : "s"} válido
                    {emailCount === 1 ? "" : "s"} detectado{emailCount === 1 ? "" : "s"}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={sendMutation.isPending || emailCount === 0}
                    onClick={() => sendMutation.mutate(true)}
                  >
                    Simular (sin enviar)
                  </Button>
                  <Button
                    className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                    disabled={sendMutation.isPending || emailCount === 0}
                    onClick={() => {
                      if (
                        confirm(
                          `¿Enviar ${emailCount} correo(s) con enlaces únicos de un solo uso?`,
                        )
                      ) {
                        sendMutation.mutate(false);
                      }
                    }}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Enviar masivo
                  </Button>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="space-y-4 rounded-2xl border border-dashed border-[#5b8fd4]/40 bg-card p-5">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-[#5b8fd4]" />
                  <h2 className="font-heading text-lg font-semibold">Zona de prueba</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Genera un enlace real (marcado como prueba) para verificar el flujo: un uso, fin
                  del vídeo y cierre del acceso.
                </p>
                <div className="space-y-2">
                  <Label>Email opcional (solo para la marca de agua / registro)</Label>
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="tu@correo.com"
                  />
                </div>
                <Button
                  className="w-full bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                  disabled={
                    testLinkMutation.isPending ||
                    saveMutation.isPending ||
                    !videoUrl.trim()
                  }
                  onClick={async () => {
                    try {
                      await saveMutation.mutateAsync();
                      testLinkMutation.mutate();
                    } catch {
                      /* toast ya en saveMutation */
                    }
                  }}
                >
                  {testLinkMutation.isPending || saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FlaskConical className="mr-2 h-4 w-4" />
                  )}
                  Crear enlace de prueba
                </Button>
                {!videoUrl.trim() ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Pega una URL de vídeo (MP4 directo) para poder probar.
                  </p>
                ) : null}
              </section>

              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <h2 className="font-heading text-lg font-semibold">Enlaces recientes</h2>
                {tokensQuery.isLoading ? (
                  <LoadingSpinner text="Cargando..." />
                ) : (tokensQuery.data?.tokens.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay enlaces.</p>
                ) : (
                  <div className="max-h-[32rem] space-y-2 overflow-y-auto">
                    {tokensQuery.data!.tokens.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {t.email || "(sin email)"}
                              {t.isTest ? (
                                <span className="ml-2 text-[10px] uppercase text-amber-600">
                                  prueba
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                              {t.status}
                              {t.createdAt
                                ? ` · ${new Date(t.createdAt).toLocaleString("es-MX")}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Copiar"
                              onClick={async () => {
                                await navigator.clipboard.writeText(t.url);
                                toast({ title: "Enlace copiado" });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              asChild
                            >
                              <a href={t.url} target="_blank" rel="noreferrer" title="Abrir">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            {t.status !== "completed" && t.status !== "revoked" ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                title="Revocar"
                                onClick={() => revokeMutation.mutate(t.id)}
                              >
                                <ShieldBan className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
