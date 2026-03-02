import { motion } from 'framer-motion';
import { Link } from 'wouter';

export default function AboutSection() {
  return (
    <section id="acerca" className="py-20 bg-secondary-900">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <motion.div 
            className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-10"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src="https://i.ibb.co/bjt2h1Tz/about3-yw5df.png" 
              alt="Misión de Ecosistema WCA" 
              className="rounded-xl shadow-lg"
            />
          </motion.div>
          
          <motion.div 
            className="w-full md:w-1/2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Nuestra Misión</h2>
            <p className="text-muted mb-6 text-justify">
              En el <span className="accent-blue font-medium">Ecosistema WCA</span>, nuestra misión es combatir el analfabetismo digital y democratizar el acceso a la educación tecnológica y multidisciplinaria, formando agentes de cambio que impulsen el desarrollo sostenible y generen impacto tangible en la sociedad.
            </p>
            
            <div className="mb-8">
              <h3 className="text-xl font-heading font-semibold mb-4">Objetivos de Desarrollo Sostenible</h3>
              
              <div className="flex flex-wrap gap-4">
                <div className="px-3 py-2 bg-primary-800 rounded-lg text-sm flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-accent-blue rounded-full mr-2 text-xs font-bold text-white">4</span>
                  Educación de Calidad
                </div>
                <div className="px-3 py-2 bg-primary-800 rounded-lg text-sm flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-accent-red rounded-full mr-2 text-xs font-bold text-white">8</span>
                  Trabajo Decente
                </div>
                <div className="px-3 py-2 bg-primary-800 rounded-lg text-sm flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-accent-purple rounded-full mr-2 text-xs font-bold text-white">9</span>
                  Industria, Innovación e Infraestructura
                </div>
                <div className="px-3 py-2 bg-primary-800 rounded-lg text-sm flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-accent-yellow rounded-full mr-2 text-xs font-bold text-white">10</span>
                  Reducción de Desigualdades
                </div>
                <div className="px-3 py-2 bg-primary-800 rounded-lg text-sm flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-accent-green rounded-full mr-2 text-xs font-bold text-white">17</span>
                  Alianzas para los Objetivos
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-heading font-semibold mb-4">Nuestro Compromiso</h3>
              <p className="text-muted mb-6 text-justify">
              Nos comprometemos a ofrecer educación tecnológica actualizada, práctica y de alta calidad, desarrollada por expertos en la industria. Creemos en el aprendizaje colaborativo por lo que creamos una comunidad diversa donde personas de distintos contextos crecen juntas.
              </p>
              
              <Link href="/about" className="text-accent-blue underline-effect">
                Conoce más sobre nosotros
                <i className="fas fa-arrow-right ml-2"></i>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
