import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Film,
  Loader2,
  Presentation,
  Save,
} from "lucide-react";
import { Course, Module } from "@shared/schema";
import { isGoogleDriveUrl } from "@shared/drive-media";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type Draft = {
  title: string;
  description: string;
  videoUrl: string;
  presentationUrl: string;
  resourcesUrl: string;
};

function moduleToDraft(m: Module): Draft {
  return {
    title: m.title ?? "",
    description: m.description ?? "",
    videoUrl: m.videoUrl ?? "",
    presentationUrl: m.presentationUrl ?? "",
    resourcesUrl: m.resourcesUrl ?? "",
  };
}

function UrlHint({ url, kind }: { url: string; kind: "video" | "pdf" | "folder" }) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const drive = isGoogleDriveUrl(trimmed);
  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {drive
        ? kind === "folder"
          ? "Detectado enlace de Drive (carpeta o archivo)."
          : "Detectado Google Drive — se incrustará en el visor."
        : kind === "video"
          ? "Se usará como vídeo directo o enlace externo."
          : "Se abrirá / incrustará según el tipo de archivo."}{" "}
      El archivo debe estar compartido como “Cualquier persona con el enlace”.
    </p>
  );
}

export default function AdminProgramContentPage() {
  const [, params] = useRoute("/admin/programas/:id/contenido");
  const courseId = Number(params?.id);
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: courses, isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/programs"],
  });

  const course = useMemo(
    () => courses?.find((c) => c.id === courseId),
    [courses, courseId],
  );

  const {
    data: modules = [],
    isLoading: loadingModules,
  } = useQuery<Module[]>({
    queryKey: [`/api/programs/${courseId}/modules`],
    enabled: Number.isFinite(courseId) && courseId > 0,
  });

  const selected = modules.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (modules.length > 0 && selectedId == null) {
      setSelectedId(modules[0].id);
    }
  }, [modules, selectedId]);

  useEffect(() => {
    if (selected) setDraft(moduleToDraft(selected));
    else setDraft(null);
  }, [selected?.id, selected?.videoUrl, selected?.presentationUrl, selected?.resourcesUrl, selected?.title, selected?.description]);

  const dirty =
    !!selected &&
    !!draft &&
    (draft.title !== (selected.title ?? "") ||
      draft.description !== (selected.description ?? "") ||
      draft.videoUrl !== (selected.videoUrl ?? "") ||
      draft.presentationUrl !== (selected.presentationUrl ?? "") ||
      draft.resourcesUrl !== (selected.resourcesUrl ?? ""));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !draft) throw new Error("Sin módulo");
      const res = await apiRequest("PATCH", `/api/modules/${selected.id}`, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        videoUrl: draft.videoUrl.trim(),
        presentationUrl: draft.presentationUrl.trim(),
        resourcesUrl: draft.resourcesUrl.trim(),
      });
      return res.json() as Promise<Module>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${courseId}/modules`] });
      toast({ title: "Clase actualizada", description: "Los enlaces del visor ya están guardados." });
    },
    onError: (err: Error) => {
      toast({
        title: "No se pudo guardar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (loadingCourses || loadingModules) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando contenido..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Programa no encontrado</h1>
            <Button asChild variant="outline">
              <Link href="/admin/programas">Volver a programas</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Contenido · {course.title} | Admin WCA</title>
      </Helmet>
      <Navbar />
      <main className="flex-1">
        <div className="border-b bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <Link
                  href="/admin/programas"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Programas
                </Link>
                <h1 className="text-2xl md:text-3xl font-heading font-bold truncate">
                  Contenido del visor
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl">
                  Configura vídeo (Drive), presentación PDF y recursos por cada módulo/clase.
                  Esto alimenta{" "}
                  <a
                    href={`/programs/${course.slug}/learn`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                  >
                    /programs/{course.slug}/learn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:block w-20 h-14 rounded-md overflow-hidden border">
                  <img src={course.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{modules.length} clases</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-8">
          {modules.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
              <Film className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">Este programa aún no tiene módulos</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Crea los módulos desde la sección “Módulos” en Programas y vuelve aquí para
                pegar los enlaces de cada clase.
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/programas">Ir a programas</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
              <aside className="rounded-xl border bg-card overflow-hidden lg:sticky lg:top-24">
                <div className="px-4 py-3 border-b bg-muted/40">
                  <p className="text-sm font-medium">Clases / módulos</p>
                </div>
                <ScrollArea className="max-h-[50vh] lg:max-h-[70vh]">
                  <div className="p-2 space-y-1">
                    {modules.map((m, i) => {
                      const ready = !!(m.videoUrl || m.presentationUrl || m.resourcesUrl);
                      const isActive = m.id === selectedId;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) {
                              return;
                            }
                            setSelectedId(m.id);
                          }}
                          className={cn(
                            "w-full text-left rounded-lg px-3 py-2.5 transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-snug">
                              {i + 1}. {m.title}
                            </span>
                            {ready ? (
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0 mt-0.5",
                                  isActive ? "opacity-90" : "text-green-600",
                                )}
                              />
                            ) : null}
                          </div>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                            )}
                          >
                            {ready ? "Con material" : "Sin enlaces"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </aside>

              <section className="rounded-xl border bg-card p-5 md:p-6 space-y-6">
                {!draft || !selected ? (
                  <p className="text-muted-foreground text-sm">Selecciona una clase.</p>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold">Editar clase</h2>
                        <p className="text-sm text-muted-foreground">
                          Orden {selected.order} · {selected.duration}h · {selected.difficulty}
                        </p>
                      </div>
                      <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={!dirty || saveMutation.isPending}
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Guardar clase
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Film className="h-4 w-4" />
                        Vídeo de la clase
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="videoUrl">Enlace (Google Drive o MP4)</Label>
                        <Input
                          id="videoUrl"
                          placeholder="https://drive.google.com/file/d/…/view"
                          value={draft.videoUrl}
                          onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
                        />
                        <UrlHint url={draft.videoUrl} kind="video" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Presentation className="h-4 w-4" />
                        Presentación (PDF)
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="presentationUrl">Enlace Drive / PDF</Label>
                        <Input
                          id="presentationUrl"
                          placeholder="https://drive.google.com/file/d/…/view"
                          value={draft.presentationUrl}
                          onChange={(e) =>
                            setDraft({ ...draft, presentationUrl: e.target.value })
                          }
                        />
                        <UrlHint url={draft.presentationUrl} kind="pdf" />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ExternalLink className="h-4 w-4" />
                        Recursos
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resourcesUrl">Carpeta Drive o link de descarga</Label>
                        <Input
                          id="resourcesUrl"
                          placeholder="https://drive.google.com/drive/folders/…"
                          value={draft.resourcesUrl}
                          onChange={(e) => setDraft({ ...draft, resourcesUrl: e.target.value })}
                        />
                        <UrlHint url={draft.resourcesUrl} kind="folder" />
                      </div>
                    </div>

                    {dirty && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Hay cambios sin guardar en esta clase.
                      </p>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
