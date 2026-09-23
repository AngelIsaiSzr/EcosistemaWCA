import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { OrgChartCanvas } from "@/components/organigrama/org-chart-canvas";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { OrgPerson } from "@shared/org-chart";

type OrgPayload = {
  sedeId: string;
  title: string;
  subtitle: string;
  sedeLabel: string;
  people: OrgPerson[];
};

export default function OrganigramaPage() {
  const { data, isLoading, isError } = useQuery<OrgPayload>({
    queryKey: ["/api/organigrama"],
    queryFn: async () => {
      const res = await fetch("/api/organigrama", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <LoadingSpinner size="lg" text="Cargando organigrama..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-6 text-center text-slate-600">
        No se pudo cargar el organigrama. Intenta de nuevo más tarde.
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Organigrama Oficial · Ecosistema WCA</title>
        <meta
          name="description"
          content="Estructura Organizativa Institucional del Ecosistema WCA — Sede Monterrey."
        />
        <link rel="canonical" href="https://organigrama.ecosistemawca.com" />
      </Helmet>
      <OrgChartCanvas
        people={data.people}
        title={data.title}
        subtitle={data.subtitle}
        sedeLabel={data.sedeLabel}
      />
    </>
  );
}
