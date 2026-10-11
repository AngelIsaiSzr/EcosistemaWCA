import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Film,
  FolderOpen,
  Loader2,
  Plus,
  Presentation,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  AdminEditPanel,
  AdminEmptyState,
  AdminPanelBody,
  AdminPanelFooter,
  AdminPanelHeader,
  AdminPanelSection,
  AdminSearchInput,
  AdminTile,
  matchesSearch,
} from "@/components/admin/edit-panel";
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

const MATERIAL_CHIPS = [
  { key: "hasVideo", label: "Vídeo", icon: Film },
  { key: "hasSlides", label: "Slides", icon: Presentation },
  { key: "hasResources", label: "Recursos", icon: FolderOpen },
] as const;

const FORM_ID = "module-content-form";

type PendingAction = { type: "select"; id: number } | { type: "close" } | null;

export default function AdminProgramContentPage() {
  const [, params] = useRoute("/admin/programas/:slug/contenido");
  const slug = params?.slug ?? "";
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [search, setSearch] = useState("");

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

  const openModule = (id: number) => {
    if (panelOpen && id === selectedId) return;
    if (dirty) {
      setPendingAction({ type: "select", id });
      return;
    }
    setSelectedId(id);
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (dirty) {
      setPendingAction({ type: "close" });
      return;
    }
    setPanelOpen(false);
  };

  const discardAndContinue = () => {
    if (!pendingAction) return;
    if (selected) setDraft(moduleToDraft(selected));
    if (pendingAction.type === "select") {
      setSelectedId(pendingAction.id);
      setPanelOpen(true);
    } else {
      setPanelOpen(false);
    }
    setPendingAction(null);
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

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const visibleModules = sortedModules.filter((m) => matchesSearch(search, m.title, m.description));
  const readyCount = modules.filter((m) => materialStatus(m).ready).length;
  const readyPercent = modules.length ? Math.round((readyCount / modules.length) * 100) : 0;
  const learnUrl = `/programs/${course.slug}/learn`;
  const selectedIndex = selected ? sortedModules.findIndex((m) => m.id === selected.id) : -1;

  return (
    <>
      <Helmet>
        <title>Contenido · {course.title} | Admin WCA</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div
            className={cn(
              "transition-[padding] duration-300 ease-out",
              panelOpen && "lg:pr-[min(37rem,45vw)]",
            )}
          >
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  <Link href="/admin" className="hover:text-foreground">
                    Inicio
                  </Link>
                  {" › "}
                  <Link href="/admin/programas" className="hover:text-foreground">
                    Programas
                  </Link>
                  {" › "}
                  Contenido
                </p>
                <h1 className="mt-1 font-heading text-4xl font-bold">Contenido del visor</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Configura el vídeo de Drive, la presentación de Google Slides y los recursos de cada clase.
                  Esto alimenta{" "}
                  <a
                    href={learnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#5b8fd4] underline-offset-2 hover:underline"
                  >
                    {learnUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <AdminSearchInput value={search} onChange={setSearch} placeholder="Buscar clase…" />
                <Button asChild className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]">
                  <a href={learnUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Abrir visor
                  </a>
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" asChild>
                  <Link href="/admin/programas">
                    <ArrowLeft className="h-4 w-4" />
                    Volver a programas
                  </Link>
                </Button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl border bg-muted">
                <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-lg font-semibold">{course.title}</p>
                <p className="text-sm text-muted-foreground">
                  {modules.length} clases · {readyCount} con material
                </p>
                <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-[#5b8fd4]"
                    initial={{ width: 0 }}
                    animate={{ width: `${readyPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
              <span className="self-start rounded-full bg-[#5b8fd4]/10 px-3 py-1 text-sm font-semibold text-[#5b8fd4] sm:self-center">
                {readyPercent}% listo
              </span>
            </motion.div>

            {modules.length === 0 ? (
              <AdminEmptyState>
                <Film className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-foreground">Este programa aún no tiene módulos</p>
                <p className="mx-auto mt-1 max-w-md">
                  Crea los módulos desde la pestaña “Módulos” del programa y vuelve aquí para pegar los enlaces de
                  cada clase.
                </p>
                <Button asChild variant="outline" className="mt-4 rounded-xl">
                  <Link href="/admin/programas">Ir a programas</Link>
                </Button>
              </AdminEmptyState>
            ) : visibleModules.length === 0 ? (
              <AdminEmptyState>No hay clases que coincidan con tu búsqueda.</AdminEmptyState>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Da clic en una clase para editar sus enlaces.
                </p>
                <motion.div
                  layout
                  className={cn(
                    "grid grid-cols-1 gap-3 sm:grid-cols-2",
                    panelOpen ? "xl:grid-cols-2 2xl:grid-cols-3" : "lg:grid-cols-3 2xl:grid-cols-4",
                  )}
                >
                  <AnimatePresence>
                    {visibleModules.map((m, i) => {
                      const status = materialStatus(m);
                      const number = sortedModules.indexOf(m) + 1;
                      return (
                        <AdminTile
                          key={m.id}
                          index={i}
                          selected={panelOpen && m.id === selectedId}
                          onClick={() => openModule(m.id)}
                          className="flex flex-col gap-3 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                                status.ready
                                  ? "bg-[#5b8fd4] text-white"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {number}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 font-medium leading-snug">{m.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {m.duration}h · {m.difficulty}
                              </p>
                            </div>
                            {status.ready && (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {MATERIAL_CHIPS.map(({ key, label, icon: Icon }) => {
                              const on = status[key];
                              return (
                                <span
                                  key={key}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                                    on
                                      ? "bg-[#5b8fd4]/[0.12] text-[#5b8fd4] ring-1 ring-[#5b8fd4]/25"
                                      : "bg-muted/60 text-muted-foreground/70",
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                  {key === "hasVideo" && on && status.parts > 1 ? `${label} (${status.parts})` : label}
                                </span>
                              );
                            })}
                          </div>
                        </AdminTile>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </>
            )}
          </div>
        </main>
      </div>

      <AdminEditPanel open={panelOpen && !!selected} onClose={closePanel} widthClass="lg:w-[min(36rem,43vw)]">
        {selected && draft ? (
          <>
            <AdminPanelHeader
              media={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5b8fd4] text-sm font-semibold text-white">
                  {selectedIndex + 1}
                </span>
              }
              title={selected.title || "Clase sin título"}
              subtitle={`Orden ${selected.order} · ${selected.duration}h · ${selected.difficulty}`}
              onClose={closePanel}
              actions={[
                {
                  label: "Abrir visor",
                  icon: ExternalLink,
                  onClick: () => window.open(learnUrl, "_blank", "noopener,noreferrer"),
                },
              ]}
            />
            <AdminPanelBody contentKey={selected.id}>
              <form
                id={FORM_ID}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (dirty) saveMutation.mutate();
                }}
                className="space-y-5"
              >
                <AdminPanelSection title="Clase">
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
                      className="min-h-[88px]"
                    />
                  </div>
                </AdminPanelSection>

                <AdminPanelSection
                  title="Grabaciones de la clase"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVideoPart}
                      className="h-7 rounded-lg px-2.5 text-xs"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Añadir parte
                    </Button>
                  }
                >
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Si la clase se cortó en varias tomas, agrega una parte por cada enlace de Drive.
                  </p>
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {draft.videoParts.map((part, index) => (
                        <motion.div
                          key={`video-part-${index}`}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 rounded-2xl border bg-muted/20 p-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Film className="h-3.5 w-3.5 text-[#5b8fd4]" />
                                Grabación {index + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeVideoPart(index)}
                                aria-label={`Quitar parte ${index + 1}`}
                                disabled={draft.videoParts.length === 1 && !part.url.trim()}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                              <div className="space-y-1.5">
                                <Label htmlFor={`video-label-${index}`}>Etiqueta</Label>
                                <Input
                                  id={`video-label-${index}`}
                                  placeholder={`Parte ${index + 1}`}
                                  value={part.label}
                                  onChange={(e) => updateVideoPart(index, { label: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor={`video-url-${index}`}>Enlace (Drive o MP4)</Label>
                                <Input
                                  id={`video-url-${index}`}
                                  placeholder="https://drive.google.com/file/d/…/view"
                                  value={part.url}
                                  onChange={(e) => updateVideoPart(index, { url: e.target.value })}
                                />
                              </div>
                            </div>
                            <UrlHint url={part.url} kind="video" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </AdminPanelSection>

                <AdminPanelSection title="Presentación (Google Slides)">
                  <div className="space-y-2">
                    <Label htmlFor="presentationUrl" className="inline-flex items-center gap-1.5">
                      <Presentation className="h-3.5 w-3.5 text-[#5b8fd4]" />
                      Enlace de Google Slides
                    </Label>
                    <Input
                      id="presentationUrl"
                      placeholder="https://docs.google.com/presentation/d/…/edit"
                      value={draft.presentationUrl}
                      onChange={(e) => setDraft({ ...draft, presentationUrl: e.target.value })}
                    />
                    <UrlHint url={draft.presentationUrl} kind="slides" />
                  </div>
                </AdminPanelSection>

                <AdminPanelSection title="Recursos">
                  <div className="space-y-2">
                    <Label htmlFor="resourcesUrl" className="inline-flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5 text-[#5b8fd4]" />
                      Carpeta Drive o link de descarga
                    </Label>
                    <Input
                      id="resourcesUrl"
                      placeholder="https://drive.google.com/drive/folders/…"
                      value={draft.resourcesUrl}
                      onChange={(e) => setDraft({ ...draft, resourcesUrl: e.target.value })}
                    />
                    <UrlHint url={draft.resourcesUrl} kind="folder" />
                  </div>
                </AdminPanelSection>
              </form>
            </AdminPanelBody>
            <AnimatePresence initial={false}>
              {dirty && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-5 text-xs text-amber-600 dark:text-amber-400"
                >
                  <span className="block pb-2">Hay cambios sin guardar en esta clase.</span>
                </motion.p>
              )}
            </AnimatePresence>
            <AdminPanelFooter
              onCancel={closePanel}
              formId={FORM_ID}
              pending={saveMutation.isPending}
              disabled={!dirty}
              submitLabel="Guardar clase"
            />
          </>
        ) : null}
      </AdminEditPanel>

      <ConfirmDialog
        open={pendingAction != null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Cambios sin guardar"
        description={
          pendingAction?.type === "close"
            ? "Tienes cambios sin guardar en esta clase. Si cierras ahora, se perderán."
            : "Tienes cambios sin guardar en esta clase. Si cambias de clase ahora, se perderán."
        }
        confirmLabel="Descartar cambios"
        destructive
        onConfirm={discardAndContinue}
      />
    </>
  );
}
