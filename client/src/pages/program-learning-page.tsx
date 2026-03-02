import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Course, Module, Section, LiveCourseRegistration } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Menu, CheckCircle, Lock, PlayCircle, FileText, Download, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveCourseRegistrationForm } from '@/components/forms/LiveCourseRegistrationForm';
import { useLocation } from 'wouter';
import { queryClient } from "@/lib/queryClient";
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

interface ModuleWithSections extends Module {
  sections: Section[];
}

interface SectionProgress {
  sectionId: number;
  completed: boolean;
  timestamp: string;
  videoProgress?: number;
}

type TabType = "description" | "resources" | "comments";

export default function ProgramLearningPage() {
  const [, params] = useRoute("/programs/:slug/learn");
  const slug = params?.slug;
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [completedSections, setCompletedSections] = useState<SectionProgress[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [, navigate] = useLocation();
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  useEffect(() => {
    setShowRegistrationSuccess(false);
    if (user && slug && program?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/live-course-registrations', user.id, program.id] });
    }
  }, [slug, user]);

  const {
    data: program,
    isLoading: isLoadingProgram,
  } = useQuery<Course>({
    queryKey: [`/api/programs/${slug}`],
    enabled: !!slug,
  });

  const {
    data: modules,
    isLoading: isLoadingModules,
  } = useQuery<Module[]>({
    queryKey: [`/api/programs/${program?.id}/modules`],
    enabled: !!program?.id,
  });

  const modulesWithSections = useQuery<ModuleWithSections[]>({
    queryKey: ['moduleSections', modules],
    enabled: !!modules && modules.length > 0,
    queryFn: async () => {
      const modulesWithSections = await Promise.all(
        modules!.map(async (module) => {
          const response = await fetch(`/api/modules/${module.id}/sections`);
          const sections = await response.json();
          return { ...module, sections };
        })
      );
      return modulesWithSections;
    }
  });

  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments
  } = useQuery<Enrollment[]>({
    queryKey: ['/api/enrollments'],
    enabled: !!user,
  });

  const isEnrolled = enrollments.some(enrollment => enrollment.courseId === program?.id);

  const {
    data: liveRegistrations,
    isLoading: isLoadingLiveRegistrations,
  } = useQuery<LiveCourseRegistration[]>({
    queryKey: ['/api/live-course-registrations', user?.id, program?.id],
    enabled: Boolean(user && program?.id) && (program?.isLive ?? false),
    queryFn: async () => {
      if (!user || !program?.id || !(program?.isLive ?? false)) return [];
      const response = await fetch(`/api/live-course-registrations?userId=${user.id}&courseId=${program.id}`);
      if (!response.ok) throw new Error('Error al cargar los registros de programas en vivo.');
      const data = await response.json() as LiveCourseRegistration[];
      return data.filter((reg: LiveCourseRegistration) => reg.courseId === program.id);
    },
    initialData: [],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const hasRegisteredForLiveProgram = liveRegistrations.length > 0;
  const handleRegistrationSuccess = () => setShowRegistrationSuccess(true);

  useEffect(() => {
    if (modulesWithSections.data && modulesWithSections.data.length > 0) {
      const firstModule = modulesWithSections.data[0];
      setActiveModuleId(firstModule.id);
      if (firstModule.sections?.length > 0) setActiveSectionId(firstModule.sections[0].id);
    }
  }, [modulesWithSections.data]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!program?.id || !activeSectionId) return;
      try {
        const response = await fetch(`/api/programs/${program.id}/progress`);
        const data = await response.json();
        setCompletedSections(data.completedSections || []);
        const sectionProgress = data.completedSections?.find((s: SectionProgress) => s.sectionId === activeSectionId);
        if (sectionProgress?.videoProgress) setVideoProgress(sectionProgress.videoProgress);
      } catch (error) {
        console.error("Error loading progress:", error);
      }
    };
    loadProgress();
  }, [program?.id, activeSectionId]);

  const updateVideoProgressMutation = useMutation({
    mutationFn: async ({ sectionId, videoProgress }: { sectionId: number; videoProgress: number }) => {
      await fetch(`/api/sections/${sectionId}/video-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoProgress })
      });
      return { sectionId, videoProgress };
    }
  });

  const updateCompletionMutation = useMutation({
    mutationFn: async ({ sectionId, completed }: { sectionId: number; completed: boolean }) => {
      const enrollment = enrollments.find(e => e.courseId === program?.id);
      if (!enrollment) throw new Error("No enrollment found");
      await Promise.all([
        fetch(`/api/enrollments/${enrollment.id}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: calculateProgress(completed), completed: false })
        }),
        fetch(`/api/sections/${sectionId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed })
        })
      ]);
      return { sectionId, completed };
    },
    onSuccess: (data) => {
      if (data.completed) {
        setCompletedSections(prev => [...prev, { sectionId: data.sectionId, completed: true, timestamp: new Date().toISOString(), videoProgress }]);
      } else {
        setCompletedSections(prev => prev.filter(s => s.sectionId !== data.sectionId));
      }
    }
  });

  const calculateProgress = (includeCurrentSection: boolean = false) => {
    if (!modulesWithSections.data) return 0;
    const totalSections = modulesWithSections.data.reduce((acc, m) => acc + m.sections.length, 0);
    const completedCount = completedSections.length + (includeCurrentSection ? 1 : 0);
    return Math.round((completedCount / totalSections) * 100);
  };

  const isCurrentSectionCompleted = () => completedSections.some(s => s.sectionId === activeSectionId);

  const findAdjacentSections = () => {
    if (!modulesWithSections.data || !activeModuleId || !activeSectionId) return { prev: null, next: null };
    let prevSection: { moduleId: number; section: Section } | null = null;
    let nextSection: { moduleId: number; section: Section } | null = null;
    let foundCurrent = false;
    for (let i = 0; i < modulesWithSections.data.length; i++) {
      const mod = modulesWithSections.data[i];
      for (let j = 0; j < mod.sections.length; j++) {
        const section = mod.sections[j];
        if (foundCurrent) {
          nextSection = { moduleId: mod.id, section };
          break;
        }
        if (section.id === activeSectionId) foundCurrent = true;
        else prevSection = { moduleId: mod.id, section };
      }
      if (nextSection) break;
    }
    return { prev: prevSection, next: nextSection };
  };

  const { prev, next } = findAdjacentSections();
  const handleSectionClick = (moduleId: number, sectionId: number) => {
    setActiveModuleId(moduleId);
    setActiveSectionId(sectionId);
  };
  const handlePrevSection = () => { if (prev) handleSectionClick(prev.moduleId, prev.section.id); };
  const handleNextSection = () => { if (next) handleSectionClick(next.moduleId, next.section.id); };
  const handleMarkAsCompleted = () => {
    if (activeSectionId) updateCompletionMutation.mutate({ sectionId: activeSectionId, completed: !isCurrentSectionCompleted() });
  };
  const handleVideoProgress = (progress: number) => {
    setVideoProgress(progress);
    if (activeSectionId && progress % 5 === 0) updateVideoProgressMutation.mutate({ sectionId: activeSectionId, videoProgress: progress });
    if (progress >= 95 && !isCurrentSectionCompleted() && activeSectionId) handleMarkAsCompleted();
  };

  if (isLoadingProgram || isLoadingModules || isLoadingEnrollments || isLoadingLiveRegistrations) {
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
            <h1 className="text-2xl md:text-3xl font-heading font-bold mb-3">Programa no encontrado</h1>
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
            <p className="text-muted mb-4">Días antes de iniciar el programa se te enviará un mensaje confirmando tu asistencia y modalidad. Para dudas: <span className="font-semibold text-accent-blue">+52 784 110 0108</span></p>
            <Button onClick={() => navigate('/programs')}>Regresar a Programas</Button>
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
            <Button onClick={() => navigate('/programs')}>Regresar a Programas</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900 py-12">
        <LiveCourseRegistrationForm course={program} onSuccessRegistration={handleRegistrationSuccess} />
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-muted mb-4">Debes estar inscrito en este programa para acceder al contenido.</p>
          <Button asChild><a href={`/programs/${program.slug}`}>Volver al programa</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 flex">
      <div className={`bg-primary-800 w-80 flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative h-screen z-20 flex flex-col`}>
        <div className="p-4 border-b border-primary-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="hover:bg-primary-700 flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
                <a href={`/programs/${program.slug}`} aria-label="Volver al programa"><i className="fa-solid fa-arrow-left text-lg" /></a>
              </Button>
              <div className="w-px h-6 bg-primary-700" />
              <h2 className="text-xl font-bold">{program.title}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="md:hidden"><ChevronLeft className="h-4 w-4" /></Button>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2"><span>Progreso del programa</span><span>{calculateProgress()}%</span></div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {modulesWithSections.data?.map((module, moduleIndex) => (
              <div key={module.id} className={cn("rounded-lg overflow-hidden transition-colors", activeModuleId === module.id ? "bg-primary-700" : "bg-primary-800 hover:bg-primary-700/50")}>
                <div className="p-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <span className="bg-primary-600 rounded-full px-2 py-0.5 text-sm">{moduleIndex + 1}</span>
                    {module.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted mt-1"><span>{module.duration}h</span><span>•</span><span>{module.sections.length} secciones</span></div>
                </div>
                <div className="border-t border-primary-600">
                  {module.sections.map((section, sectionIndex) => {
                    const isCompleted = completedSections.some(s => s.sectionId === section.id);
                    const isActive = activeSectionId === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => { setActiveModuleId(module.id); setActiveSectionId(section.id); }}
                        className={cn("w-full text-left p-3 flex items-start gap-3 transition-colors relative", isActive ? "bg-accent-blue text-white" : "hover:bg-primary-600/50", isActive && "after:absolute after:left-0 after:top-0 after:h-full after:w-1 after:bg-primary-900")}
                      >
                        <div className="mt-0.5">{isCompleted ? <CheckCircle className={cn("h-5 w-5", isActive ? "text-white" : "text-green-500")} /> : <PlayCircle className={cn("h-5 w-5", isActive ? "text-white" : "text-muted")} />}</div>
                        <div>
                          <p className={cn("text-sm font-medium", isActive ? "text-white" : isCompleted ? "text-green-500" : "")}>{sectionIndex + 1}. {section.title}</p>
                          <p className={cn("text-xs mt-0.5", isActive ? "text-white/80" : "text-muted")}>{section.duration} min</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col h-screen">
        <div className="bg-primary-800 border-b border-primary-700 h-16 flex items-center px-4 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className={`mr-4 ${sidebarOpen ? 'md:hidden' : ''}`}><Menu className="h-4 w-4" /></Button>
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handlePrevSection} disabled={!prev}><ChevronLeft className="h-4 w-4 mr-2" />Anterior</Button>
              <Button variant="ghost" size="sm" onClick={handleNextSection} disabled={!next}>Siguiente<ChevronRight className="h-4 w-4 ml-2" /></Button>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handleMarkAsCompleted} className={cn("gap-2 transition-colors", isCurrentSectionCompleted() ? "text-green-500 hover:text-red-500 hover:border-red-500" : "hover:text-green-500 hover:border-green-500")}>
                {isCurrentSectionCompleted() ? <><CheckCircle className="h-4 w-4" />Completado</> : <><CheckCircle className="h-4 w-4" />Marcar como completado</>}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 h-full">
            <div className="max-w-4xl mx-auto space-y-6 h-full">
              {activeSectionId && (
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">
                    {modulesWithSections.data?.find(m => m.id === activeModuleId)?.sections.find(s => s.id === activeSectionId)?.title}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-muted">
                    <div className="flex items-center gap-2"><PlayCircle className="h-4 w-4" /><span>{modulesWithSections.data?.find(m => m.id === activeModuleId)?.sections.find(s => s.id === activeSectionId)?.duration} min</span></div>
                    {isCurrentSectionCompleted() && <div className="flex items-center gap-2 text-green-500"><CheckCircle className="h-4 w-4" /><span>Completado</span></div>}
                  </div>
                </div>
              )}
              <div className="bg-primary-800 rounded-xl overflow-hidden">
                <div className="relative">
                  {activeSectionId ? (
                    <div className="aspect-video bg-black">
                      <video className="w-full h-full" controls src="https://files.catbox.moe/g2nlhd.mp4" poster="https://i.ibb.co/BSjjCWc/back1-sngqjn.jpg" onTimeUpdate={(e) => handleVideoProgress(Math.floor(e.currentTarget.currentTime))} onEnded={() => handleVideoProgress(100)} autoPlay={false} loop={false}>Tu navegador no soporta el elemento de video.</video>
                    </div>
                  ) : (
                    <div className="aspect-video bg-primary-900 flex items-center justify-center flex-col gap-4"><PlayCircle className="h-16 w-16 text-muted" /><p className="text-muted">Selecciona una sección para comenzar</p></div>
                  )}
                </div>
              </div>
              <div className="bg-primary-800 rounded-xl p-6 flex-1">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="h-full flex flex-col">
                  <TabsList className="w-full border-b border-primary-700 p-1">
                    <TabsTrigger value="description" className="flex-1 gap-2 py-3"><FileText className="h-4 w-4" />Descripción</TabsTrigger>
                    <TabsTrigger value="resources" className="flex-1 gap-2 py-3"><Download className="h-4 w-4" />Recursos<span className="ml-2 bg-primary-700 text-xs px-2 py-0.5 rounded-full">3</span></TabsTrigger>
                    <TabsTrigger value="comments" className="flex-1 gap-2 py-3"><MessageSquare className="h-4 w-4" />Comentarios<span className="ml-2 bg-primary-700 text-xs px-2 py-0.5 rounded-full">12</span></TabsTrigger>
                  </TabsList>
                  {next && (
                    <div className="bg-primary-900/50 p-4 rounded-lg mt-4 flex items-center justify-between">
                      <div><p className="text-sm text-muted">Siguiente</p><p className="font-medium">{next.section.title}</p></div>
                      <Button variant="outline" size="sm" onClick={handleNextSection}>Continuar<ChevronRight className="h-4 w-4 ml-2" /></Button>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto">
                    <TabsContent value="description" className="pt-4 h-full">
                      <div className="prose prose-invert max-w-none">
                        <h2 className="text-xl font-bold mb-4">{modulesWithSections.data?.find(m => m.id === activeModuleId)?.sections.find(s => s.id === activeSectionId)?.title}</h2>
                        <p className="text-muted">{modulesWithSections.data?.find(m => m.id === activeModuleId)?.sections.find(s => s.id === activeSectionId)?.content || "Selecciona una sección para ver su contenido"}</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="resources" className="pt-4 h-full">
                      <div className="space-y-4"><h3 className="text-lg font-semibold mb-4">Recursos de la sección</h3><div className="grid gap-4"><div className="border border-primary-700 rounded-lg p-4 flex items-center justify-between"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted" /><div><p className="font-medium">Material de apoyo</p><p className="text-sm text-muted">PDF - 2.3MB</p></div></div><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Descargar</Button></div></div></div>
                    </TabsContent>
                    <TabsContent value="comments" className="pt-4 h-full">
                      <div className="space-y-4"><h3 className="text-lg font-semibold mb-4">Comentarios y dudas</h3><textarea className="w-full h-24 bg-primary-900 rounded-lg p-3 resize-none" placeholder="Escribe tu comentario o duda..." /><div className="flex justify-end"><Button><MessageSquare className="h-4 w-4 mr-2" />Comentar</Button></div></div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
