import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { insertContactSchema } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Define form schema using existing schema from shared/schema.ts
type ContactFormValues = z.infer<typeof insertContactSchema>;

export default function ContactSection() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set up form with validation
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: '',
      email: '',
      message: ''
    }
  });

  // Contact form mutation
  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const res = await apiRequest("POST", "/api/contact", data);
      const jsonResponse = await res.json();
      if (!res.ok) {
        throw new Error(jsonResponse.message || "Error al enviar el mensaje");
      }
      return jsonResponse;
    },
    onSuccess: () => {
      toast({
        title: "¡Mensaje enviado!",
        description: "Gracias por contactarnos. Te responderemos a la brevedad.",
      });
      form.reset();
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Hubo un error al enviar el mensaje. Por favor intenta de nuevo.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  const onSubmit = (data: ContactFormValues) => {
    setIsSubmitting(true);
    contactMutation.mutate(data);
  };

  return (
    <section id="contacto" className="py-20 bg-primary-800">
      <div className="container mx-auto px-10">
        <div className="flex flex-col md:flex-row items-start">
          <motion.div 
            className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-10"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Envíanos un mensaje</h2>
            <p className="text-muted mb-6">
              Si tienes alguna pregunta, sugerencia o simplemente quieres saludarnos, completa el formulario y te responderemos lo antes posible. ¡Estamos ansiosos por escucharte!
            </p>
            
            <div className="space-y-6 mb-10">
              <div className="flex items-start">
                <div className="accent-red ml-1 mr-4 mt-1">
                  <i className="fas fa-map-marker-alt text-xl"></i>
                </div>
                <div>
                  <h3 className="font-medium text-lg">Ubicación</h3>
                  <p className="text-muted">Monterrey, Nuevo León, MX</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="accent-blue mr-4 mt-1">
                  <i className="fas fa-envelope text-xl"></i>
                </div>
                <div>
                  <h3 className="font-medium text-lg">Email</h3>
                  <p className="text-muted">info@ecosistemawca.com</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="accent-yellow mr-4 mt-1">
                  <i className="fas fa-phone-alt text-xl"></i>
                </div>
                <div>
                  <h3 className="font-medium text-lg">Teléfono</h3>
                  <p className="text-muted">+52 784 110 0108</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-3">Síguenos</h3>
              <div className="flex space-x-4">
                <a href="https://facebook.com/ecosistemawca" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-red hover:text-white transition-colors" aria-label="Síguenos en Facebook">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="https://x.com/ecosistemawca" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-blue hover:text-white transition-colors" aria-label="Síguenos en Twitter">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="https://instagram.com/ecosistemawca" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-red hover:text-white transition-colors" aria-label="Síguenos en Instagram">
                  <i className="fab fa-instagram"></i>
                </a>
                <a href="https://linkedin.com/in/ecosistemawca" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-blue hover:text-white transition-colors" aria-label="Síguenos en LinkedIn">
                  <i className="fab fa-linkedin-in"></i>
                </a>
                <a href="https://youtube.com/@ecosistemawca" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-yellow hover:text-primary-900 transition-colors" aria-label="Síguenos en YouTube">
                  <i className="fab fa-youtube"></i>
                </a>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-primary-700 rounded-xl p-6 md:p-8">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block mb-2 text-sm font-medium">Nombre</label>
                  <input 
                    type="text" 
                    id="name"
                    {...form.register('name')}
                    className="w-full p-3 bg-primary-800 border border-secondary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue text-light" 
                    placeholder="Tu nombre"
                  />
                  {form.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium">Correo electrónico</label>
                  <input 
                    type="email" 
                    id="email"
                    {...form.register('email')}
                    className="w-full p-3 bg-primary-800 border border-secondary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue text-light" 
                    placeholder="tu@email.com"
                  />
                  {form.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="message" className="block mb-2 text-sm font-medium">Mensaje</label>
                  <textarea 
                    id="message"
                    {...form.register('message')}
                    rows={3} 
                    className="w-full p-3 bg-primary-800 border border-secondary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue text-light" 
                    placeholder="¿En qué podemos ayudarte?"
                  ></textarea>
                  {form.formState.errors.message && (
                    <p className="mt-1 text-sm text-red-500">{form.formState.errors.message.message}</p>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-accent-blue text-white font-medium rounded-md hover:opacity-90 transition-colors flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar mensaje'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
