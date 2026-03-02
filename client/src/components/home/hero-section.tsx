import { Link } from 'wouter';
import CodeWindow from '@/components/ui/code-window';
import { AnimateInView } from '@/components/ui/animate-in-view';
import { motion } from 'framer-motion';

export default function HeroSection() {
  const codeLines = [
    { content: 'class <span class="text-accent-blue">EcosistemaWCA</span> {', className: 'text-accent-red' },
    { content: 'constructor<span class="text-white">() </span>{', className: 'ml-4 text-accent-cyan' },
    { content: '// Primer Ecosistema de Aprendizaje TecnoHumano del Mundo', className: 'ml-8 text-muted' },
    { content: 'this<span class="text-white">.</span>mission <span class="text-white">=</span> <span class="text-accent-blue">"Reinventar la educación para que todos puedan construir el futuro"</span>;', className: 'ml-8 text-accent-yellow' },
    { content: '}', className: 'text-accent-cyan ml-4' },
    { content: '}', className: 'text-accent-red' },
  ];

  return (
    <section className="min-h-[100vh] bg-gradient-to-b from-primary-900 to-primary-800 relative overflow-hidden max-w-[100vw] flex items-center pt-24 md:pt-32 pb-16 md:pb-24">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1772395510694-5feb7ba00110?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] opacity-[0.1] bg-center bg-cover"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary-900/95 to-primary-800/95"></div>
      
      <div className="container mx-auto px-4 relative z-10 overflow-x-hidden">
        <div className="flex flex-col md:flex-row items-center overflow-hidden">
          <AnimateInView className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-10" animation="slideUp">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4 leading-tight">
                Aprende, <span className="accent-blue">Crea</span> y <br /><span className="accent-yellow">Transforma</span> tu <span className="accent-red">FUTURO</span>
              </h1>
              <p className="text-lg md:text-xl text-muted mb-8 transition-colors">
                World Community Academy es la Primera Academia Tecnológica, Multidisciplinaria y Colaborativa que ofrece Programas de Especialización y Rutas de Transformación para todas las personas.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/programs" className="px-6 py-3 bg-accent-blue text-white font-medium rounded-md hover:opacity-90 transition-colors inline-block">
                  Explorar Programas
                </Link>
                <Link href="/about" className="px-6 py-3 border border-accent-blue border-text-muted text-text-light font-medium rounded-md hover:bg-white hover:bg-opacity-5 transition-colors inline-block">
                  Conocer más
                </Link>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8 mt-10">
              <AnimateInView animation="fadeIn" delay={0.3}>
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <img src="https://i.ibb.co/PvX8XW8K/portraits1-n976eu.png" className="w-10 h-10 rounded-full border-2 border-primary-800" alt="Estudiante" />
                    <img src="https://i.ibb.co/G4wxX952/portraits2-wzwuuv.png" className="w-10 h-10 rounded-full border-2 border-primary-800" alt="Estudiante" />
                    <img src="https://i.ibb.co/SDnRydwd/portraits3-itzkds.png" className="w-10 h-10 rounded-full border-2 border-primary-800" alt="Estudiante" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">+120 estudiantes</p>
                    <p className="text-sm text-muted">se han unido a la comunidad</p>
                  </div>
                </div>
              </AnimateInView>
              <AnimateInView animation="fadeIn" delay={0.5}>
                <div className="flex items-center">
                  <div className="text-accent-yellow mr-2">
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star-half-alt"></i>
                  </div>
                  <div>
                    <p className="font-medium">4.8/5 valoración</p>
                    <p className="text-sm text-muted">basada en 100 reseñas</p>
                  </div>
                </div>
              </AnimateInView>
            </div>
          </AnimateInView>
          
          <AnimateInView className="w-full md:w-1/2" animation="slideLeft" delay={0.2}>
            <motion.div 
              className="relative w-full" 
              whileHover={{ rotateY: 15, scale: 0.95 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
            >
              <CodeWindow 
                title="script.js"
                codeLines={codeLines}
              />
            </motion.div>
              <div className="flex justify-between items-center mt-4 px-2">
                <div className="text-sm text-muted">
                  <i className="far fa-file-alt mr-1"></i> Editor en vivo
                </div>
                <Link href="/editor" className="text-sm text-accent-blue underline-effect">
                  Probar editor <i className="fas fa-arrow-right ml-1"></i>
                </Link>
              </div>
          </AnimateInView>
        </div>
      </div>
    </section>
  );
}
