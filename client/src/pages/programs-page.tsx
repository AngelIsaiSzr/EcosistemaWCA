import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Course } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ProgramGrid from "@/components/programs/program-grid";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimateInView } from "@/components/ui/animate-in-view";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePageLoading } from "@/hooks/use-page-loading";

export default function ProgramsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [showLoading, setShowLoading] = useState(true);
  const { setLoading } = usePageLoading();

  const { data: programs, isLoading, error } = useQuery<Course[]>({
    queryKey: ["/api/programs"],
  });
  
  useEffect(() => {
    setShowLoading(true);
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    setLoading(isLoading || showLoading);
  }, [isLoading, showLoading, setLoading]);

  const filteredPrograms = programs?.filter((program) => {
    const matchesSearch = program.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          program.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || program.category === categoryFilter;
    const matchesLevel = levelFilter === "all" || program.level === levelFilter;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const categories = programs ? 
    programs.map(program => program.category)
      .filter((category, index, self) => self.indexOf(category) === index) : 
    [];
  
  const levels = programs ? 
    programs.map(program => program.level)
      .filter((level, index, self) => self.indexOf(level) === index && level !== "Todos los niveles")
      .sort((a, b) => {
        const order = ["Principiante", "Intermedio", "Avanzado", "Todos los niveles"];
        return order.indexOf(a) - order.indexOf(b);
      }) : 
    [];

  return (
    <>
      <Helmet>
        <title>Ecosistema WCA</title>
        <meta 
          name="description" 
          content="Explora nuestra variedad de programas  de especialización, desde programación hasta idiomas."
        />
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-grow">
          <AnimateInView animation="fadeIn">
            <section className="bg-secondary-900 py-20 pb-10 md:pb-20">
              <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                  <h1 className="text-4xl md:text-5xl font-heading font-bold mt-6 mb-4">
                    Nuestros Programas
                  </h1>
                  <p className="text-muted text-lg">
                    Explora nuestra variedad de programas diseñados para todos los niveles, desde principiantes hasta estudiantes avanzados.
                  </p>
                </div>
              </div>
            </section>
          </AnimateInView>
          
          <AnimateInView animation="slideUp" delay={0.2}>
            <section className="bg-primary-700 py-8">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Buscar</label>
                    <Input 
                      placeholder="Buscar programas..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-primary-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Categoría</label>
                    <Select 
                      defaultValue="all"
                      onValueChange={(value) => setCategoryFilter(value)}
                    >
                      <SelectTrigger className="bg-primary-800">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Nivel</label>
                    <Select 
                      defaultValue="all"
                      onValueChange={(value) => setLevelFilter(value)}
                    >
                      <SelectTrigger className="bg-primary-800">
                        <SelectValue placeholder="Todos los niveles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los niveles</SelectItem>
                        {levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>
          </AnimateInView>
          
          <section className="bg-primary-800 py-16">
            <div className="container mx-auto px-4">
              {isLoading || showLoading ? (
                <div className="flex justify-center py-32">
                  <LoadingSpinner size="lg" text="Cargando programas..." />
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <h3 className="text-xl font-heading font-semibold mb-2">
                    Error al cargar los programas
                  </h3>
                  <p className="text-muted">
                    Lo sentimos, ocurrió un error al cargar los programas. Inténtalo de nuevo más tarde.
                  </p>
                </div>
              ) : (
                <>
                  <AnimateInView animation="fadeIn">
                    <div className="mb-8">
                      <h2 className="text-xl font-heading font-semibold">
                        {filteredPrograms?.length || 0} programas encontrados
                      </h2>
                    </div>
                  </AnimateInView>
                  
                  {filteredPrograms && filteredPrograms.length > 0 ? (
                    <AnimateInView animation="fadeIn" delay={0.2}>
                      <ProgramGrid programs={filteredPrograms} />
                    </AnimateInView>
                  ) : (
                    <div className="text-center py-20">
                      <h3 className="text-xl font-heading font-semibold mb-2">
                        No se encontraron programas
                      </h3>
                      <p className="text-muted">
                        No hay programas que coincidan con tus filtros. Prueba con otros criterios de búsqueda.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
