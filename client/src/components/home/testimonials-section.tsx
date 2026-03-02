import { useQuery } from '@tanstack/react-query';
import { Testimonial } from '@shared/schema';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function TestimonialsSection() {
  const { data: testimonials, isLoading, error } = useQuery<Testimonial[]>({
    queryKey: ['/api/testimonials'],
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedTestimonials, setDisplayedTestimonials] = useState<Testimonial[]>([]);
  
  // Set up automatic testimonial rotation
  useEffect(() => {
    if (testimonials && testimonials.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex + 3 >= testimonials.length ? 0 : prevIndex + 3
        );
      }, 10000); // 10 segundos
      return () => clearInterval(interval);
    }
  }, [testimonials]);
  
  // Update displayed testimonials when currentIndex changes or data loads
  useEffect(() => {
    if (testimonials && testimonials.length > 0) {
      // Ordenar testimonios por el campo order
      const sortedTestimonials = [...testimonials].sort((a, b) => a.order - b.order);
      const endIndex = Math.min(currentIndex + 3, sortedTestimonials.length);
      setDisplayedTestimonials(sortedTestimonials.slice(currentIndex, endIndex));
    }
  }, [testimonials, currentIndex]);

  const handleDotClick = (index: number) => {
    if (testimonials) {
      const adjustedIndex = Math.floor(index / 3) * 3;
      setCurrentIndex(adjustedIndex);
    }
  };

  return (
    <section className="py-20 bg-primary-700">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Lo que dicen nuestros estudiantes</h2>
          <p className="text-muted max-w-2xl mx-auto">Descubre cómo el Ecosistema WCA ha transformado la vida y el aprendizaje de nuestros alumnos.</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-accent-blue" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-heading font-semibold mb-2">Error al cargar testimonios</h3>
            <p className="text-muted">Lo sentimos, ha ocurrido un error al cargar los testimonios. Inténtalo de nuevo más tarde.</p>
          </div>
        ) : testimonials && testimonials.length > 0 ? (
          <>
            {/* Animación suave de los grupos de testimonios */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                {displayedTestimonials.map((testimonial) => (
                  <div 
                    key={testimonial.id}
                    className="bg-primary-800 rounded-xl p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <img 
                          src={testimonial.image} 
                          alt={testimonial.name} 
                          className="w-12 h-12 rounded-full mr-4 object-cover"
                        />
                        <div>
                          <h3 className="font-medium">{testimonial.name}</h3>
                          <p className="text-muted text-sm">Estudiante de {testimonial.courseName}</p>
                        </div>
                      </div>
                      <div className="text-accent-yellow">
                        {[...Array(5)].map((_, i) => (
                          <i 
                            key={i} 
                            className={`fas ${i < testimonial.rating ? 'fa-star' : i === Math.floor(testimonial.rating) && testimonial.rating % 1 !== 0 ? 'fa-star-half-alt' : 'fa-star text-muted opacity-30'}`}
                          ></i>
                        ))}
                      </div>
                    </div>
                    <p className="text-muted">"{testimonial.text}"</p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Pagination dots */}
            {testimonials.length > 3 && (
              <div className="flex justify-center mt-8 space-x-2">
                {[...Array(Math.ceil(testimonials.length / 3))].map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => handleDotClick(i * 3)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i * 3 === currentIndex ? 'bg-accent-blue w-6' : 'bg-muted'
                    }`}
                    aria-label={`Ver testimonios página ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-heading font-semibold mb-2">No hay testimonios disponibles</h3>
            <p className="text-muted">Los testimonios de nuestros estudiantes estarán disponibles próximamente.</p>
          </div>
        )}
      </div>
    </section>
  );
}
