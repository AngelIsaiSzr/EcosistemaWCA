import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CreditCard,
  Flag,
  Handshake,
  Mail,
  MessageSquareQuote,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navbar from "@/components/layout/navbar";
import { Ally, Country, Course, PresentationCard, Team, Testimonial } from "@shared/schema";
import { cn } from "@/lib/utils";

type AdminOption = {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon: typeof BookOpen;
  disabled?: boolean;
  count?: number | null;
  countLabel?: string;
};

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/programs"],
    enabled: user?.role === "admin",
  });
  const { data: team } = useQuery<Team[]>({
    queryKey: ["/api/team"],
    enabled: user?.role === "admin",
  });
  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
    enabled: user?.role === "admin",
  });
  const { data: allies } = useQuery<Ally[]>({
    queryKey: ["/api/allies"],
    enabled: user?.role === "admin",
  });
  const { data: countries } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
    enabled: user?.role === "admin",
  });
  const { data: cards } = useQuery<PresentationCard[]>({
    queryKey: ["/api/cards"],
    enabled: user?.role === "admin",
  });

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const options: AdminOption[] = [
    {
      id: "programas",
      title: "Programas",
      description: "Crea y edita programas, módulos y secciones de la plataforma.",
      href: "/admin/programas",
      icon: BookOpen,
      count: courses?.length ?? null,
      countLabel: "programas",
    },
    {
      id: "equipo",
      title: "Equipo",
      description: "Gestiona los perfiles completos del equipo que aparecen en el sitio.",
      href: "/admin/equipo",
      icon: Users,
      count: team?.length ?? null,
      countLabel: "miembros",
    },
    {
      id: "testimonios",
      title: "Testimonios",
      description: "Administra reseñas y testimonios públicos de la comunidad.",
      href: "/admin/testimonios",
      icon: MessageSquareQuote,
      count: testimonials?.length ?? null,
      countLabel: "testimonios",
    },
    {
      id: "aliados",
      title: "Aliados",
      description: "Gestiona los logos del carrusel de aliados en la página principal.",
      href: "/admin/aliados",
      icon: Handshake,
      count: allies?.length ?? null,
      countLabel: "aliados",
    },
    {
      id: "paises",
      title: "Países",
      description: "Edita banderas, orden y número de estudiantes del carrusel de países.",
      href: "/admin/paises",
      icon: Flag,
      count: countries?.length ?? null,
      countLabel: "países",
    },
    {
      id: "tarjetas",
      title: "Tarjetas de presentación",
      description: "Crea y administra tarjetas digitales estilo Linktree del equipo WCA.",
      href: "/admin/tarjetas",
      icon: CreditCard,
      count: cards?.length ?? null,
      countLabel: "tarjetas",
    },
    {
      id: "correos",
      title: "Automatización de correos",
      description:
        "Recordatorios semanales a directores, plantillas editables y correos de prueba.",
      href: "/admin/correos",
      icon: Mail,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Administración | Ecosistema WCA</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inicio</p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Administración</h1>
              <p className="mt-2 text-muted-foreground">
                Panel de administración. Elige una sección para gestionar el contenido del sitio.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="inline-flex rounded-full border bg-card px-4 py-1.5 text-sm font-medium">
              Secciones
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => {
              const Icon = option.icon;
              const disabled = !!option.disabled;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled && option.href) navigate(option.href);
                  }}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-2xl border bg-card p-5 text-left transition",
                    disabled
                      ? "cursor-not-allowed opacity-55"
                      : "hover:border-[#5b8fd4]/40 hover:shadow-sm",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1",
                      disabled
                        ? "bg-muted text-muted-foreground ring-border"
                        : "bg-[#5b8fd4]/15 text-[#5b8fd4] ring-[#5b8fd4]/25",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-base font-semibold leading-snug tracking-tight">
                        {option.title}
                      </h2>
                      {disabled && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Próximamente
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{option.description}</p>
                    {!disabled && option.count != null && (
                      <p className="mt-2.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{option.count}</span>{" "}
                        {option.countLabel}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}
