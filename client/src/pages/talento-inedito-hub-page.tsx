import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, LayoutTemplate, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navbar from "@/components/layout/navbar";
import { cn } from "@/lib/utils";

type IneditoOption = {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon: typeof Sparkles;
  disabled?: boolean;
  count?: number | null;
  countLabel?: string;
  statusLabel?: string | null;
};

export default function TalentoIneditoHubPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: retoTokens } = useQuery<{ counts?: Record<string, number> }>({
    queryKey: ["/api/talento/reto/tokens"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/reto/tokens?limit=1", { credentials: "include" });
      if (!res.ok) return { counts: {} };
      return res.json();
    },
  });

  const { data: landing } = useQuery<{ isEnabled: boolean }>({
    queryKey: ["/api/talento/inedito/landing"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/inedito/landing", { credentials: "include" });
      if (!res.ok) return { isEnabled: true };
      return res.json();
    },
  });

  if (isLoading || !user || user.role !== "talento") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const retoActive =
    (retoTokens?.counts?.pending ?? 0) + (retoTokens?.counts?.opened ?? 0);

  const options: IneditoOption[] = [
    {
      id: "landing",
      title: "Landing",
      description:
        "Activa o desactiva la página pública /inedito y edita su información por secciones.",
      href: "/talento/inedito/landing",
      icon: LayoutTemplate,
      statusLabel: landing?.isEnabled ? "Activa" : "Desactivada",
    },
    {
      id: "reto",
      title: "Reto",
      description:
        "Enlaces temporales de un solo uso y envío masivo para la 2.ª etapa de WCA | INÉDITO.",
      href: "/talento/inedito/reto",
      icon: Sparkles,
      count: retoActive,
      countLabel: "enlaces activos",
    },
  ];

  return (
    <>
      <Helmet>
        <title>INÉDITO | Talento y Bienestar</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href="/talento" className="hover:text-foreground">
                  Inicio
                </Link>
                {" › "}
                INÉDITO
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0056FF]/15 text-[#0056FF] ring-1 ring-[#0056FF]/25">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-heading text-4xl font-bold">INÉDITO</h1>
                  <p className="mt-1 text-muted-foreground">
                    Herramientas de Talento para el programa WCA | INÉDITO.
                  </p>
                </div>
              </div>
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
                      : "hover:border-[#0056FF]/40 hover:shadow-sm",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1",
                      disabled
                        ? "bg-muted text-muted-foreground ring-border"
                        : "bg-[#0056FF]/15 text-[#0056FF] ring-[#0056FF]/25",
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
                      {!disabled && option.statusLabel && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            option.statusLabel === "Activa"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {option.statusLabel}
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
