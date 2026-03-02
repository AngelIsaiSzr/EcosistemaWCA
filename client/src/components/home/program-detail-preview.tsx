import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function ProgramDetailPreview() {
  return (
    <section className="py-20 bg-primary-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <motion.div 
            className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-10"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Estructura de nuestros programas</h2>
            <p className="text-muted mb-6">Nuestros programas están diseñados para brindarte una experiencia de aprendizaje completa y práctica. Cada programa incluye:</p>
            
            <div className="space-y-4">
              <div className="flex">
                <div className="accent-red mr-3 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Módulos estructurados</h3>
                  <p className="text-muted">Contenido organizado progresivamente para facilitar tu aprendizaje.</p>
                </div>
              </div>
              <div className="flex">
                <div className="accent-blue mr-3 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Clases en vivo</h3>
                  <p className="text-muted">Sesiones interactivas con instructores expertos y posibilidad de hacer preguntas.</p>
                </div>
              </div>
              <div className="flex">
                <div className="accent-yellow mr-3 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Proyectos prácticos</h3>
                  <p className="text-muted">Aplica lo aprendido en proyectos reales para construir tu portafolio.</p>
                </div>
              </div>
              <div className="flex">
                <div className="accent-red mr-3 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Grabaciones disponibles</h3>
                  <p className="text-muted">Accede a las clases en cualquier momento y aprende a tu propio ritmo.</p>
                </div>
              </div>
              <div className="flex">
                <div className="accent-blue mr-3 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Comunidad de estudiantes</h3>
                  <p className="text-muted">Conéctate con otros aprendices y colabora en proyectos conjuntos.</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-primary-700 rounded-xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-heading font-semibold">Desarrollo Web</h3>
                <span className="px-3 py-1 bg-accent-blue text-white text-xs rounded-full">11 Módulos</span>
              </div>
              
              <div className="space-y-4">
                <div className="bg-primary-800 rounded-lg p-4 border-l-4 border-accent-blue">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Módulo 1: Introducción a la Computación</h4>
                    <span className="text-xs text-muted">2 horas</span>
                  </div>
                  <p className="text-muted text-sm mt-2">Aprende los conceptos básicos de la computación.</p>
                </div>
                
                <div className="bg-primary-800 rounded-lg p-4 border-l-4 border-accent-yellow">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Módulo 2: HTML Básico</h4>
                    <span className="text-xs text-muted">2 horas</span>
                  </div>
                  <p className="text-muted text-sm mt-2">Descubre el mundo del código: tu primer paso hacia HTML.</p>
                </div>
                
                <div className="bg-primary-800 rounded-lg p-4 border-l-4 border-accent-red">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Módulo 3: HTML Intermedio</h4>
                    <span className="text-xs text-muted">2 horas</span>
                  </div>
                  <p className="text-muted text-sm mt-2">Maneja el uso de enlaces y multimedia para enriquecer tu contenido.</p>
                </div>
                
                <div className="bg-primary-800 rounded-lg p-4 opacity-60">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Módulo 4: HTML Avanzado</h4>
                    <span className="text-xs text-muted">Próximamente</span>
                  </div>
                  <p className="text-muted text-sm mt-2">Conoce como crear formularios y mejores prácticas.</p>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Button className="bg-accent-blue hover:bg-accent-blue hover:opacity-90 inline-flex items-center">
                  <a href="/programs/desarrollo-web">
                    Explorar contenido completo
                    <i className="fas fa-external-link-alt ml-2"></i>
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
