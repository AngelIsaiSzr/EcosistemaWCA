import { Link } from 'wouter';
import { getSocialLinks, useSiteContent } from '@/lib/site-content';
import { SmartLink } from '@/components/ui/smart-link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footer = useSiteContent('footer');
  const contact = useSiteContent('contact');
  
  return (
    <footer className="bg-primary-900 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center mb-6">
              <div className="accent-blue mr-2">
                <img src="https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png" alt="Ecosistema WCA" className="w-8 h-8" />
              </div>
              <span className="font-heading font-bold text-xl text-accent-blue" style={{ fontFamily: 'Cocomat Pro, sans-serif' }}>Ecosistema WCA</span>
            </div>
            <p className="text-muted mb-6 text-justify pr-0 xl:pr-11">
              {footer.description}
            </p>
            <div className="flex space-x-4">
              {getSocialLinks(contact).map((social) => (
                <a key={social.id} href={social.href} target="_blank" rel="noopener noreferrer" className={`text-muted ${social.footerHover}`} aria-label={`Síguenos en ${social.label}`}>
                  <i className={social.icon}></i>
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">Enlaces Rápidos</h3>
            <ul className="space-y-4">
              <li><Link href="/" className="text-muted hover-accent-blue">Inicio</Link></li>
              <li><Link href="/programs" className="text-muted hover-accent-blue">Programas</Link></li>
              <li><Link href="/about" className="text-muted hover-accent-blue">Acerca de</Link></li>
              <li><Link href="/contact" className="text-muted hover-accent-blue">Contacto</Link></li>
              <li><Link href="/editor" className="text-muted hover-accent-blue">Editor</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">Programas</h3>
            <ul className="space-y-4">
              <li><Link href="/programs/web-development" className="text-muted hover-accent-blue">Desarrollo Web</Link></li>
              <li><Link href="/programs/discover-computing" className="text-muted hover-accent-blue">Descubre la Computación</Link></li>
              <li><Link href="/programs/first-steps-in-python" className="text-muted hover-accent-blue">Primeros Pasos en Python</Link></li>
              <li><Link href="/programs" className="text-muted hover-accent-blue">Edición de Video</Link></li>
              <li><Link href="/programs" className="text-muted hover-accent-blue">Desarrollo Móvil</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">Recursos</h3>
            <ul className="space-y-4">
              {footer.resources.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  <SmartLink href={item.href} className="text-muted hover-accent-blue">{item.label}</SmartLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-secondary-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted text-sm mb-4 md:mb-0">
              © {currentYear} {footer.copyright}
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
