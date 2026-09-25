import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Download,
  Loader2,
  Pencil,
  Plus,
  QrCode as QrCodeIcon,
  Trash2,
} from "lucide-react";
import { insertQrCodeSchema, type QrCode } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";

const formSchema = insertQrCodeSchema.extend({
  name: z.string().min(1, "El nombre es requerido"),
  targetUrl: z.string().min(1, "El enlace es requerido"),
});

function resolveTargetUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${trimmed}`;
  }
  return trimmed;
}

function siteOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function shortUrlFor(code: string | null | undefined) {
  if (!code) return "";
  return `${siteOrigin()}/r/${code}`;
}

/** URL que se embede en el QR (corta o destino final). */
function encodeUrlForQr(item: Pick<QrCode, "targetUrl" | "shortCode" | "useShortUrl">) {
  if (item.useShortUrl && item.shortCode) {
    return shortUrlFor(item.shortCode);
  }
  return resolveTargetUrl(item.targetUrl);
}

function slugifyFilename(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40) || "qr"
  );
}

async function buildQrDataUrl(url: string, size = 512): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: size,
    color: { dark: "#0b1220", light: "#ffffff" },
  });
}

export default function AdminQrPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [useShortUrl, setUseShortUrl] = useState(false);
  const [editing, setEditing] = useState<QrCode | null>(null);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { data: items = [], isLoading: listLoading } = useQuery<QrCode[]>({
    queryKey: ["/api/admin/qr-codes"],
    enabled: user?.role === "admin",
    queryFn: async () => {
      const res = await fetch("/api/admin/qr-codes", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar los códigos QR");
      return res.json();
    },
  });

  const resolvedUrl = useMemo(() => resolveTargetUrl(targetUrl), [targetUrl]);

  const previewEncodeUrl = useMemo(() => {
    if (!resolvedUrl) return "";
    if (useShortUrl && editing?.shortCode) {
      return shortUrlFor(editing.shortCode);
    }
    return resolvedUrl;
  }, [resolvedUrl, useShortUrl, editing?.shortCode]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    let cancelled = false;
    if (!previewEncodeUrl) {
      setPreviewDataUrl("");
      setPreviewError(null);
      return;
    }
    void buildQrDataUrl(previewEncodeUrl, 400)
      .then((url) => {
        if (!cancelled) {
          setPreviewDataUrl(url);
          setPreviewError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewDataUrl("");
          setPreviewError("No se pudo generar el QR con ese enlace.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [previewEncodeUrl]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setTargetUrl("");
    setUseShortUrl(false);
  };

  const loadIntoForm = (item: QrCode) => {
    setEditing(item);
    setName(item.name);
    setTargetUrl(item.targetUrl);
    setUseShortUrl(Boolean(item.useShortUrl));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.safeParse({
        name: name.trim(),
        targetUrl: resolvedUrl,
        useShortUrl,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Datos inválidos");
      }
      if (editing) {
        const res = await apiRequest("PATCH", `/api/admin/qr-codes/${editing.id}`, parsed.data);
        return res.json() as Promise<QrCode>;
      }
      const res = await apiRequest("POST", "/api/admin/qr-codes", parsed.data);
      return res.json() as Promise<QrCode>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qr-codes"] });
      toast({ title: editing ? "QR actualizado" : "QR guardado" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/qr-codes/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qr-codes"] });
      toast({ title: "QR eliminado" });
      setToDelete(null);
      if (editing?.id === id) resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  const downloadPng = async (label: string, url: string) => {
    try {
      const dataUrl = await buildQrDataUrl(url, 512);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${slugifyFilename(label)}.png`;
      link.click();
    } catch {
      toast({
        title: "No se pudo descargar",
        description: "Revisa que el enlace sea válido.",
        variant: "destructive",
      });
    }
  };

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
        <title>Códigos QR | Ecosistema WCA</title>
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
                Códigos QR
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Códigos QR</h1>
              <p className="mt-2 text-muted-foreground">
                Genera QR propios que apuntan directo al enlace que elijas (formularios, páginas o
                URLs externas), sin servicios de terceros.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
            <Card className="flex h-full min-w-0 flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editing ? "Editar código" : "Nuevo código"}
                </CardTitle>
                <CardDescription>
                  Usa una URL completa o una ruta de nuestro sitio web como{" "}
                  <code className="rounded bg-muted px-1 text-xs">/f/mi-formulario</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                <div>
                  <Label htmlFor="qr-name">Nombre</Label>
                  <Input
                    id="qr-name"
                    className="mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Formulario de integración"
                  />
                </div>
                <div>
                  <Label htmlFor="qr-url">Enlace</Label>
                  <Input
                    id="qr-url"
                    className="mt-1"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://… o /f/slug"
                  />
                  {resolvedUrl && resolvedUrl !== targetUrl.trim() && (
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      Destino: {resolvedUrl}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <div className="min-w-0">
                    <Label htmlFor="qr-short" className="text-sm font-medium">
                      Generar con enlace acortado
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      El QR usa un enlace corto nuestro (
                      <code className="text-[10px]">/r/…</code>) que redirige al destino.
                    </p>
                  </div>
                  <Switch
                    id="qr-short"
                    checked={useShortUrl}
                    onCheckedChange={setUseShortUrl}
                  />
                </div>
                {useShortUrl && (
                  <p className="break-all text-xs text-muted-foreground">
                    {editing?.shortCode
                      ? `Se codificará: ${shortUrlFor(editing.shortCode)}`
                      : "Al guardar se asignará el enlace corto en el QR."}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Button
                    className="shrink-0 bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !name.trim() || !resolvedUrl}
                  >
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editing ? "Actualizar" : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={!previewEncodeUrl || Boolean(previewError)}
                    onClick={() => downloadPng(name || "qr", previewEncodeUrl)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PNG
                  </Button>
                  {editing && (
                    <Button type="button" variant="ghost" className="shrink-0" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="flex h-full min-w-0 flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCodeIcon className="h-5 w-5" />
                  Vista previa
                </CardTitle>
                <CardDescription>Se actualiza al cambiar el enlace.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 items-center justify-center py-6">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Vista previa del código QR"
                    className="h-64 w-64 rounded-xl border bg-white p-3 sm:h-72 sm:w-72"
                  />
                ) : (
                  <p className="px-4 text-center text-sm text-muted-foreground">
                    {previewError || "Escribe un enlace para ver el código QR."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              <CardHeader className="shrink-0">
                <CardTitle>Guardados</CardTitle>
                <CardDescription>
                  {items.length} código{items.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
                {listLoading ? (
                  <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    Cargando…
                  </p>
                ) : items.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    Aún no hay códigos QR guardados.
                  </p>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {items.map((item) => {
                      const encoded = encodeUrlForQr(item);
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.name || "Sin nombre"}</p>
                            <p className="truncate text-xs text-muted-foreground">{encoded}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => loadIntoForm(item)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => downloadPng(item.name, encoded)}
                            >
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                              PNG
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setToDelete(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={toDelete != null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar código QR</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El archivo PNG descargado antes seguirá existiendo
              en tu dispositivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => toDelete != null && deleteMutation.mutate(toDelete)}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
