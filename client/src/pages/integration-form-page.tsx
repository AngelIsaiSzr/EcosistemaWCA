import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { IntegrationFormFlow } from "@/components/integration/integration-form-flow";
import { FormAtmosphere } from "@/components/integration/form-atmosphere";
import { DEFAULT_INTEGRATION_FORM } from "@shared/integration-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function IntegrationFormPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/integration/public"],
  });

  const form = data as { title: string; slug: string; schema: typeof DEFAULT_INTEGRATION_FORM } | undefined;

  return (
    <>
      <Helmet>
        <title>¡Súmate a WCA! | Formulario de Integración</title>
        <meta
          name="description"
          content="Formulario de integración al Ecosistema WCA para personas que desean enseñar, facilitar, liderar y transformar desde la tecnología con propósito."
        />
      </Helmet>
      <div className="relative min-h-screen overflow-x-hidden bg-[#0b1220]">
        <FormAtmosphere definition={form?.schema ?? DEFAULT_INTEGRATION_FORM} />
        {isLoading && (
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner size="lg" text="Cargando formulario..." />
          </div>
        )}
        {isError && (
          <div className="flex min-h-screen items-center justify-center px-6 text-center text-white/80">
            El formulario no está disponible en este momento.
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
