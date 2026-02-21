import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidad - Ecosistema WCA</title>
        <meta
          name="description"
          content="Política de privacidad de Ecosistema WCA. Conoce cómo protegemos y utilizamos tu información personal."
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow py-10 bg-primary-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-heading font-bold m-8 text-center py-5">
                Política de Privacidad
              </h1>
              
              <div className="bg-secondary-900 rounded-lg p-8 space-y-8">
                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    1. Información que Recopilamos
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    Recopilamos la siguiente información cuando utilizas Ecosistema WCA:
                  </p>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-accent-yellow">Información Personal:</h3>
                      <ul className="text-muted leading-relaxed space-y-1 ml-6">
                        <li>• Nombre y apellidos</li>
                        <li>• Dirección de correo electrónico</li>
                        <li>• Información de perfil (opcional)</li>
                        <li>• Preferencias de aprendizaje</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-accent-yellow">Información de Uso:</h3>
                      <ul className="text-muted leading-relaxed space-y-1 ml-6">
                        <li>• Páginas visitadas y tiempo de permanencia</li>
                        <li>• Cursos en los que te inscribes</li>
                        <li>• Progreso en los cursos</li>
                        <li>• Código que escribes en el editor</li>
                        <li>• Interacciones con la comunidad</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-accent-yellow">Información Técnica:</h3>
                      <ul className="text-muted leading-relaxed space-y-1 ml-6">
                        <li>• Dirección IP</li>
                        <li>• Tipo de navegador y dispositivo</li>
                        <li>• Sistema operativo</li>
                        <li>• Cookies y tecnologías similares</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    2. Cómo Utilizamos tu Información
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    Utilizamos tu información para:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6">
                    <li>• Proporcionar y mejorar nuestros servicios educativos</li>
                    <li>• Personalizar tu experiencia de aprendizaje</li>
                    <li>• Comunicarnos contigo sobre tu cuenta y cursos</li>
                    <li>• Enviar notificaciones importantes sobre la plataforma</li>
                    <li>• Analizar el uso de la plataforma para mejoras</li>
                    <li>• Prevenir fraudes y abusos</li>
                    <li>• Cumplir con obligaciones legales</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    3. Compartir Información
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    No vendemos, alquilamos ni compartimos tu información personal con terceros, excepto:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6">
                    <li>• Con tu consentimiento explícito</li>
                    <li>• Con proveedores de servicios que nos ayudan a operar la plataforma</li>
                    <li>• Para cumplir con obligaciones legales</li>
                    <li>• Para proteger nuestros derechos y seguridad</li>
                    <li>• En caso de fusión o adquisición empresarial</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    4. Cookies y Tecnologías Similares
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    Utilizamos cookies y tecnologías similares para:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6">
                    <li>• Recordar tus preferencias y configuraciones</li>
                    <li>• Mantener tu sesión activa</li>
                    <li>• Analizar el tráfico y uso de la plataforma</li>
                    <li>• Mejorar la funcionalidad del sitio</li>
                    <li>• Proporcionar contenido personalizado</li>
                  </ul>
                  <p className="text-muted leading-relaxed mt-4">
                    Puedes controlar el uso de cookies a través de la configuración de tu navegador.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    5. Seguridad de la Información
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6 mt-4">
                    <li>• Encriptación de datos en tránsito y en reposo</li>
                    <li>• Acceso restringido a información personal</li>
                    <li>• Monitoreo regular de seguridad</li>
                    <li>• Actualizaciones regulares de seguridad</li>
                    <li>• Copias de seguridad seguras</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    6. Tus Derechos
                  </h2>
                  <p className="text-muted leading-relaxed mb-4">
                    Tienes los siguientes derechos sobre tu información personal:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-2 ml-6">
                    <li>• Acceder a tu información personal</li>
                    <li>• Corregir información inexacta</li>
                    <li>• Solicitar la eliminación de tu información</li>
                    <li>• Limitar el procesamiento de tu información</li>
                    <li>• Portabilidad de datos</li>
                    <li>• Oponerte al procesamiento</li>
                    <li>• Retirar el consentimiento</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    7. Retención de Datos
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Conservamos tu información personal solo durante el tiempo necesario para los fines 
                    descritos en esta política, o según lo requiera la ley. Cuando ya no necesitemos 
                    tu información, la eliminaremos de forma segura.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    8. Menores de Edad
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Ecosistema WCA no está dirigido a menores de 13 años. No recopilamos 
                    intencionalmente información personal de menores de 13 años. Si eres padre 
                    o tutor y crees que tu hijo nos ha proporcionado información personal, 
                    contáctanos inmediatamente.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    9. Cambios en esta Política
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos 
                    sobre cambios significativos por correo electrónico o mediante un aviso en la plataforma. 
                    Te recomendamos revisar esta política periódicamente.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-heading font-semibold mb-4 text-accent-blue">
                    10. Contacto
                  </h2>
                  <p className="text-muted leading-relaxed">
                    Si tienes preguntas sobre esta política de privacidad o sobre el tratamiento 
                    de tu información personal, contáctanos a través de:
                  </p>
                  <ul className="text-muted leading-relaxed space-y-1 ml-6 mt-4">
                    <li>• Nuestra página de contacto</li>
                    <li>• Correo electrónico: privacidad@webcodeacademy.com.mx</li>
                    <li>• Redes sociales oficiales</li>
                  </ul>
                </div>

                <div className="border-t border-secondary-800 pt-8">
                  <p className="text-muted text-sm">
                    <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-MX')}
                  </p>
                  <p className="text-muted text-sm mt-2">
                    Esta política de privacidad es efectiva a partir de la fecha de publicación.
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