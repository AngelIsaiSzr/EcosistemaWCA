import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import TeamSection from "@/components/home/team-section";

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>Acerca de - Ecosistema WCA | Primera Academia Tecnológica, Multidisciplinaria y Colaborativa</title>
        <meta 
          name="description" 
          content="Conoce la evolución de World Community Academy, la primera academia tecnológica multidisciplinaria y colaborativa que revoluciona la educación del siglo XXI."
        />
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="bg-secondary-900 py-20 pb-10 md:pb-20">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-heading font-bold mt-6 mb-4">
                  Conócenos
                </h1>
                <p className="text-muted text-lg">
                Somos una academia comprometida con la educación tecnológica inclusiva y accesible para todas las personas.
                </p>
              </div>
            </div>
          </section>
          
          {/* Mission & Vision */}
          <section className="bg-primary-800 py-16">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="w-full md:w-1/2 order-2 md:order-1">
                  <h2 className="text-3xl font-heading font-bold mb-6">
                    Nuestra Misión
                  </h2>
                  <p className="text-muted mb-6 text-justify">
                    En el <span className="accent-blue font-medium">Ecosistema WCA</span> (World Community Academy), creemos que la educación tecnológica de calidad debe ser accesible para todos. Nuestra misión es combatir el analfabetismo digital y democratizar el acceso a la educación tecnológica, formando agentes de cambio capaces de generar impacto sostenible. A través de nuestros Programas de Especialización y Rutas de Transformación, integramos tecnología, proyectos y retos reales que conectan el aprendizaje con la resolución de problemas del mundo actual.
                  </p>
                  
                  <h3 className="text-xl font-heading font-semibold mb-4">
                    Metodología Play&Impact Learning
                  </h3>
                  <p className="text-muted mb-4 text-justify">
                    Nuestra metodología <span className="accent-cyan font-medium">Play&Impact Learning</span> es el corazón pedagógico de <i>World Community Academy</i> y de todo el <i>Ecosistema WCA</i>. Nace de la convicción de que el aprendizaje no debe ser un proceso rígido, lineal ni limitado a la simple transmisión de información, sino una experiencia viva, lúdica, emocional y transformadora que una el conocimiento con la acción, donde aprender es crear y crear es generar impacto.
                  </p>

                  <p className="mb-4 text-justify">
                    Nos alineamos con los siguientes ODS de la Agenda 2030 de la ONU:
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="px-3 py-2 bg-primary-700 rounded-lg text-sm flex items-center">
                      <span className="w-6 h-6 flex items-center justify-center bg-accent-blue rounded-full mr-2 text-xs font-bold text-white">4</span>
                      Educación de Calidad
                    </div>
                    <div className="px-3 py-2 bg-primary-700 rounded-lg text-sm flex items-center">
                      <span className="w-6 h-6 flex items-center justify-center bg-accent-red rounded-full mr-2 text-xs font-bold text-white">8</span>
                      Trabajo Decente
                    </div>
                    <div className="px-3 py-2 bg-primary-700 rounded-lg text-sm flex items-center">
                      <span className="w-6 h-6 flex items-center justify-center bg-accent-purple rounded-full mr-2 text-xs font-bold text-white">9</span>
                      Industria, Innovación e Infraestructura
                    </div>
                    <div className="px-3 py-2 bg-primary-700 rounded-lg text-sm flex items-center">
                      <span className="w-6 h-6 flex items-center justify-center bg-accent-yellow rounded-full mr-2 text-xs font-bold text-white">10</span>
                      Reducción de Desigualdades
                    </div>
                    <div className="px-3 py-2 bg-primary-700 rounded-lg text-sm flex items-center">
                      <span className="w-6 h-6 flex items-center justify-center bg-accent-green rounded-full mr-2 text-xs font-bold text-white">17</span>
                      Alianzas para los Objetivos
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 order-1 md:order-2">
                  <img 
                    src="https://i.ibb.co/xbFQPY1/about1-cy3qzm.jpg" 
                    alt="Misión de Ecosistema WCA" 
                    className="rounded-xl shadow-lg"
                  />
                </div>
              </div>
            </div>
          </section>
          
          {/* Evolution & Values */}
          <section className="bg-secondary-900 py-16">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="w-full md:w-1/2">
                  <img 
                    src="https://i.ibb.co/rKPSpHYq/about2-rxuu0v.jpg" 
                    alt="Evolución del Ecosistema WCA" 
                    className="rounded-xl shadow-lg"
                  />
                </div>
                
                <div className="w-full md:w-1/2">
                  <h2 className="text-3xl font-heading font-bold mb-6">
                    Nuestra Historia
                  </h2>
                  <p className="text-muted mb-6 text-justify">
                    Nuestra academia nació en 2022. Comenzó como un pequeño grupo de estudio con el nombre de Web Code Academy, y surgió como una respuesta a la creciente necesidad de educación tecnológica accesible. Fundada por Angel Salazar, quien experimentó de primera mano las barreras de acceso a la educación en tecnología.
                  </p>

                  <p className="text-muted mb-6 text-justify">
                    En 2026, cambió su nombre a World Community Academy y se convirtió en el Primer Ecosistema de Aprendizaje TecnoHumano del Mundo ofreciendo Programas de Especialización TechHuman y Rutas de Transformación TechHuman, que permiten a nuestros estudiantes desarrollar habilidades relevantes para el mercado laboral actual.
                  </p>
                  
                  <h3 className="text-xl font-heading font-semibold mb-4">
                    Nuestros Valores
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="accent-red mr-4 mt-1">
                        <i className="fas fa-star"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Multidisciplinariedad</h4>
                        <p className="text-muted text-sm text-justify">Integramos múltiples áreas del conocimiento usando la tecnología como eje central del aprendizaje, desde computación hasta historia, literatura, idiomas, matemáticas y arte.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="accent-blue mr-4 mt-1">
                        <i className="fas fa-hands-helping"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Colaboración</h4>
                        <p className="text-muted text-sm text-justify">Abrimos nuestras puertas a otros proyectos educativos y con impacto social para construir juntos una comunidad educativa descentralizada y diversa.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="accent-yellow ml-1 mr-5 mt-1">
                        <i className="fas fa-lightbulb"></i>
                      </div>
                      <div>
                        <h4 className="font-medium">Innovación Educativa</h4>
                        <p className="text-muted text-sm text-justify">Implementamos y desarrollamos nuestra metodología "Play&Impact Learning", integrando ODS, proyectos y retos que resuelven problemas reales del mundo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* WCA Ecosystem Divisions */}
          <section className="bg-primary-900 py-16">
            <div className="container mx-auto px-4 relative z-10">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
                Divisiones del Ecosistema WCA
              </h2>
              <p className="text-center text-muted max-w-2xl mx-auto mb-14">
                Cuatro pilares que conectan educación, colaboración, innovación e impacto para transformar personas y organizaciones.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 px-6">
                {/* WCA | Learn */}
                <div className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                  <div className="p-6 bg-accent-blue text-white">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <i className="fas fa-graduation-cap text-2xl" />
                    </div>
                    <h3 className="text-lg font-heading font-bold mb-1">WCA | Learn</h3>
                    <p className="text-sm text-white font-medium">Educación abierta para todos</p>
                  </div>
                  <div className="p-6 flex-grow bg-primary-700">
                    <p className="text-sm leading-relaxed text-justify">
                      Programas de Especialización TechHuman gratuitos, con la metodología Play&Impact Learning y contenido alineado a problemas reales.
                    </p>
                  </div>
                </div>

                {/* WCA | Network */}
                <div className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                  <div className="p-6 bg-accent-red text-white">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <i className="fas fa-handshake text-2xl" />
                    </div>
                    <h3 className="text-lg font-heading font-bold mb-1">WCA | Network</h3>
                    <p className="text-sm text-white font-medium">Capacitación corporativa</p>
                  </div>
                  <div className="p-6 flex-grow bg-primary-700">
                    <p className="text-sm leading-relaxed text-justify">
                      Rutas de Transformación TechHuman para empresas e instituciones, a través del modelo TechHuman Business Learning con enfoque humano y sostenible.
                    </p>
                  </div>
                </div>

                {/* WCA | Labs */}
                <div className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                  <div className="p-6 bg-accent-yellow text-white">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <i className="fas fa-rocket text-2xl" />
                    </div>
                    <h3 className="text-lg font-heading font-bold mb-1">WCA | Labs</h3>
                    <p className="text-sm text-white font-medium">Incubadora de innovación</p>
                  </div>
                  <div className="p-6 flex-grow bg-primary-700">
                    <p className="text-sm leading-relaxed text-justify">
                      Espacio para la incubación de ideas, proyectos y soluciones tecnológicas de nuestros estudiantes con innovación e impacto social.
                    </p>
                  </div>
                </div>

                {/* WCA | Impact */}
                <div className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                  <div className="p-6 bg-accent-green text-white">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <i className="fas fa-globe-americas text-2xl" />
                    </div>
                    <h3 className="text-lg font-heading font-bold mb-1">WCA | Impact</h3>
                    <p className="text-sm text-white font-medium">Resultados de transformación</p>
                  </div>
                  <div className="p-6 flex-grow bg-primary-700">
                    <p className="text-sm leading-relaxed text-justify">
                      Métricas, casos de éxito y evidencia del cambio en personas y comunidades, alineados a ODS y al propósito de impacto con sentido.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-center text-muted font-medium mt-12 text-lg">
                <i>Aprender haciendo, crear transformando e impactar con propósito.</i>
              </p>
            </div>
          </section>
          
          {/* Team Section */}
          <TeamSection />
          
          {/* Impact */}
          <section className="bg-secondary-900 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-heading font-bold mb-6">
                  Nuestro Impacto Global
                </h2>
                <p className="text-muted mb-12">
                  Estamos orgullosos de los logros alcanzados hasta ahora, pero sabemos que nuestro trabajo apenas está comenzando. Este es solo el comienzo de algo mucho más grande.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-primary-700 rounded-xl p-8 text-center">
                  <div className="text-4xl font-bold accent-red mb-4">+120</div>
                  <h3 className="text-xl font-heading font-semibold mb-2">Estudiantes</h3>
                  <p className="text-muted">Personas de 9 países en Latinoamérica y España que han accedido a educación tecnológica de calidad.</p>
                </div>
                
                <div className="bg-primary-700 rounded-xl p-8 text-center">
                  <div className="text-4xl font-bold accent-blue mb-4">3</div>
                  <h3 className="text-xl font-heading font-semibold mb-2">Sedes</h3>
                  <p className="text-muted">Contamos con Sede en Veracruz, Nuevo León y de manera Nacional. Muy pronto abriremos más sedes.</p>
                </div>
                
                <div className="bg-primary-700 rounded-xl p-8 text-center">
                  <div className="text-4xl font-bold accent-yellow mb-4">∞</div>
                  <h3 className="text-xl font-heading font-semibold mb-2">Posibilidades</h3>
                  <p className="text-muted">Programas multidisciplinarios desde programación hasta historia, literatura, idiomas, ciencias y arte.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
