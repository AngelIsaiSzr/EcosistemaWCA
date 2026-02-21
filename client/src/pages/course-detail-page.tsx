import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Helmet } from "react-helmet";
import { Course, Module, LiveCourseRegistration } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CourseModules from "@/components/courses/course-modules";
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

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const { user } = useAuth();
  const [quote] = useState(getRandomQuote());

  // Fetch course data
  const {
    data: course,
    isLoading: isLoadingCourse,
    error: courseError
  } = useQuery<Course>({
    queryKey: [`/api/courses/${slug}`],
    enabled: !!slug,
  });

  // Fetch course modules
  const {
    data: modules,
    isLoading: isLoadingModules,
    error: modulesError
  } = useQuery<Module[]>({
    queryKey: [`/api/courses/${course?.id}/modules`],
    enabled: !!course?.id,
  });

  // Fetch user enrollments
  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments
  } = useQuery<any[]>({
    queryKey: ['/api/enrollments'],
    enabled: !!user,
  });

  // Check if user is enrolled in this course
  const isEnrolled = enrollments.some((enrollment: any) => enrollment.courseId === course?.id);

  // Verificar si el usuario ya se ha registrado en este curso en vivo
  const {
    data: liveRegistrations = [],
    isLoading: isLoadingLiveRegistrations,
  } = useQuery<LiveCourseRegistration[]>({ // Aseguramos que la interfaz sea la correcta aquí
    queryKey: ['/api/live-course-registrations', user?.id, course?.id],
    enabled: Boolean(user && course?.id && course.isLive), // Aseguramos que la condición sea un booleano explícito
    queryFn: async () => {
      if (!user || !course?.id || !(course.isLive)) return []; // Añadida una verificación más robusta para isLive
      const response = await apiRequest("GET", `/api/live-course-registrations?userId=${user.id}&courseId=${course.id}`);
      const data = await response.json() as LiveCourseRegistration[];
      return data.filter((reg: LiveCourseRegistration) => reg.courseId === course.id);
    },
    initialData: [],
    refetchOnMount: true, // Forzar refetch al montar el componente
    refetchOnWindowFocus: true, // Forzar refetch cuando la ventana recupera el foco
    staleTime: 0, // Asegurar que los datos siempre se consideren 'stale'
  });

  const hasRegisteredForLiveCourse = liveRegistrations.length > 0;

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!course) throw new Error("No course data available");
      return await apiRequest("POST", "/api/enroll", { courseId: course.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrollments'] });
      toast({
        title: "¡Inscripción exitosa!",
        description: `Te has inscrito en ${course?.title}.`,
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

  // Handle enrollment
  const handleEnroll = () => {
    if (!user) {
      toast({
        title: "Inicia sesión para inscribirte",
        description: "Debes iniciar sesión para inscribirte en este curso.",
        variant: "destructive",
      });
      return;
    }

    enrollMutation.mutate();
  };

  const { setLoading } = usePageLoading();

  // Set global loading state based on data loading
  useEffect(() => {
    setLoading(isLoadingCourse || isLoadingModules || isLoadingLiveRegistrations);
  }, [isLoadingCourse, isLoadingModules, isLoadingLiveRegistrations, setLoading]);

  // Forzar refetch de liveRegistrations al montar el componente o cuando cambien user/course.id
  useEffect(() => {
    if (user && course?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/live-course-registrations', user.id, course.id] });
    }
  }, [user, course?.id, queryClient]);

  if (isLoadingCourse || isLoadingModules || isLoadingLiveRegistrations) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner size="lg" text="Cargando curso..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (courseError) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">Curso no encontrado</h1>
            <p className="text-muted mb-6">
              Lo sentimos, el curso que buscas no existe o no está disponible.
            </p>
            <Button asChild>
              <a href="/courses">Ver todos los cursos</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Asegurarnos de que course existe antes de renderizar
  if (!course) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{course.title} - Ecosistema WCA</title>
        <meta
          name="description"
          content={course.description}
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow">
          {/* Hero Section */}
          <AnimateInView animation="fadeIn">
            <section className="bg-secondary-900 py-20 pb-10">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-full md:w-2/3">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {course.category && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-secondary-800">
                          {course.category}
                        </span>
                      )}
                      {course.level && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-secondary-800">
                          {course.level}
                        </span>
                      )}
                      {course.popular && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-accent-blue text-white">
                          Popular
                        </span>
                      )}
                      {course.new && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-accent-yellow text-primary-900">
                          Nuevo
                        </span>
                      )}
                      {course.featured && (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-accent-red text-white">
                          Destacado
                        </span>
                      )}
                    </div>

                    <AnimateInView animation="slideRight" delay={0.2}>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-6">
                        {course.title}
                      </h1>
                    </AnimateInView>

                    <AnimateInView animation="fadeIn" delay={0.3}>
                      <p className="text-muted text-lg mb-8">
                        {course.description}
                      </p>
                    </AnimateInView>

                    <AnimateInView animation="fadeIn" delay={0.4}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <div className="flex items-center">
                          <Clock className={`h-5 w-5 mr-2 ${course.popular
                            ? 'accent-blue'
                            : course.new
                              ? 'accent-yellow'
                              : course.featured
                                ? 'accent-red'
                                : 'accent-blue'
                            }`} />
                          <span>{course.duration} horas</span>
                        </div>
                        <div className="flex items-center">
                          <Book className={`h-5 w-5 mr-2 ${course.popular
                            ? 'accent-blue'
                            : course.new
                              ? 'accent-yellow'
                              : course.featured
                                ? 'accent-red'
                                : 'accent-blue'
                            }`} />
                          <span>{course.modules} módulos</span>
                        </div>
                        <div className="flex items-center">
                          <Award className={`h-5 w-5 mr-2 ${course.popular
                            ? 'accent-blue'
                            : course.new
                              ? 'accent-yellow'
                              : course.featured
                                ? 'accent-red'
                                : 'accent-blue'
                            }`} />
                          <span>Certificado</span>
                        </div>
                        <div className="flex items-center">
                          <i className={`fas fa-user-graduate mr-2 ${course.popular
                            ? 'text-accent-blue'
                            : course.new
                              ? 'text-accent-yellow'
                              : course.featured
                                ? 'text-accent-red'
                                : 'text-accent-blue'
                            }`}></i>
                          <span>{course.instructor}</span>
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
                              <span>Ya estás inscrito en este curso</span>
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
                            {course.isLive ? (
                              <Button
                                onClick={() => window.location.href = `/courses/${course.slug}/learn`}
                                className={`px-6 py-3 ${course.popular
                                  ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                  : course.new
                                    ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                    : course.featured
                                      ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                      : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                  }`}
                                disabled={enrollMutation.isPending || isLoadingEnrollments || hasRegisteredForLiveCourse || !!course.isDisabled || !!course.comingSoon}
                              >
                                {course.comingSoon ? (
                                  <span>Próximamente</span>
                                ) : hasRegisteredForLiveCourse ? (
                                  <span>Ya Registrado</span>
                                ) : (
                                  <span>Registrate al Curso en Vivo</span>
                                )}
                              </Button>
                            ) : (
                            <Button
                              onClick={handleEnroll}
                              className={`px-6 py-3 ${course.popular
                                ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                : course.new
                                  ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                  : course.featured
                                    ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                    : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                }`}
                              disabled={enrollMutation.isPending || isLoadingEnrollments || !!course.isDisabled || !!course.comingSoon}
                            >
                              {course.comingSoon ? (
                                <span>Próximamente</span>
                              ) : enrollMutation.isPending ? (
                                <span className="mr-2 inline-block h-4 w-4 animate-spin">⟳</span>
                              ) : null}
                              {course.comingSoon ? "" : "Inscribirme Gratis"}
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
                          src={course.image}
                          alt={course.title}
                          className="w-full h-48 md:h-56 object-cover"
                        />
                        <div className="p-6">
                          <h3 className="text-xl font-heading font-semibold mb-4">
                            ¿De qué trata?
                          </h3>
                          <p className="text-muted mb-6">
                            {course.shortDescription}
                          </p>
                          {isEnrolled ? (
                            <Button
                              className="w-full bg-accent-blue hover:bg-accent-blue hover:opacity-90"
                              asChild
                            >
                              <a href={`/courses/${course.slug}/learn`}>Comenzar a Aprender</a>
                            </Button>
                          ) : (
                            course.isLive ? (
                              <Button
                                onClick={() => window.location.href = `/courses/${course.slug}/learn`}
                                className={`w-full ${course.popular
                                  ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                  : course.new
                                    ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                    : course.featured
                                      ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                      : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                }`}
                                disabled={enrollMutation.isPending || isLoadingEnrollments || hasRegisteredForLiveCourse || !!course.isDisabled || !!course.comingSoon}
                              >
                                {course.comingSoon ? (
                                  <span>Próximamente</span>
                                ) : hasRegisteredForLiveCourse ? (
                                  <span>¡Ya Estás Registrado!</span>
                                ) : (
                                  <span>Formulario de Registro</span>
                                )}
                            </Button>
                          ) : (
                            <Button
                              onClick={handleEnroll}
                              className={`w-full ${course.popular
                                ? 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                : course.new
                                  ? 'bg-accent-yellow hover:bg-accent-yellow hover:opacity-90 text-primary-900'
                                  : course.featured
                                    ? 'bg-accent-red hover:bg-accent-red hover:opacity-90'
                                    : 'bg-accent-blue hover:bg-accent-blue hover:opacity-90'
                                }`}
                              disabled={enrollMutation.isPending || isLoadingEnrollments || !!course.isDisabled || !!course.comingSoon}
                            >
                              {course.comingSoon ? (
                                <span>Próximamente</span>
                              ) : enrollMutation.isPending ? (
                                <span className="mr-2 inline-block h-4 w-4 animate-spin">⟳</span>
                              ) : null}
                              {course.comingSoon ? "" : "Inscribirme Gratis"}
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

          {/* Course Modules */}
          <AnimateInView animation="fadeIn" delay={0.2}>
            <section id="modules" className="bg-primary-800 py-12">
              <div className="container mx-auto px-4">
                <AnimateInView animation="slideUp" delay={0.3}>
                  <h2 className="text-3xl font-heading font-bold mb-12">
                    Temario del curso
                  </h2>
                </AnimateInView>

                {modulesError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-xl font-heading font-semibold mb-2">
                      Error al cargar los módulos
                    </h3>
                    <p className="text-muted">
                      Lo sentimos, ocurrió un error al cargar los módulos de este curso.
                    </p>
                  </div>
                ) : modules && modules.length > 0 ? (
                  <AnimateInView animation="fadeIn" delay={0.4}>
                    <CourseModules modules={modules} isEnrolled={!!isEnrolled} isLive={!!course?.isLive} />
                  </AnimateInView>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-heading font-semibold mb-2">
                      Próximamente
                    </h3>
                    <p className="text-muted">
                      Los módulos de este curso estarán disponibles pronto.
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
