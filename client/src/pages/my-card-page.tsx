import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PresentationCard } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/layout/navbar";
import { PresentationCardEditor } from "@/pages/admin-card-editor-page";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";

export default function MyCardPage() {
  const { user, isLoading } = useAuth();

  const mineQuery = useQuery<PresentationCard>({
    queryKey: ["/api/cards/mine"],
    enabled: !!user,
    retry: false,
  });

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (mineQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando tu tarjeta..." />
      </div>
    );
  }

  if (mineQuery.isError || !mineQuery.data) {
    return (
      <>
        <Helmet>
          <title>Mi tarjeta | Ecosistema WCA</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 pb-16 pt-24 text-center">
            <h1 className="font-heading text-3xl font-bold">Mi tarjeta</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              No tienes una tarjeta de presentación asignada. Pide a un administrador que te asigne
              una desde el panel de Tarjetas.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </main>
        </div>
      </>
    );
  }

  return <PresentationCardEditor mode="owner" />;
}
