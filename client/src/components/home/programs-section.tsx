import { useQuery } from '@tanstack/react-query';
import { Course } from '@shared/schema';
import ProgramGrid from '@/components/programs/program-grid';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Loader2 } from 'lucide-react';
import { AnimateInView } from '@/components/ui/animate-in-view';

export default function ProgramsSection() {
  const { data: programs, isLoading, error } = useQuery<Course[]>({
    queryKey: ['/api/programs'],
  });

  const displayedPrograms = programs?.slice(0, 6);

  return (
    <section id="programas" className="py-20 bg-primary-700">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Nuestros Programas</h2>
          <p className="text-muted max-w-2xl mx-auto">Explora nuestra variedad de programas diseñados para todos los niveles y de todas las disciplinas, de nivel principiantes hasta nivel avanzado.</p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-accent-blue" />
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-primary-800 rounded-xl">
            <h3 className="text-xl font-heading font-semibold mb-2">Error al cargar los programas</h3>
            <p className="text-muted mb-6">Lo sentimos, ha ocurrido un error al cargar los programas. Inténtalo de nuevo más tarde.</p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        ) : displayedPrograms && displayedPrograms.length > 0 ? (
          <>
            <AnimateInView animation="slideUp" delay={0.2}>
              <ProgramGrid programs={displayedPrograms} />
            </AnimateInView>

            <div className="text-center mt-12">
              <Link href="/programs">
                <Button variant="outline" className="border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white inline-flex items-center">
                  Ver todos los programas
                  <i className="fas fa-arrow-right ml-2"></i>
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-primary-800 rounded-xl">
            <h3 className="text-xl font-heading font-semibold mb-2">No hay programas disponibles</h3>
            <p className="text-muted">Próximamente tendremos nuevos programas disponibles para ti. ¡Mantente al tanto!</p>
          </div>
        )}
      </div>
    </section>
  );
}
