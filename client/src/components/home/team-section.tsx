import { useQuery } from '@tanstack/react-query';
import { Team } from '@shared/schema';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function TeamSection() {
  const { data: team, isLoading, error } = useQuery<Team[]>({
    queryKey: ['/api/team'],
  });

  return (
    <section id="equipo" className="py-20 bg-primary-800">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Nuestro Equipo</h2>
          <p className="text-muted max-w-2xl mx-auto">Conoce a los profesionales apasionados que hacen posible al Ecosistema WCA.</p>
        </motion.div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-accent-blue" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-heading font-semibold mb-2">Error al cargar el equipo</h3>
            <p className="text-muted">Lo sentimos, ha ocurrido un error al cargar información del equipo. Inténtalo de nuevo más tarde.</p>
          </div>
        ) : team && team.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div 
                key={member.id}
                className="bg-primary-700 rounded-xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 0.9 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <img 
                  src={member.image} 
                  alt={`${member.name} - ${member.role}`} 
                  className="w-full aspect-square object-cover object-center"
                />
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold mb-1">{member.name}</h3>
                  <p className={`${getRoleColor(member.role)} font-medium text-sm mb-3`}>{member.role}</p>
                  <p className="text-muted text-sm mb-4">{member.bio}</p>
                  <div className="flex space-x-3">
                    {member.linkedIn && (
                      <a 
                        href={member.linkedIn} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-muted hover:text-accent-blue transition-colors"
                        aria-label="Sigueme en LinkedIn"
                      >
                        <i className="fab fa-linkedin-in"></i>
                      </a>
                    )}
                    {member.github && (
                      <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-muted hover:text-accent-blue transition-colors"
                        aria-label="Sigueme en GitHub"
                      >
                        <i className="fab fa-github"></i>
                      </a>
                    )}
                    {member.twitter && (
                      <a 
                        href={member.twitter} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-muted hover:text-accent-blue transition-colors"
                        aria-label="Sigueme en Twitter"
                      >
                        <i className="fab fa-twitter"></i>
                      </a>
                    )}
                    {member.instagram && (
                      <a 
                        href={member.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-muted hover:text-accent-red transition-colors"
                        aria-label="Sigueme en Instagram"
                      >
                        <i className="fab fa-instagram"></i>
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-heading font-semibold mb-2">Equipo no disponible</h3>
            <p className="text-muted">La información del equipo estará disponible próximamente.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// Función auxiliar para obtener el color de texto apropiado según el rol
function getRoleColor(role: string): string {
  const roleMap: { [key: string]: string } = {
    'CEO & Fundador': 'accent-blue',
    'COO & CoFundadora': 'accent-red',
    'CMO': 'accent-yellow',
    'CIO': 'accent-blue',
    'CFO': 'accent-red',
    'CTO': 'accent-blue',
    'CSO': 'accent-yellow',
    'Técnico de Soporte Educativo': 'accent-blue',
    'Instructor Principal': 'accent-blue',
    'Instructor': 'accent-red',
    'Desarrollador': 'accent-yellow'
  };
  
  return roleMap[role] || 'accent-blue';
}
