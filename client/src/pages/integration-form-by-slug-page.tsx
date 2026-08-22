import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { IntegrationFormFlow } from "@/components/integration/integration-form-flow";
import { FormAtmosphere } from "@/components/integration/form-atmosphere";
import { DEFAULT_INTEGRATION_FORM } from "@shared/integration-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function IntegrationFormBySlugPage({
  params,
}: {
  params?: Record<string | number, string | undefined>;
}) {
  const slug = String(params?.slug ?? "");
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/integration/public/${slug}`],
    enabled: Boolean(slug),
  });

  const form = data as { title: string; slug: string; schema: typeof DEFAULT_INTEGRATION_FORM } | undefined;

  return (
    <>
      <Helmet>
        <title>Formulario de Integración | Ecosistema WCA</title>
      </Helmet>
      <div className="relative min-h-screen overflow-x-hidden bg-[#0b1220]">
        <FormAtmosphere definition={form?.schema ?? DEFAULT_INTEGRATION_FORM} />
        {isLoading && (
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner size="lg" text="Cargando formulario..." />
          </div>
        )}
        {(isError || !slug) && !isLoading && (
          <div className="flex min-h-screen items-center justify-center px-6 text-center text-white/80">
            El formulario no está disponible.
          </div>
        )}
        {form && (
          <IntegrationFormFlow
            definition={form.schema ?? DEFAULT_INTEGRATION_FORM}
            slug={form.slug}
          />
        )}
      </div>
    </>
  );
}
