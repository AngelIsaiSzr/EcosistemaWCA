import { Link } from 'wouter';
import { motion } from 'framer-motion';

export default function CtaSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-secondary-900 to-primary-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=1489&q=80')] opacity-[0.1] bg-center bg-cover"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-secondary-900 to-primary-800 opacity-90"></div>
      
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">¿Listo para ser parte de la revolución educativa?</h2>
          <p className="text-muted max-w-2xl mx-auto mb-10">
            Únete a más de 120 estudiantes que ya están transformando su futuro profesional con nuestros programas de especialización.
          </p>
          
          <motion.div 
            className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/programs" className="px-8 py-4 bg-accent-blue text-white font-medium rounded-md hover:opacity-90 transition-colors inline-block">
              Explorar Programas
            </Link>
            <Link href="/contact" className="px-8 py-4 border border-accent-blue text-accent-blue font-medium rounded-md hover:bg-accent-blue hover:text-white transition-colors inline-block">
              Únete a la Revolución
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
