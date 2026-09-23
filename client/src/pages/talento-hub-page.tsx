import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FileText, Network, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navbar from "@/components/layout/navbar";
import { cn } from "@/lib/utils";
import type { IntegrationForm } from "@shared/schema";

type FormListItem = IntegrationForm & { responseCount: number };

type TalentoOption = {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon: typeof FileText;
  disabled?: boolean;
  count?: number | null;
  countLabel?: string;
};

export default function TalentoHubPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: forms } = useQuery<FormListItem[]>({
    queryKey: ["/api/talento/forms"],
    enabled: user?.role === "talento",
  });

  if (isLoading || !user || user.role !== "talento") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const options: TalentoOption[] = [
    {
      id: "formularios",
      title: "Formularios",
      description:
        "Crea, edita y revisa formularios de Talento y Bienestar, incluido el de integración.",
      href: "/talento/formularios",
      icon: FileText,
      count: forms?.length ?? null,
      countLabel: "formularios",
    },
    {
      id: "organigrama",
      title: "Organigrama",
      description:
        "Estructura Organizativa Institucional · Sede Monterrey. Edita fichas y miembros por dirección.",
      href: "/talento/organigrama",
      icon: Network,
    },
    {
      id: "inedito",
      title: "INÉDITO",
      description:
        "Herramientas del programa: reto, enlaces y próximas secciones de WCA | INÉDITO.",
      href: "/talento/inedito",
      icon: Zap,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Talento y Bienestar | Ecosistema WCA</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inicio</p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Talento y Bienestar</h1>
              <p className="mt-2 text-muted-foreground">
                Panel de la Dirección de Talento y Bienestar. Elige una sección para continuar.
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
