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
    <section className="relative flex min-h-[100svh] max-w-[100vw] items-center overflow-hidden bg-gradient-to-b from-primary-900 to-primary-800 pb-12 pt-24 sm:pb-16 md:pb-20 md:pt-28 lg:pb-24 lg:pt-32">
      <div className="absolute inset-0 bg-[url('https://i.ibb.co/qMLJGWf3/hero-a2wdq6.webp')] bg-cover bg-center opacity-[0.1]"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary-900/95 to-primary-800/95"></div>

      <div className="container relative z-10 mx-auto overflow-x-hidden px-4">
        <div className="flex flex-col items-center overflow-hidden lg:flex-row">
          <AnimateInView className="mb-8 w-full lg:mb-0 lg:w-1/2 lg:pr-8 xl:pr-10" animation="slideUp">
            <div className="mb-6 lg:mb-8">
              <h1 className="mb-4 font-heading font-bold leading-[1.15] [font-size:clamp(1.875rem,4.2vw+0.5rem,3.75rem)]">
                Aprende, <span className="accent-blue">Crea</span> y <br /><span className="accent-yellow">Transforma</span> tu <span className="accent-red">FUTURO</span>
              </h1>
              <p className="mb-6 text-muted transition-colors [font-size:clamp(1rem,1.1vw+0.65rem,1.25rem)] lg:mb-8">
                World Community Academy es la Primera Academia Tecnológica, Multidisciplinaria y Colaborativa que ofrece Programas de Especialización y Rutas de Transformación para todas las personas.
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Link href="/programs" className="inline-block rounded-md bg-accent-blue px-5 py-2.5 font-medium text-white transition-colors hover:opacity-90 sm:px-6 sm:py-3">
                  Explorar Programas
                </Link>
                <Link href="/about" className="border-text-muted text-text-light inline-block rounded-md border border-accent-blue px-5 py-2.5 font-medium transition-colors hover:bg-white hover:bg-opacity-5 sm:px-6 sm:py-3">
                  Conocer más
                </Link>
              </div>
            </div>

            <div className="mt-8 hidden items-center space-x-6 lg:flex xl:mt-10 xl:space-x-8">
              <AnimateInView animation="fadeIn" delay={0.3}>
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <img src="https://i.ibb.co/PvX8XW8K/portraits1-n976eu.png" className="h-9 w-9 rounded-full border-2 border-primary-800 xl:h-10 xl:w-10" alt="Estudiante" />
                    <img src="https://i.ibb.co/G4wxX952/portraits2-wzwuuv.png" className="h-9 w-9 rounded-full border-2 border-primary-800 xl:h-10 xl:w-10" alt="Estudiante" />
                    <img src="https://i.ibb.co/SDnRydwd/portraits3-itzkds.png" className="h-9 w-9 rounded-full border-2 border-primary-800 xl:h-10 xl:w-10" alt="Estudiante" />
                  </div>
                  <div className="ml-3 xl:ml-4">
                    <p className="font-medium">+130 estudiantes</p>
                    <p className="text-sm text-muted">se han unido a la comunidad</p>
                  </div>
                </div>
              </AnimateInView>
              <AnimateInView animation="fadeIn" delay={0.5}>
                <div className="flex items-center">
                  <div className="mr-2 text-accent-yellow">
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

          <AnimateInView className="w-full max-w-xl lg:w-1/2 lg:max-w-none" animation="slideLeft" delay={0.2}>
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
            <div className="mt-4 flex items-center justify-between px-2">
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
