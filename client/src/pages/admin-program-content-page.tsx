import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Film,
  FolderOpen,
  Loader2,
  Plus,
  Presentation,
  Save,
  Trash2,
} from "lucide-react";
import { Course, Module } from "@shared/schema";
import { isGoogleDriveUrl, isGoogleSlidesUrl } from "@shared/drive-media";
import {
  moduleHasVideo,
  resolveModuleVideoParts,
  serializeModuleVideoParts,
  type ModuleVideoPart,
} from "@shared/module-videos";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

type Draft = {
  title: string;
  description: string;
  videoParts: ModuleVideoPart[];
  presentationUrl: string;
  resourcesUrl: string;
};

function moduleToDraft(m: Module): Draft {
  const parts = resolveModuleVideoParts(m);
  return {
    title: m.title ?? "",
    description: m.description ?? "",
    videoParts: parts.length > 0 ? parts : [{ label: "Parte 1", url: "" }],
    presentationUrl: m.presentationUrl ?? "",
    resourcesUrl: m.resourcesUrl ?? "",
  };
}

function partsEqual(a: ModuleVideoPart[], b: ModuleVideoPart[]) {
  const sa = serializeModuleVideoParts(a);
  const sb = serializeModuleVideoParts(b);
  return JSON.stringify(sa.videoParts) === JSON.stringify(sb.videoParts);
}

function UrlHint({ url, kind }: { url: string; kind: "video" | "slides" | "folder" }) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (kind === "slides") {
    if (isGoogleSlidesUrl(trimmed)) {
      return (
        <p className="text-xs text-muted-foreground mt-1.5">
          Google Slides detectado - se embeberá en el visor. Compártela como “Cualquier persona
          con el enlace”.
        </p>
      );
    }
    return (
      <p className="text-xs text-muted-foreground mt-1.5">
        Pega el enlace de la presentación de Google (docs.google.com/presentation/…).
      </p>
    );
  }

  if (kind === "video" && isGoogleDriveUrl(trimmed)) {
    return (
      <p className="text-xs text-muted-foreground mt-1.5">
        Drive detectado. Debe estar en “Cualquier persona con el enlace”. Si Drive dice “falla
        temporal”, suele ser el procesamiento del vídeo: ábrelo una vez en Drive y vuelve a
        intentar.
      </p>
    );
  }

  if (kind === "folder" && isGoogleDriveUrl(trimmed)) {
    return (
      <p className="text-xs text-muted-foreground mt-1.5">
        Carpeta/archivo de Drive detectado. Comparte con “Cualquier persona con el enlace”.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {kind === "video"
        ? "Se usará como vídeo directo o enlace externo."
        : "Se abrirá el enlace de recursos en una pestaña nueva."}
    </p>
  );
}

function materialStatus(m: Module) {
  const hasVideo = moduleHasVideo(m);
  const hasSlides = !!(m.presentationUrl || "").trim();
  const hasResources = !!(m.resourcesUrl || "").trim();
  const parts = resolveModuleVideoParts(m).length;
  const count = [hasVideo, hasSlides, hasResources].filter(Boolean).length;
  return { hasVideo, hasSlides, hasResources, parts, count, ready: count > 0 };
}

