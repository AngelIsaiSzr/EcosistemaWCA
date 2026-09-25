import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { IntegrationFormFlow } from "@/components/integration/integration-form-flow";
import { FormAtmosphere } from "@/components/integration/form-atmosphere";
import { DEFAULT_INTEGRATION_FORM, IntegrationFormDefinition } from "@shared/integration-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";

type PublicFormPayload = {
  title: string;
  slug: string;
  schema: IntegrationFormDefinition;
};

export default function IntegrationFormBySlugPage({
  params,
}: {
  params?: Record<string | number, string | undefined>;
}) {
  const slug = String(params?.slug ?? "");
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery<PublicFormPayload>({
    queryKey: [`/api/integration/public/${slug}`],
    enabled: Boolean(slug),
    queryFn: async () => {
      const res = await fetch(`/api/integration/public/${encodeURIComponent(slug)}`, {
        credentials: "include",
      });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.message || "Acceso restringido") as Error & {
          status?: number;
          requiresAuth?: boolean;
        };
        err.status = 403;
        err.requiresAuth = Boolean(body.requiresAuth);
        throw err;
      }
      if (!res.ok) throw new Error("Formulario no disponible");
      return res.json();
    },
    retry: false,
  });

  const accessError = error as (Error & { status?: number; requiresAuth?: boolean }) | null;
  const isRestricted = accessError?.status === 403;
  const needsAuth = Boolean(accessError?.requiresAuth);

  if ((isError || !slug) && !isLoading && !isRestricted) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>
          {data?.title
            ? `${data.title} | Ecosistema WCA`
            : "Formulario | Ecosistema WCA"}
        </title>
        <link rel="preload" as="image" href="/logo-wca.png" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="integration-form-shell relative h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#0b1220]">
        <FormAtmosphere definition={data?.schema ?? DEFAULT_INTEGRATION_FORM} />
        {isLoading && (
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner size="lg" text="Cargando formulario..." />
          </div>
        )}
        {isRestricted && !isLoading && (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white/85">
            <p className="max-w-md text-lg font-medium">
              {needsAuth && !user
                ? "Este formulario es solo para cuentas autorizadas. Inicia sesión para continuar."
                : "Tu cuenta no tiene acceso a este formulario. Si crees que es un error, escribe a Talento y Bienestar."}
            </p>
            {needsAuth && !user && (
              <Button asChild className="bg-[#5b8fd4] hover:bg-[#4a7fc4]">
                <Link href={`/auth?redirect=${encodeURIComponent(`/f/${slug}`)}`}>
                  Iniciar sesión
                </Link>
              </Button>
            )}
          </div>
        )}
        {data && (
          <IntegrationFormFlow
            definition={data.schema ?? DEFAULT_INTEGRATION_FORM}
            slug={data.slug}
          />
        )}
      </div>
    </>
  );
}
