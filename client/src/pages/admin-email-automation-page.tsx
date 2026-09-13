import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, Pencil, Send, Trash2 } from "lucide-react";
import type {
  EmailAutomationLog,
  EmailAutomationSettings,
  EmailWeekTemplate,
} from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AutomationPayload = {
  settings: EmailAutomationSettings;
  templates: EmailWeekTemplate[];
  logs: EmailAutomationLog[];
  stats: { officialSent: number };
  preview: {
    today: string;
    timezone: string;
    dueToday: { id: number; label: string; sendDate: string | null } | null;
    next: { id: number; label: string; sendDate: string | null } | null;
  };
};

function formatDateMx(iso: string | null | undefined) {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminEmailAutomationPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [recipientsText, setRecipientsText] = useState("");
  const [sendHour, setSendHour] = useState(9);
  const [enabled, setEnabled] = useState(false);

  const [editing, setEditing] = useState<EmailWeekTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    label: "",
    sendDate: "",
    subject: "",
    bodyText: "",
    bodyHtml: "",
    enabled: true,
  });
  const [testEmail, setTestEmail] = useState("");
  const [testTemplateId, setTestTemplateId] = useState<number | null>(null);

  const { data, isLoading: loadingData } = useQuery<AutomationPayload>({
    queryKey: ["/api/admin/email-automation"],
    enabled: user?.role === "admin",
    queryFn: async () => {
      const res = await fetch("/api/admin/email-automation", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar");
      return res.json();
    },
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!data?.settings) return;
    setEnabled(data.settings.enabled);
    setRecipientsText((data.settings.recipients ?? []).join("\n"));
    setSendHour(data.settings.sendHour);
    if (!testEmail && user?.email) setTestEmail(user.email);
  }, [data?.settings, testEmail, user?.email]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/admin/email-automation/settings", {
        enabled,
        recipients: recipientsText,
        sendHour,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Guardado", description: "Configuración de automatización actualizada." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const res = await apiRequest(
        "PATCH",
        `/api/admin/email-automation/templates/${editing.id}`,
        {
          ...editForm,
          sendDate: editForm.sendDate || null,
        },
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Plantilla actualizada" });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!testTemplateId) throw new Error("Elige una plantilla");
      const res = await apiRequest("POST", "/api/admin/email-automation/test", {
        templateId: testTemplateId,
        to: testEmail || undefined,
      });
      return res.json();
    },
    onSuccess: (result: {
      recipients?: string[];
      status?: string;
      results?: Array<{ to: string; ok: boolean; error?: string }>;
      message?: string;
    }) => {
      const failed = (result.results ?? []).filter((r) => !r.ok);
      toast({
        title: failed.length ? "Envío parcial" : "Correo de prueba enviado",
        description: failed.length
          ? failed.map((f) => `${f.to}: ${f.error ?? "falló"}`).join(" · ")
          : `Enviado a ${(result.recipients ?? []).join(", ")}. Si es @tec.mx, revisa spam/cuarentena.`,
        variant: failed.length ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/email-automation/logs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Prueba eliminada del historial" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const templates = data?.templates ?? [];
  const logs = data?.logs ?? [];

  const scheduleHint = useMemo(() => {
    if (data?.preview?.dueToday) {
      return `Hoy toca: ${data.preview.dueToday.label} (${formatDateMx(data.preview.dueToday.sendDate)})`;
    }
    if (data?.preview?.next) {
      return `Próximo: ${data.preview.next.label} · ${formatDateMx(data.preview.next.sendDate)}`;
    }
    return "No hay envíos próximos con fecha configurada";
  }, [data?.preview]);

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
        <title>Automatización de correos | Ecosistema WCA</title>
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
                Automatización de correos
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Automatización de correos</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Recordatorios a directores desde contacto@ecosistemawca.com. Cada plantilla tiene su
                propia fecha (Semana Tec, semanas del periodo y cierre de semestre).
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
            </Button>
          </div>

          {loadingData ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <section className="space-y-6">
                <div className="rounded-2xl border bg-card p-5 md:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-lg font-semibold">Configuración</h2>
                      <p className="text-sm text-muted-foreground">
                        Zona horaria: {data?.preview.timezone ?? "America/Mexico_City"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enabled" className="text-sm">
                        Activo
                      </Label>
                      <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="recipients">Correos de directores</Label>
                      <Textarea
                        id="recipients"
                        rows={4}
                        value={recipientsText}
                        onChange={(e) => setRecipientsText(e.target.value)}
                        placeholder={"nombre@tec.mx\notro@gmail.com"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Uno por línea. Se envía un correo individual a cada destinatario (mejor
                        entrega a @tec.mx).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sendHour">Hora de envío (0–23)</Label>
                      <Input
                        id="sendHour"
                        type="number"
                        min={0}
                        max={23}
                        value={sendHour}
                        onChange={(e) => setSendHour(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hoy (CDMX)</Label>
                      <Input value={data?.preview.today ?? ""} readOnly />
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm">
                    {scheduleHint}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                      onClick={() => saveSettingsMutation.mutate()}
                      disabled={saveSettingsMutation.isPending}
                    >
                      {saveSettingsMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Guardar configuración
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-5 md:p-6">
                  <h2 className="font-heading text-lg font-semibold">Plantillas y fechas</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Edita etiqueta, fecha de envío, asunto y cuerpo. El cierre de este periodo:
                    lunes 7 de diciembre 2026.
                  </p>
                  <div className="mt-4 space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                          !template.enabled && "opacity-60",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {template.weekIndex}. {template.label}
                            </p>
                            <Badge variant="outline">{formatDateMx(template.sendDate)}</Badge>
                            {!template.enabled && <Badge variant="outline">Desactivada</Badge>}
                            {data?.preview.dueToday?.id === template.id && (
                              <Badge className="bg-[#5b8fd4] hover:bg-[#5b8fd4]">Hoy</Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {template.subject}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setEditing(template);
                            setEditForm({
                              label: template.label,
                              sendDate: template.sendDate ?? "",
                              subject: template.subject,
                              bodyText: template.bodyText,
                              bodyHtml: template.bodyHtml,
                              enabled: template.enabled,
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-2xl border bg-card p-5 md:p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-[#5b8fd4]" />
                    <h2 className="font-heading text-lg font-semibold">Enviar prueba</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Plantilla</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={testTemplateId ?? ""}
                        onChange={(e) =>
                          setTestTemplateId(e.target.value ? Number(e.target.value) : null)
                        }
                      >
                        <option value="">Selecciona una semana…</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.weekIndex}. {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="testEmail">Correo de prueba</Label>
                      <Input
                        id="testEmail"
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="correo@tec.mx"
                      />
                      <p className="text-xs text-muted-foreground">
                        Usa un solo correo. Los @tec.mx a veces llegan a spam o cuarentena del Tec.
                      </p>
                    </div>
                    <Button
                      className="w-full gap-2 bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                      disabled={testMutation.isPending || !testTemplateId}
                      onClick={() => testMutation.mutate()}
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Enviar correo de prueba
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-5 md:p-6">
                  <h2 className="font-heading text-lg font-semibold">Historial reciente</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Oficiales enviados:{" "}
                    <span className="font-medium text-foreground">
                      {data?.stats.officialSent ?? 0}
                    </span>
                    . Las pruebas se pueden borrar.
                  </p>
                  <div className="mt-4 space-y-3">
                    {logs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aún no hay envíos registrados.</p>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="rounded-xl border px-3 py-2.5 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                              {log.kind === "test"
                                ? "Prueba"
                                : log.kind === "weekly"
                                  ? "Oficial"
                                  : log.kind}
                              {log.sendDate ? ` · ${formatDateMx(log.sendDate)}` : ""}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={
                                  log.status === "sent"
                                    ? "default"
                                    : log.status === "partial"
                                      ? "outline"
                                      : "destructive"
                                }
                                className={
                                  log.status === "sent" ? "bg-emerald-600 hover:bg-emerald-600" : undefined
                                }
                              >
                                {log.status === "sent"
                                  ? "Enviado"
                                  : log.status === "partial"
                                    ? "Parcial"
                                    : "Error"}
                              </Badge>
                              {log.kind === "test" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteLogMutation.mutate(log.id)}
                                  disabled={deleteLogMutation.isPending}
                                  aria-label="Eliminar prueba"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 line-clamp-1 text-muted-foreground">{log.subject}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString("es-MX")
                              : ""}{" "}
                            · {(log.recipients ?? []).join(", ")}
                          </p>
                          {log.errorMessage && (
                            <p className="mt-1 text-xs text-destructive">{log.errorMessage}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Editar · {editing ? `${editing.weekIndex}. ${editing.label}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Plantilla activa</Label>
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, enabled: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <Input
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de envío</Label>
              <Input
                type="date"
                value={editForm.sendDate}
                onChange={(e) => setEditForm((f) => ({ ...f, sendDate: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Se envía ese día (CDMX) a partir de la hora configurada.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cuerpo (texto)</Label>
              <Textarea
                rows={8}
                value={editForm.bodyText}
                onChange={(e) => setEditForm((f) => ({ ...f, bodyText: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cuerpo (HTML)</Label>
              <Textarea
                rows={8}
                value={editForm.bodyHtml}
                onChange={(e) => setEditForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
              onClick={() => saveTemplateMutation.mutate()}
              disabled={saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
