import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Términos y Condiciones - Ecosistema WCA</title>
        <meta
          name="description"
          content="Términos y condiciones de uso de Ecosistema WCA. Conoce nuestros términos legales y condiciones de servicio."
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow py-10 bg-primary-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-heading font-bold m-8 text-center py-5">
                Términos y Condiciones
              </h1>
              
              <div className="bg-secondary-900 rounded-lg p-8 space-y-8">
                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    1. Aceptación de los Términos
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Al acceder y utilizar Ecosistema WCA, aceptas estar sujeto a estos términos y condiciones de uso. 
                    Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestros servicios.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    2. Descripción del Servicio
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    El Ecosistema WCA es una plataforma educativa que ofrece:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6">
                    <li>• Programas de todas las áreas</li>
                    <li>• Editor de código integrado</li>
                    <li>• Recursos educativos digitales</li>
                    <li>• Comunidad de aprendizaje</li>
                    <li>• Herramientas de práctica y evaluación</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    3. Uso Aceptable
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    Te comprometes a utilizar nuestros servicios únicamente para fines educativos y legales. 
                    Está prohibido:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6">
                    <li>• Usar la plataforma para actividades ilegales</li>
                    <li>• Intentar acceder a sistemas o datos no autorizados</li>
                    <li>• Interferir con el funcionamiento de la plataforma</li>
                    <li>• Compartir contenido ofensivo o inapropiado</li>
                    <li>• Suplantar la identidad de otros usuarios</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    4. Cuentas de Usuario
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    Para acceder a ciertas funciones, puedes crear una cuenta. Eres responsable de:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6">
                    <li>• Mantener la confidencialidad de tus credenciales</li>
                    <li>• Todas las actividades que ocurran bajo tu cuenta</li>
                    <li>• Notificar inmediatamente cualquier uso no autorizado</li>
                    <li>• Proporcionar información precisa y actualizada</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    5. Propiedad Intelectual
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Todo el contenido de Ecosistema WCA, incluyendo textos, gráficos, código, 
                    y software, está protegido por derechos de autor y otras leyes de propiedad intelectual. 
                    Se te otorga una licencia limitada para uso personal y educativo.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    6. Privacidad
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Tu privacidad es importante para nosotros. El uso de tu información personal 
                    se rige por nuestra Política de Privacidad, que forma parte de estos términos.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    7. Limitación de Responsabilidad
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Ecosistema WCA se proporciona "tal como está" sin garantías de ningún tipo. 
                    No nos hacemos responsables por daños directos, indirectos, incidentales o consecuentes 
                    que puedan resultar del uso de nuestros servicios.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    8. Modificaciones
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                    Los cambios entrarán en vigor inmediatamente después de su publicación. 
                    Te recomendamos revisar periódicamente estos términos.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    9. Terminación
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Podemos suspender o terminar tu acceso a nuestros servicios en cualquier momento, 
                    con o sin causa, con o sin previo aviso.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    10. Ley Aplicable
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Estos términos se rigen por las leyes de México. Cualquier disputa será resuelta 
                    en los tribunales competentes de México.
                  </p>
                </div>

                <div className="border-t border-secondary-800 pt-8">
                  <p className="text-muted text-sm">
                    <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-MX')}
                  </p>
                  <p className="text-muted text-sm mt-2">
                    Si tienes preguntas sobre estos términos, contáctanos a través de nuestra página de contacto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
} 