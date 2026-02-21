import { Helmet } from "react-helmet";
import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from 'framer-motion';
import { apiRequest } from "@/lib/queryClient";

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <>
      <Helmet>
        <title>Ecosistema WCA</title>
        <meta
          name="description"
          content="Contáctanos para obtener más información sobre nuestros cursos o para cualquier consulta que tengas."
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow">
          {/* Header */}
          <section className="bg-secondary-900 py-20 pb-10 md:pb-20">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-heading font-bold mt-6 mb-4">
                  Contacto
                </h1>
                <p className="text-muted text-lg">
                  ¿Tienes alguna pregunta o sugerencia? Estamos aquí para ayudarte.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-primary-800 py-16">
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
                      <div className="accent-red mr-4 mt-1">
                        <i className="fas fa-map-marker-alt text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">Ubicación</h3>
                        <p className="text-muted">Papantla de Olarte, Ver, MX</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="accent-blue mr-4 mt-1">
                        <i className="fas fa-envelope text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">Email</h3>
                        <p className="text-muted">info@webcodeacademy.com.mx</p>
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
                      <a href="https://facebook.com/webcodeacademy0" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-blue hover:text-white transition-colors" aria-label="Síguenos en Facebook">
                        <i className="fab fa-facebook-f"></i>
                      </a>
                      <a href="https://x.com/webcodeacademy0" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-yellow hover:text-white transition-colors" aria-label="Síguenos en Twitter">
                        <i className="fab fa-twitter"></i>
                      </a>
                      <a href="https://instagram.com/webcodeacademy0" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-red hover:text-white transition-colors" aria-label="Síguenos en Instagram">
                        <i className="fab fa-instagram"></i>
                      </a>
                      <a href="https://linkedin.com/in/webcodeacademy0" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-blue hover:text-white transition-colors" aria-label="Síguenos en LinkedIn">
                        <i className="fab fa-linkedin-in"></i>
                      </a>
                      <a href="https://youtube.com/@webcodeacademy0" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center text-muted hover:bg-accent-red hover:text-primary-900 transition-colors" aria-label="Síguenos en YouTube">
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

          {/* FAQ Section */}
          <section className="bg-secondary-900 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-heading font-bold mb-10 text-center">
                  Preguntas Frecuentes
                </h2>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-b border-primary-700">
                    <AccordionTrigger className="text-xl font-heading font-semibold px-6 py-4 bg-primary-700 rounded-t-xl hover:no-underline">
                      ¿Los cursos son realmente gratuitos?
                    </AccordionTrigger>
                    <AccordionContent className="bg-primary-700 px-6 pb-6 rounded-b-xl text-muted">
                      Sí, todos nuestros cursos son 100% gratuitos. Nuestro objetivo es combatir el analfabetismo digital y hacer que la educación tecnológica sea accesible para todos, independientemente de su situación económica.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="border-b border-primary-700 mt-4">
                    <AccordionTrigger className="text-xl font-heading font-semibold px-6 py-4 bg-primary-700 rounded-t-xl hover:no-underline">
                      ¿Cómo funcionan las clases mixtas?
                    </AccordionTrigger>
                    <AccordionContent className="bg-primary-700 px-6 pb-6 rounded-b-xl text-muted">
                      Ofrecemos clases tanto presenciales como virtuales. Las clases virtuales se transmiten en vivo y también quedan grabadas para que puedas revisarlas en cualquier momento. Las clases presenciales se realizan en alguna de nuestras sedes.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="border-b border-primary-700 mt-4">
                    <AccordionTrigger className="text-xl font-heading font-semibold px-6 py-4 bg-primary-700 rounded-t-xl hover:no-underline">
                      ¿Recibo algún certificado al completar un curso?
                    </AccordionTrigger>
                    <AccordionContent className="bg-primary-700 px-6 pb-6 rounded-b-xl text-muted">
                      Sí, al completar satisfactoriamente un curso, recibirás un certificado digital que acredita tus habilidades y conocimientos adquiridos además de una carta de recomendación. Este certificado puede ser añadido a tu currículum y perfil de LinkedIn.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="border-b border-primary-700 mt-4">
                    <AccordionTrigger className="text-xl font-heading font-semibold px-6 py-4 bg-primary-700 rounded-t-xl hover:no-underline">
                      ¿Necesito conocimientos previos para tomar los cursos?
                    </AccordionTrigger>
                    <AccordionContent className="bg-primary-700 px-6 pb-6 rounded-b-xl text-muted">
                      No necesariamente. Tenemos cursos diseñados para todos los niveles, desde principiantes absolutos hasta programadores con experiencia. Cada curso indica claramente el nivel de conocimientos previos recomendado.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5" className="border-b border-primary-700 mt-4">
                    <AccordionTrigger className="text-xl font-heading font-semibold px-6 py-4 bg-primary-700 rounded-t-xl hover:no-underline">
                      ¿Cómo puedo apoyar a Ecosistema WCA?
                    </AccordionTrigger>
                    <AccordionContent className="bg-primary-700 px-6 pb-6 rounded-b-xl text-muted">
                      Puedes apoyarnos compartiendo nuestros cursos con otras personas, participando activamente en nuestra comunidad, a través de donaciones, o si eres un profesional de la tecnología, considerando unirte como facilitador o instructor. Contáctanos para más información.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