export default function AdminProgramContentPage() {
  const [, params] = useRoute("/admin/programas/:slug/contenido");
  const slug = params?.slug ?? "";
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: courses, isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/programs"],
  });

  const course = useMemo(
    () => courses?.find((c) => c.slug === slug),
    [courses, slug],
  );

  const courseId = course?.id;

  const {
    data: modules = [],
    isLoading: loadingModules,
  } = useQuery<Module[]>({
    queryKey: [`/api/programs/${courseId}/modules`],
    enabled: !!courseId,
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
  }, [
    selected?.id,
    selected?.videoUrl,
    selected?.videoParts,
    selected?.presentationUrl,
    selected?.resourcesUrl,
    selected?.title,
    selected?.description,
  ]);

  const dirty =
    !!selected &&
    !!draft &&
    (draft.title !== (selected.title ?? "") ||
      draft.description !== (selected.description ?? "") ||
      !partsEqual(draft.videoParts, resolveModuleVideoParts(selected)) ||
      draft.presentationUrl !== (selected.presentationUrl ?? "") ||
      draft.resourcesUrl !== (selected.resourcesUrl ?? ""));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !draft) throw new Error("Sin módulo");
      const { videoParts, videoUrl } = serializeModuleVideoParts(draft.videoParts);
      const res = await apiRequest("PATCH", `/api/modules/${selected.id}`, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        videoUrl,
        videoParts,
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

  const updateVideoPart = (index: number, patch: Partial<ModuleVideoPart>) => {
    if (!draft) return;
    const videoParts = draft.videoParts.map((part, i) =>
      i === index ? { ...part, ...patch } : part,
    );
    setDraft({ ...draft, videoParts });
  };

  const addVideoPart = () => {
    if (!draft) return;
    const n = draft.videoParts.length + 1;
    setDraft({
      ...draft,
      videoParts: [...draft.videoParts, { label: `Parte ${n}`, url: "" }],
    });
  };

  const removeVideoPart = (index: number) => {
    if (!draft) return;
    if (draft.videoParts.length <= 1) {
      setDraft({ ...draft, videoParts: [{ label: "Parte 1", url: "" }] });
      return;
    }
    setDraft({
      ...draft,
      videoParts: draft.videoParts.filter((_, i) => i !== index),
    });
  };

  if (loadingCourses || loadingModules) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando contenido..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24 flex-1 flex items-center justify-center">
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

  const readyCount = modules.filter((m) => materialStatus(m).ready).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Contenido · {course.title} | Admin WCA</title>
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 pb-16 pt-24 flex-1 max-w-6xl">
        <div className="mb-8 space-y-4">
          <Link
            href="/admin/programas"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Programas
          </Link>

          <div className="flex flex-col md:flex-row md:items-stretch gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-2xl md:text-3xl font-heading font-bold">
                Contenido del visor
              </h1>
              <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
                Configura el vídeo de Drive, la presentación de Google Slides y los recursos de
                cada clase. Esto alimenta{" "}
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

            <div className="flex items-center gap-3 rounded-xl border bg-card p-3 md:p-4 shrink-0 self-start">
              <div className="w-24 h-16 rounded-lg overflow-hidden border bg-muted">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium text-sm">{course.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {modules.length} clases · {readyCount} con material
                </p>
                <Button asChild variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
                  <a
                    href={`/programs/${course.slug}/learn`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir visor
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
            <Film className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Este programa aún no tiene módulos</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Crea los módulos desde la sección “Módulos” en Programas y vuelve aquí para pegar
              los enlaces de cada clase.
            </p>
            <Button asChild variant="outline">
              <Link href="/admin/programas">Ir a programas</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
            <aside className="rounded-xl border bg-card flex flex-col overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]">
              <div className="px-4 py-3 border-b bg-muted/40 shrink-0">
                <p className="text-sm font-medium">Clases / módulos</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {modules.length} en total
                </p>
              </div>
              <div className="overflow-y-auto overscroll-contain p-2 space-y-1 max-h-[42vh] lg:max-h-none lg:flex-1">
                {modules.map((m, i) => {
                  const status = materialStatus(m);
                  const isActive = m.id === selectedId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (
                          dirty &&
                          !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")
                        ) {
                          return;
                        }
                        setSelectedId(m.id);
                      }}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2.5 transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-snug">
                          {i + 1}. {m.title}
                        </span>
                        {status.ready ? (
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0 mt-0.5",
                              isActive ? "opacity-90" : "text-green-600 dark:text-green-500",
                            )}
                          />
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isActive ? "text-primary-foreground/75" : "text-muted-foreground",
                        )}
                      >
                        {status.ready
                          ? [
                              status.hasVideo &&
                                (status.parts > 1
                                  ? `Vídeo (${status.parts})`
                                  : "Vídeo"),
                              status.hasSlides && "Slides",
                              status.hasResources && "Recursos",
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : "Sin enlaces"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="rounded-xl border bg-card overflow-hidden">
              {!draft || !selected ? (
                <p className="text-muted-foreground text-sm p-6">Selecciona una clase.</p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 md:px-6 py-4 border-b bg-muted/20">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-xl font-semibold truncate">
                        Editar clase
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Orden {selected.order} · {selected.duration}h · {selected.difficulty}
                      </p>
                    </div>
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={!dirty || saveMutation.isPending}
                      className="shrink-0"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Guardar clase
                    </Button>
                  </div>

                  <div className="p-5 md:p-6 space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={draft.title}
                          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                          id="description"
                          value={draft.description}
                          onChange={(e) =>
                            setDraft({ ...draft, description: e.target.value })
                          }
                          className="min-h-[88px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-xl border p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Film className="h-4 w-4 text-primary" />
                              Grabaciones de la clase
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Si la clase se cortó en varias tomas, agrega una parte por cada
                              enlace de Drive.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addVideoPart}
                            className="shrink-0"
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Añadir parte
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {draft.videoParts.map((part, index) => (
                            <div
                              key={`video-part-${index}`}
                              className="rounded-lg border bg-muted/20 p-3 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs text-muted-foreground">
                                  Grabación {index + 1}
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeVideoPart(index)}
                                  aria-label={`Quitar parte ${index + 1}`}
                                  disabled={
                                    draft.videoParts.length === 1 && !part.url.trim()
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                                <div className="space-y-1.5">
                                  <Label htmlFor={`video-label-${index}`}>Etiqueta</Label>
                                  <Input
                                    id={`video-label-${index}`}
                                    placeholder={`Parte ${index + 1}`}
                                    value={part.label}
                                    onChange={(e) =>
                                      updateVideoPart(index, { label: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`video-url-${index}`}>
                                    Enlace (Drive o MP4)
                                  </Label>
                                  <Input
                                    id={`video-url-${index}`}
                                    placeholder="https://drive.google.com/file/d/…/view"
                                    value={part.url}
                                    onChange={(e) =>
                                      updateVideoPart(index, { url: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                              <UrlHint url={part.url} kind="video" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Presentation className="h-4 w-4 text-primary" />
                          Presentación (Google Slides)
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="presentationUrl">
                            Enlace de Google Slides
                          </Label>
                          <Input
                            id="presentationUrl"
                            placeholder="https://docs.google.com/presentation/d/…/edit"
                            value={draft.presentationUrl}
                            onChange={(e) =>
                              setDraft({ ...draft, presentationUrl: e.target.value })
                            }
                          />
                          <UrlHint url={draft.presentationUrl} kind="slides" />
                        </div>
                      </div>

                      <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FolderOpen className="h-4 w-4 text-primary" />
                          Recursos
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resourcesUrl">
                            Carpeta Drive o link de descarga
                          </Label>
                          <Input
                            id="resourcesUrl"
                            placeholder="https://drive.google.com/drive/folders/…"
                            value={draft.resourcesUrl}
                            onChange={(e) =>
                              setDraft({ ...draft, resourcesUrl: e.target.value })
                            }
                          />
                          <UrlHint url={draft.resourcesUrl} kind="folder" />
                        </div>
                      </div>
                    </div>

                    {dirty && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Hay cambios sin guardar en esta clase.
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
