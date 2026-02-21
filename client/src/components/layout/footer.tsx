import { Link } from 'wouter';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-primary-900 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center mb-6">
              <div className="accent-blue mr-2">
                <i className="fas fa-code text-2xl"></i>
              </div>
              <span className="font-heading font-bold text-xl">Ecosistema WCA</span>
            </div>
            <p className="text-muted mb-6">
              La Primera Academia Tecnológica, Multidisciplinaria y Colaborativa 100% Gratuita, comprometida con la educación de calidad y la reducción del analfabetismo digital creciente en el mundo.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com/webcodeacademy0" target="_blank" rel="noopener noreferrer" className="text-muted hover-accent-blue" aria-label="Síguenos en Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://instagram.com/webcodeacademy0" target="_blank" rel="noopener noreferrer" className="text-muted hover-accent-red" aria-label="Síguenos en Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://youtube.com/@webcodeacademy0" target="_blank" rel="noopener noreferrer" className="text-muted hover-accent-red" aria-label="Síguenos en YouTube">
                <i className="fab fa-youtube"></i>
              </a>
              <a href="https://linkedin.com/in/webcodeacademy0/" target="_blank" rel="noopener noreferrer" className="text-muted hover-accent-blue" aria-label="Síguenos en LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">Enlaces Rápidos</h3>
            <ul className="space-y-4">
              <li><Link href="/" className="text-muted hover-accent-blue">Inicio</Link></li>
              <li><Link href="/courses" className="text-muted hover-accent-blue">Cursos</Link></li>
              <li><Link href="/about" className="text-muted hover-accent-blue">Acerca de</Link></li>
              <li><Link href="/contact" className="text-muted hover-accent-blue">Contacto</Link></li>
              <li><Link href="/editor" className="text-muted hover-accent-blue">Editor</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">Cursos</h3>
            <ul className="space-y-4">
              <li><Link href="/courses/web-development" className="text-muted hover-accent-blue">Desarrollo Web</Link></li>
              <li><Link href="/courses/discover-computing" className="text-muted hover-accent-blue">Descubre la Computación</Link></li>
              <li><Link href="/courses/first-steps-in-python" className="text-muted hover-accent-blue">Primeros Pasos en Python</Link></li>
              <li><Link href="/courses" className="text-muted hover-accent-blue">Edición de Video</Link></li>
              <li><Link href="/courses" className="text-muted hover-accent-blue">Desarrollo Móvil</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">Recursos</h3>
            <ul className="space-y-4">
              <li><a href="https://drive.google.com/file/d/1OkukNqN_7wmUU87TpI1jMkoPfpOT2fdQ/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-muted hover-accent-blue">Historia, Origen y Propósito</a></li>
              <li><a href="https://youtube.com/playlist?list=PLv1UrQWkBmdladnWqAqN8boVGfhH4BUNq&si=SoH0nOup6Bat2pK9" className="text-muted hover-accent-blue">Tutoriales</a></li>
              <li><a href="/merch" target="_blank" rel="noopener noreferrer" className="text-muted hover-accent-blue">Merch Oficial</a></li>
              <li><a href="#" className="text-muted hover-accent-blue">Documentación</a></li>
              <li><a href="#" className="text-muted hover-accent-blue">Blog y Comunidad</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-secondary-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted text-sm mb-4 md:mb-0">
              © {currentYear} Ecosistema WCA. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6">
              <Link href="/terms" className="text-muted hover-accent-blue text-sm">Términos y Condiciones</Link>
              <Link href="/privacy" className="text-muted hover-accent-blue text-sm">Política de Privacidad</Link>
              <Link href="/cookies" className="text-muted hover-accent-blue text-sm">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
