import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Course, Module, LiveCourseRegistration, ModuleProgress } from "@shared/schema";
import { resolveLessonMedia, isGoogleDriveUrl, toGoogleDrivePreviewUrl } from "@shared/drive-media";
import { resolveMediaUrl } from "@shared/media-url";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  CheckCircle,
  PlayCircle,
  FileText,
  Download,
  MessageSquare,
  AlertCircle,
  Presentation,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveCourseRegistrationForm } from "@/components/forms/LiveCourseRegistrationForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  progress: number;
  completed: boolean;
  createdAt: string | null;
}

type ModuleComment = {
  id: number;
  moduleId: number;
  userId: number;
  body: string;
  createdAt: string | null;
  userName: string;
  userImage: string | null;
};

type TabType = "description" | "presentation" | "resources" | "comments";

function LessonPlayer({ url }: { url: string }) {
  const media = resolveLessonMedia(url);

  if (media.kind === "empty") {
    return (
      <div className="aspect-video bg-primary-900 flex flex-col items-center justify-center gap-3 text-center px-6">
        <PlayCircle className="h-14 w-14 text-muted" />
        <p className="text-muted text-sm">
          Esta clase aún no tiene vídeo. El equipo lo cargará pronto.
        </p>
      </div>
    );
  }

  if (media.kind === "drive-embed" || media.kind === "iframe") {
    return (
      <div className="aspect-video bg-black">
        <iframe
          title="Contenido de la clase"
          src={media.src}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (media.kind === "video") {
    return (
      <div className="aspect-video bg-black">
        <video className="w-full h-full" controls src={media.src} poster="/media/back1-sngqjn.jpg">
          Tu navegador no soporta el elemento de video.
        </video>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-primary-900 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <PlayCircle className="h-14 w-14 text-muted" />
      <p className="text-muted text-sm">No se puede incrustar este enlace. Ábrelo en una pestaña nueva.</p>
      <Button asChild variant="outline" size="sm">
        <a href={media.src} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir vídeo
        </a>
      </Button>
    </div>
  );
}

function PresentationViewer({ url }: { url: string }) {
  const trimmed = url.trim();
  if (!trimmed) {
    return (
      <p className="text-muted text-sm">
        Todavía no hay presentación cargada para esta clase.
      </p>
    );
  }

  const embed =
    isGoogleDriveUrl(trimmed)
      ? toGoogleDrivePreviewUrl(trimmed)
      : /\.pdf(\?|$)/i.test(trimmed)
        ? trimmed
        : null;

  if (embed) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg overflow-hidden border border-primary-700 bg-black aspect-[4/3] md:aspect-video">
          <iframe title="Presentación" src={embed} className="w-full h-full border-0" allowFullScreen />
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={trimmed} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir en nueva pestaña
          </a>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild variant="outline">
      <a href={trimmed} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4 mr-2" />
        Abrir presentación
      </a>
    </Button>
  );
}

export default function ProgramLearningPage() {
  const [, params] = useRoute("/programs/:slug/learn");
  const slug = params?.slug;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [commentDraft, setCommentDraft] = useState("");
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  const {
    data: program,
    isLoading: isLoadingProgram,
  } = useQuery<Course>({
    queryKey: [`/api/programs/${slug}`],
    enabled: !!slug,
  });

  const {
    data: modules = [],
    isLoading: isLoadingModules,
  } = useQuery<Module[]>({
    queryKey: [`/api/programs/${program?.id}/modules`],
    enabled: !!program?.id,
  });

  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments,
  } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
    enabled: !!user,
  });

  const isEnrolled = enrollments.some((e) => e.courseId === program?.id);

  const {
    data: progressData,
    isLoading: isLoadingProgress,
  } = useQuery<{ modules: ModuleProgress[]; progressPercent: number }>({
    queryKey: [`/api/programs/${program?.id}/module-progress`],
    enabled: !!user && !!program?.id && isEnrolled && !(program?.isLive ?? false),
  });

  const {
    data: liveRegistrations,
    isLoading: isLoadingLiveRegistrations,
  } = useQuery<LiveCourseRegistration[]>({
    queryKey: ["/api/live-course-registrations", user?.id, program?.id],
    enabled: Boolean(user && program?.id) && (program?.isLive ?? false),
    queryFn: async () => {
      if (!user || !program?.id || !(program?.isLive ?? false)) return [];
      const response = await fetch(
        `/api/live-course-registrations?userId=${user.id}&courseId=${program.id}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Error al cargar los registros de programas en vivo.");
      const data = (await response.json()) as LiveCourseRegistration[];
      return data.filter((reg) => reg.courseId === program.id);
    },
    initialData: [],
    refetchOnMount: true,
    staleTime: 0,
  });

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? null;
  const completedIds = new Set(
    (progressData?.modules ?? []).filter((m) => m.completed).map((m) => m.moduleId),
  );
  const progressPercent = progressData?.progressPercent ?? 0;

  const {
    data: comments = [],
    isLoading: isLoadingComments,
  } = useQuery<ModuleComment[]>({
    queryKey: [`/api/modules/${activeModuleId}/comments`],
    enabled: !!activeModuleId,
  });

  useEffect(() => {
    setShowRegistrationSuccess(false);
  }, [slug]);

  useEffect(() => {
    if (modules.length > 0 && activeModuleId == null) {
      setActiveModuleId(modules[0].id);
    }
  }, [modules, activeModuleId]);

  useEffect(() => {
    setActiveTab("description");
    setCommentDraft("");
  }, [activeModuleId]);

  const progressMutation = useMutation({
    mutationFn: async ({
      moduleId,
      completed,
    }: {
      moduleId: number;
      completed: boolean;
    }) => {
      const res = await apiRequest("POST", `/api/modules/${moduleId}/progress`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/programs/${program?.id}/module-progress`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
    },
    onError: (err: Error) => {
      toast({
        title: "No se pudo actualizar el progreso",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest("POST", `/api/modules/${activeModuleId}/comments`, { body });
      return res.json();
    },
    onSuccess: () => {
      setCommentDraft("");
      queryClient.invalidateQueries({
        queryKey: [`/api/modules/${activeModuleId}/comments`],
      });
    },
    onError: (err: Error) => {
      toast({
        title: "No se pudo publicar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/modules/${activeModuleId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/modules/${activeModuleId}/comments`],
      });
    },
  });

  const hasRegisteredForLiveProgram = (liveRegistrations?.length ?? 0) > 0;
  const handleRegistrationSuccess = () => setShowRegistrationSuccess(true);

  const activeIndex = modules.findIndex((m) => m.id === activeModuleId);
  const prevModule = activeIndex > 0 ? modules[activeIndex - 1] : null;
  const nextModule =
    activeIndex >= 0 && activeIndex < modules.length - 1 ? modules[activeIndex + 1] : null;

  const isCurrentCompleted = activeModuleId != null && completedIds.has(activeModuleId);

  const handleMarkAsCompleted = () => {
    if (!activeModuleId) return;
    progressMutation.mutate({ moduleId: activeModuleId, completed: !isCurrentCompleted });
  };

  if (
    isLoadingProgram ||
    isLoadingModules ||
    isLoadingEnrollments ||
    isLoadingLiveRegistrations ||
    (isEnrolled && !(program?.isLive ?? false) && isLoadingProgress)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4 py-16 md:py-24">
          <div className="text-center max-w-md">
            <AlertCircle className="h-14 w-14 md:h-16 md:w-16 text-destructive mx-auto mb-6" />
            <h1 className="text-2xl md:text-3xl font-heading font-bold mb-3">
              Programa no encontrado
            </h1>
            <p className="text-muted mb-8">
              Lo sentimos, el programa que buscas no existe o no está disponible.
            </p>
            <Button asChild size="lg">
              <a href="/programs">Ver todos los programas</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (program.isLive) {
    if (showRegistrationSuccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-primary-900 py-12">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">¡Muchas gracias por registrarte!</h1>
            <p className="text-muted mb-4">
              Días antes de iniciar el programa se te enviará un mensaje confirmando tu asistencia
              y modalidad. Para dudas:{" "}
              <span className="font-semibold text-accent-blue">+52 784 110 0108</span>
            </p>
            <Button onClick={() => navigate("/programs")}>Regresar a Programas</Button>
          </div>
        </div>
      );
    }
    if (hasRegisteredForLiveProgram) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-primary-900 py-12">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">¡Ya estás registrado en este programa en vivo!</h1>
            <p className="text-muted mb-4">No necesitas registrarte de nuevo.</p>
            <Button onClick={() => navigate("/programs")}>Regresar a Programas</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900 py-12">
        <LiveCourseRegistrationForm
          course={program}
          onSuccessRegistration={handleRegistrationSuccess}
        />
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso denegado</h1>
          <p className="text-muted mb-4">
            Debes estar inscrito en este programa para acceder al contenido.
          </p>
          <Button asChild>
            <a href={`/programs/${program.slug}`}>Volver al programa</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 flex">
      <div
        className={cn(
          "bg-primary-800 w-80 flex-shrink-0 transition-all duration-300 fixed md:relative h-screen z-20 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && "md:w-0 md:overflow-hidden",
        )}
      >
        <div className="p-4 border-b border-primary-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hover:bg-primary-700 flex items-center gap-2 text-muted-foreground hover:text-white transition-colors shrink-0"
              >
                <a href={`/programs/${program.slug}`} aria-label="Volver al programa">
                  <i className="fa-solid fa-arrow-left text-lg" />
                </a>
              </Button>
              <div className="w-px h-6 bg-primary-700 shrink-0" />
              <h2 className="text-lg font-bold truncate">{program.title}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso del programa</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {modules.map((module, moduleIndex) => {
              const isActive = activeModuleId === module.id;
              const isCompleted = completedIds.has(module.id);
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => {
                    setActiveModuleId(module.id);
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full text-left rounded-lg p-3 flex items-start gap-3 transition-colors",
                    isActive
                      ? "bg-accent-blue text-white"
                      : "hover:bg-primary-700/70 text-foreground",
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <CheckCircle
                        className={cn("h-5 w-5", isActive ? "text-white" : "text-green-500")}
                      />
                    ) : (
                      <PlayCircle
                        className={cn("h-5 w-5", isActive ? "text-white" : "text-muted")}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", isActive && "text-white")}>
                      {moduleIndex + 1}. {module.title}
                    </p>
                    <p className={cn("text-xs mt-0.5", isActive ? "text-white/80" : "text-muted")}>
                      {module.duration}h · {module.difficulty}
                    </p>
                  </div>
                </button>
              );
            })}
            {modules.length === 0 && (
              <p className="text-sm text-muted p-3">Aún no hay clases en este programa.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col h-screen min-w-0">
        <div className="bg-primary-800 border-b border-primary-700 h-16 flex items-center px-4 sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className={cn("mr-2", sidebarOpen && "md:hidden")}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => prevModule && setActiveModuleId(prevModule.id)}
                disabled={!prevModule}
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => nextModule && setActiveModuleId(nextModule.id)}
                disabled={!nextModule}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAsCompleted}
              disabled={!activeModuleId || progressMutation.isPending}
              className={cn(
                "gap-2 shrink-0",
                isCurrentCompleted
                  ? "text-green-500 hover:text-red-500 hover:border-red-500"
                  : "hover:text-green-500 hover:border-green-500",
              )}
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isCurrentCompleted ? "Completado" : "Marcar como completado"}
              </span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {activeModule ? (
                <>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold">{activeModule.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                      <span>
                        {activeModule.duration}h · {activeModule.instructor}
                      </span>
                      {isCurrentCompleted && (
                        <span className="flex items-center gap-1.5 text-green-500">
                          <CheckCircle className="h-4 w-4" />
                          Completado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary-800 rounded-xl overflow-hidden">
                    <LessonPlayer url={activeModule.videoUrl || ""} />
                  </div>

                  <div className="bg-primary-800 rounded-xl p-4 md:p-6">
                    <Tabs
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as TabType)}
                      className="flex flex-col"
                    >
                      <TabsList className="w-full h-auto flex flex-wrap justify-start gap-1 border-b border-primary-700 rounded-none bg-transparent p-0 pb-2">
                        <TabsTrigger value="description" className="gap-2 data-[state=active]:bg-primary-700">
                          <FileText className="h-4 w-4" />
                          Descripción
                        </TabsTrigger>
                        <TabsTrigger value="presentation" className="gap-2 data-[state=active]:bg-primary-700">
                          <Presentation className="h-4 w-4" />
                          Presentación
                        </TabsTrigger>
                        <TabsTrigger value="resources" className="gap-2 data-[state=active]:bg-primary-700">
                          <Download className="h-4 w-4" />
                          Recursos
                        </TabsTrigger>
                        <TabsTrigger value="comments" className="gap-2 data-[state=active]:bg-primary-700">
                          <MessageSquare className="h-4 w-4" />
                          Comentarios
                          {comments.length > 0 && (
                            <span className="ml-1 bg-primary-700 text-xs px-1.5 py-0.5 rounded-full">
                              {comments.length}
                            </span>
                          )}
                        </TabsTrigger>
                      </TabsList>

                      {nextModule && (
                        <div className="bg-primary-900/50 p-4 rounded-lg mt-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-muted">Siguiente</p>
                            <p className="font-medium truncate">{nextModule.title}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => setActiveModuleId(nextModule.id)}
                          >
                            Continuar
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      )}

                      <TabsContent value="description" className="pt-4 mt-0">
                        <div className="prose prose-invert max-w-none">
                          <p className="text-muted whitespace-pre-wrap">
                            {activeModule.description || "Sin descripción para esta clase."}
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="presentation" className="pt-4 mt-0">
                        <PresentationViewer url={activeModule.presentationUrl || ""} />
                      </TabsContent>

                      <TabsContent value="resources" className="pt-4 mt-0">
                        {(activeModule.resourcesUrl || "").trim() ? (
                          <div className="border border-primary-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <Download className="h-5 w-5 text-muted mt-0.5 shrink-0" />
                              <div>
                                <p className="font-medium">Material de la clase</p>
                                <p className="text-sm text-muted">
                                  Carpeta o enlace de descarga en Drive / externo
                                </p>
                              </div>
                            </div>
                            <Button asChild variant="outline" size="sm" className="shrink-0">
                              <a
                                href={activeModule.resourcesUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir recursos
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted text-sm">
                            No hay recursos publicados para esta clase todavía.
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="comments" className="pt-4 mt-0 space-y-6">
                        <div className="space-y-3">
                          <Textarea
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            placeholder="Escribe tu comentario o duda..."
                            className="min-h-[96px] bg-primary-900 border-primary-700 resize-none"
                            maxLength={2000}
                          />
                          <div className="flex justify-end">
                            <Button
                              onClick={() => commentMutation.mutate(commentDraft.trim())}
                              disabled={!commentDraft.trim() || commentMutation.isPending}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Comentar
                            </Button>
                          </div>
                        </div>

                        {isLoadingComments ? (
                          <div className="py-8 flex justify-center">
                            <LoadingSpinner text="Cargando comentarios..." />
                          </div>
                        ) : comments.length === 0 ? (
                          <p className="text-muted text-sm text-center py-6">
                            Sé la primera persona en comentar esta clase.
                          </p>
                        ) : (
                          <ul className="space-y-4">
                            {comments.map((c) => (
                              <li
                                key={c.id}
                                className="border border-primary-700 rounded-lg p-4 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-8 w-8 shrink-0">
                                      <AvatarImage
                                        src={resolveMediaUrl(c.userImage) || undefined}
                                        alt={c.userName}
                                      />
                                      <AvatarFallback>
                                        {(c.userName || "?").charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{c.userName}</p>
                                      <p className="text-xs text-muted">
                                        {c.createdAt
                                          ? new Date(c.createdAt).toLocaleString("es-MX", {
                                              dateStyle: "medium",
                                              timeStyle: "short",
                                            })
                                          : ""}
                                      </p>
                                    </div>
                                  </div>
                                  {(user?.id === c.userId || user?.role === "admin") && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="shrink-0 text-muted hover:text-destructive"
                                      onClick={() => deleteCommentMutation.mutate(c.id)}
                                      aria-label="Eliminar comentario"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap pl-11">{c.body}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-primary-800 rounded-xl flex flex-col items-center justify-center gap-4">
                  <PlayCircle className="h-16 w-16 text-muted" />
                  <p className="text-muted">Selecciona una clase para comenzar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
