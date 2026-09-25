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

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedUrl) {
      setPreviewDataUrl("");
      setPreviewError(null);
      return;
    }
    void buildQrDataUrl(resolvedUrl, 280)
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
  }, [resolvedUrl]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setTargetUrl("");
  };

  const loadIntoForm = (item: QrCode) => {
    setEditing(item);
    setName(item.name);
    setTargetUrl(item.targetUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.safeParse({
        name: name.trim(),
        targetUrl: resolvedUrl,
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
      const dataUrl = await buildQrDataUrl(resolveTargetUrl(url), 512);
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
        <title>Códigos QR | Administración</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 pb-16 pt-24">
          <div className="mb-8">
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Administración
            </Link>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">Códigos QR</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Genera QR propios que apuntan directo al enlace que elijas (formularios, páginas o URLs
              externas), sin servicios de terceros.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editing ? "Editar código" : "Nuevo código"}
                </CardTitle>
                <CardDescription>
                  Usa una URL completa o una ruta del sitio como{" "}
                  <code className="rounded bg-muted px-1 text-xs">/f/mi-formulario</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      Se codificará: {resolvedUrl}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !name.trim() || !resolvedUrl}
                  >
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editing ? "Actualizar" : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!resolvedUrl || Boolean(previewError)}
                    onClick={() => downloadPng(name || "qr", resolvedUrl)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PNG
                  </Button>
                  {editing && (
                    <Button type="button" variant="ghost" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCodeIcon className="h-5 w-5" />
                  Vista previa
                </CardTitle>
                <CardDescription>Se actualiza al cambiar el enlace.</CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-[280px] items-center justify-center">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Vista previa del código QR"
                    className="h-64 w-64 rounded-xl border bg-white p-3"
                  />
                ) : (
                  <p className="px-4 text-center text-sm text-muted-foreground">
                    {previewError || "Escribe un enlace para ver el código QR."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Guardados</CardTitle>
              <CardDescription>
                {items.length} código{items.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aún no hay códigos QR guardados.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.name || "Sin nombre"}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.targetUrl}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1">
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
                          onClick={() => downloadPng(item.name, item.targetUrl)}
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
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
