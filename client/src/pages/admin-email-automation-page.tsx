import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Pencil,
  Send,
} from "lucide-react";
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
  preview: { currentWeekIndex: number | null; timezone: string };
};

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export default function AdminEmailAutomationPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [recipientsText, setRecipientsText] = useState("");
  const [startDate, setStartDate] = useState("2026-09-14");
  const [sendHour, setSendHour] = useState(9);
  const [sendWeekday, setSendWeekday] = useState(1);
  const [enabled, setEnabled] = useState(false);

  const [editing, setEditing] = useState<EmailWeekTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    label: "",
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
    setStartDate(data.settings.startDate);
    setSendHour(data.settings.sendHour);
    setSendWeekday(data.settings.sendWeekday);
    if (!testEmail && user?.email) setTestEmail(user.email);
  }, [data?.settings, testEmail, user?.email]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/admin/email-automation/settings", {
        enabled,
        recipients: recipientsText,
        startDate,
        sendHour,
        sendWeekday,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Guardado", description: "Configuración de automatización actualizada." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation"] });
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
        editForm,
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
    onSuccess: (result: { recipients?: string[] }) => {
      toast({
        title: "Correo de prueba enviado",
        description: `Enviado a ${(result.recipients ?? []).join(", ")}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const templates = data?.templates ?? [];
  const logs = data?.logs ?? [];

  const currentLabel = useMemo(() => {
    const idx = data?.preview?.currentWeekIndex;
    if (!idx) return "Fuera de ciclo / aún no inicia";
    const t = templates.find((x) => x.weekIndex === idx);
    return t ? `${t.label} (semana ${idx})` : `Semana ${idx} (sin plantilla)`;
  }, [data?.preview?.currentWeekIndex, templates]);

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
          <div className="mb-6">
            <Button variant="ghost" size="sm" className="mb-3 gap-1.5 px-0" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
            </Button>
            <h1 className="font-heading text-3xl font-bold md:text-4xl">Automatización de correos</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Recordatorios semanales a directores desde contacto@ecosistemawca.com. Edita cada
              semana del ciclo (5 semanas + Semana Tec + cierre), destinatarios y pruebas.
            </p>
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
                        placeholder={"uno@correo.com\ndos@correo.com"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Uno por línea o separados por coma.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Inicio del ciclo</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sendHour">Hora de envío</Label>
                      <Input
                        id="sendHour"
                        type="number"
                        min={0}
                        max={23}
                        value={sendHour}
                        onChange={(e) => setSendHour(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="sendWeekday">Día de envío</Label>
                      <select
                        id="sendWeekday"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={sendWeekday}
                        onChange={(e) => setSendWeekday(Number(e.target.value))}
                      >
                        {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm">
                    Semana actual del ciclo: <span className="font-medium">{currentLabel}</span>
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
                  <h2 className="font-heading text-lg font-semibold">Plantillas por semana</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Personaliza el asunto y el cuerpo de cada correo del periodo.
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
                            {!template.enabled && <Badge variant="outline">Desactivada</Badge>}
                            {data?.preview.currentWeekIndex === template.weekIndex && (
                              <Badge className="bg-[#5b8fd4] hover:bg-[#5b8fd4]">Esta semana</Badge>
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
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="tu@correo.com"
                      />
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
                                  ? "Semanal"
                                  : log.kind}
                              {log.weekIndex != null ? ` · Semana ${log.weekIndex}` : ""}
                            </span>
                            <Badge
                              variant={log.status === "sent" ? "default" : "destructive"}
                              className={log.status === "sent" ? "bg-emerald-600" : undefined}
                            >
                              {log.status === "sent" ? "Enviado" : "Error"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-muted-foreground line-clamp-1">{log.subject}</p>
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
