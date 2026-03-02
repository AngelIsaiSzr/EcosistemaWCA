import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Helmet } from "react-helmet";
import { Course, Module, LiveCourseRegistration } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ProgramModules from "@/components/programs/program-modules";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, Clock, Book, Award, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimateInView } from "@/components/ui/animate-in-view";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useEffect, useState } from "react";
import { usePageLoading } from "@/hooks/use-page-loading";
import { getRandomQuote } from "@/utils/quotes";

export default function ProgramDetailPage() {
  const [, params] = useRoute("/programs/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const { user } = useAuth();
  const [quote] = useState(getRandomQuote());

  const {
    data: program,
    isLoading: isLoadingProgram,
    error: programError
  } = useQuery<Course>({
    queryKey: [`/api/programs/${slug}`],
    enabled: !!slug,
  });

  const {
    data: modules,
    isLoading: isLoadingModules,
    error: modulesError
  } = useQuery<Module[]>({
    queryKey: [`/api/programs/${program?.id}/modules`],
    enabled: !!program?.id,
  });

  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments
  } = useQuery<any[]>({
    queryKey: ['/api/enrollments'],
    enabled: !!user,
  });

  const isEnrolled = enrollments.some((enrollment: any) => enrollment.courseId === program?.id);

  const {
    data: liveRegistrations = [],
    isLoading: isLoadingLiveRegistrations,
  } = useQuery<LiveCourseRegistration[]>({
    queryKey: ['/api/live-course-registrations', user?.id, program?.id],
    enabled: Boolean(user && program?.id && program.isLive),
    queryFn: async () => {
      if (!user || !program?.id || !(program.isLive)) return [];
      const response = await apiRequest("GET", `/api/live-course-registrations?userId=${user.id}&courseId=${program.id}`);
      const data = await response.json() as LiveCourseRegistration[];
      return data.filter((reg: LiveCourseRegistration) => reg.courseId === program.id);
    },
    initialData: [],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const hasRegisteredForLiveProgram = liveRegistrations.length > 0;

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!program) throw new Error("No program data available");
      return await apiRequest("POST", "/api/enroll", { courseId: program.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrollments'] });
      toast({
        title: "¡Inscripción exitosa!",
        description: `Te has inscrito en ${program?.title}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de inscripción",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEnroll = () => {
    if (!user) {
      toast({
        title: "Inicia sesión para inscribirte",
        description: "Debes iniciar sesión para inscribirte en este programa.",
        variant: "destructive",
      });
      return;
    }

    enrollMutation.mutate();
  };

  const { setLoading } = usePageLoading();

  useEffect(() => {
    setLoading(isLoadingProgram || isLoadingModules || isLoadingLiveRegistrations);
  }, [isLoadingProgram, isLoadingModules, isLoadingLiveRegistrations, setLoading]);

  useEffect(() => {
    if (user && program?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/live-course-registrations', user.id, program.id] });
    }
  }, [user, program?.id, queryClient]);

  if (isLoadingProgram || isLoadingModules || isLoadingLiveRegistrations) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner size="lg" text="Cargando programa..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (programError) {
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

  if (!program) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{program.title} - Ecosistema WCA</title>
        <meta
          name="description"
          content={program.description}
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow">
          <AnimateInView animation="fadeIn">
            <section className="bg-secondary-900 py-20 pb-10">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-full md:w-2/3">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {program.category && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-secondary-800">
                          {program.category}
                        </span>
                      )}
                      {program.level && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-secondary-800">
                          {program.level}
                        </span>
                      )}
                      {program.popular && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-accent-blue text-white">
                          Popular
                        </span>
                      )}
                      {program.new && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-accent-yellow text-primary-900">
                          Nuevo
                        </span>
                      )}
                      {program.featured && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-accent-red text-white">
                          Destacado
                        </span>
                      )}
                    </div>

                    <AnimateInView animation="slideRight" delay={0.2}>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-6">
                        {program.title}
                      </h1>
                    </AnimateInView>

                    <AnimateInView animation="fadeIn" delay={0.3}>
                      <p className="text-muted text-lg mb-8">
                        {program.description}
                      </p>
                    </AnimateInView>

                    <AnimateInView animation="fadeIn" delay={0.4}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <div className="flex items-center">
                          <Clock className={`h-5 w-5 mr-2 ${program.popular
                            ? 'accent-blue'
                            : program.new
                              ? 'accent-yellow'
                              : program.featured
                                ? 'accent-red'
                                : 'accent-blue'
                            }`} />
                          <span>{program.duration} horas</span>
                        </div>
                        <div className="flex items-center">
                          <Book className={`h-5 w-5 mr-2 ${program.popular
                            ? 'accent-blue'
                            : program.new
                              ? 'accent-yellow'
                              : program.featured
                                ? 'accent-red'
                                : 'accent-blue'
                            }`} />
                          <span>{program.modules} módulos</span>
                        </div>
                        <div className="flex items-center">
                          <Award className={`h-5 w-5 mr-2 ${program.popular
                            ? 'accent-blue'
                            : program.new
                              ? 'accent-yellow'
                              : program.featured
                                ? 'accent-red'
                                : 'accent-blue'
                            }`} />
                          <span>Certificado</span>
                        </div>
                        <div className="flex items-center">
                          <i className={`fas fa-user-graduate mr-2 ${program.popular
                            ? 'text-accent-blue'
                            : program.new
                              ? 'text-accent-yellow'
                              : program.featured
                                ? 'text-accent-red'
                                : 'text-accent-blue'
                            }`}></i>
                          <span>{program.instructor}</span>
                        </div>
                      </div>
                    </AnimateInView>

                    <AnimateInView animation="fadeIn" delay={0.5}>
                      <div>
                        {isEnrolled ? (
                          <>
                            <div className="mb-6 p-4 bg-primary-700 rounded-lg">
                              <blockquote className="italic text-muted">
                                "{quote.text}"
                              </blockquote>
                              <p className="text-sm text-muted mt-2">- {quote.author}</p>
                            </div>
                            <div className="flex items-center mb-4">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              <span>Ya estás inscrito en este programa</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mb-6 p-4 bg-primary-700 rounded-lg">
                              <blockquote className="italic text-muted">
                                "{quote.text}"
                              </blockquote>
                              <p className="text-sm text-muted mt-2">- {quote.author}</p>
                            </div>
                            {program.isLive ? (
                              <Button
                                onClick={() => window.location.href = `/programs/${program.slug}/learn`}
                                className={`px-6 py-3 ${program.popular
                                  ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                  : program.new
                                    ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                    : program.featured
                                      ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                      : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                  }`}
                                disabled={enrollMutation.isPending || isLoadingEnrollments || hasRegisteredForLiveProgram || !!program.isDisabled || !!program.comingSoon}
                              >
                                {program.comingSoon ? (
                                  <span>Próximamente</span>
                                ) : hasRegisteredForLiveProgram ? (
                                  <span>Ya Registrado</span>
                                ) : (
                                  <span>Registrate al Programa en Vivo</span>
                                )}
                              </Button>
                            ) : (
                            <Button
                              onClick={handleEnroll}
                              className={`px-6 py-3 ${program.popular
                                ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                : program.new
                                  ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                  : program.featured
                                    ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                    : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                }`}
                              disabled={enrollMutation.isPending || isLoadingEnrollments || !!program.isDisabled || !!program.comingSoon}
                            >
                              {program.comingSoon ? (
                                <span>Próximamente</span>
                              ) : enrollMutation.isPending ? (
                                <span className="mr-2 inline-block h-4 w-4 animate-spin">⟳</span>
                              ) : null}
                              {program.comingSoon ? "" : "Inscribirme Gratis"}
                            </Button>
                            )}
                          </>
                        )}
                      </div>
                    </AnimateInView>
                  </div>

                  <AnimateInView animation="slideLeft" delay={0.3}>
                    <div className="w-full md:w-auto">
                      <div className="bg-primary-800 rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={program.image}
                          alt={program.title}
                          className="w-full h-48 md:h-56 object-cover"
                        />
                        <div className="p-6">
                          <h3 className="text-xl font-heading font-semibold mb-4">
                            ¿De qué trata?
                          </h3>
                          <p className="text-muted mb-6">
                            {program.shortDescription}
                          </p>
                          {isEnrolled ? (
                            <Button
                              className="w-full bg-accent-blue hover:bg-accent-blue hover:opacity-90"
                              asChild
                            >
                              <a href={`/programs/${program.slug}/learn`}>Comenzar a Aprender</a>
                            </Button>
                          ) : (
                            program.isLive ? (
                              <Button
                                onClick={() => window.location.href = `/programs/${program.slug}/learn`}
                                className={`w-full ${program.popular
                                  ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                  : program.new
                                    ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                    : program.featured
                                      ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                      : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                }`}
                                disabled={enrollMutation.isPending || isLoadingEnrollments || hasRegisteredForLiveProgram || !!program.isDisabled || !!program.comingSoon}
                              >
                                {program.comingSoon ? (
                                  <span>Próximamente</span>
                                ) : hasRegisteredForLiveProgram ? (
                                  <span>¡Ya Estás Registrado!</span>
                                ) : (
                                  <span>Formulario de Registro</span>
                                )}
                            </Button>
                          ) : (
                            <Button
                              onClick={handleEnroll}
                              className={`w-full ${program.popular
                                ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                : program.new
                                  ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                  : program.featured
                                    ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                    : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                }`}
                              disabled={enrollMutation.isPending || isLoadingEnrollments || !!program.isDisabled || !!program.comingSoon}
                            >
                              {program.comingSoon ? (
                                <span>Próximamente</span>
                              ) : enrollMutation.isPending ? (
                                <span className="mr-2 inline-block h-4 w-4 animate-spin">⟳</span>
                              ) : null}
                              {program.comingSoon ? "" : "Inscribirme Gratis"}
                            </Button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </AnimateInView>
                </div>
              </div>
            </section>
          </AnimateInView>

          <AnimateInView animation="fadeIn" delay={0.2}>
            <section id="modules" className="bg-primary-800 py-12">
              <div className="container mx-auto px-4">
                <AnimateInView animation="slideUp" delay={0.3}>
                  <h2 className="text-3xl font-heading font-bold mb-12">
                    Temario del programa
                  </h2>
                </AnimateInView>

                {modulesError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-xl font-heading font-semibold mb-2">
                      Error al cargar los módulos
                    </h3>
                    <p className="text-muted">
                      Lo sentimos, ocurrió un error al cargar los módulos de este programa.
                    </p>
                  </div>
                ) : modules && modules.length > 0 ? (
                  <AnimateInView animation="fadeIn" delay={0.4}>
                    <ProgramModules modules={modules} isEnrolled={!!isEnrolled} isLive={!!program?.isLive} />
                  </AnimateInView>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-heading font-semibold mb-2">
                      Próximamente
                    </h3>
                    <p className="text-muted">
                      Los módulos de este programa estarán disponibles pronto.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </AnimateInView>
        </main>

        <Footer />
      </div>
    </>
  );
}
