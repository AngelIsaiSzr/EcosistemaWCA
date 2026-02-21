import { motion } from 'framer-motion';

const features = [
  {
    icon: 'fas fa-laptop-code',
    title: 'Academia Multidisciplinaria',
    description: 'Cursos de computación, historia, literatura, idiomas, matemáticas, arte digital y más, todos con tecnología como eje transversal.',
    color: 'accent-red'
  },
  {
    icon: 'fas fa-hands-helping',
    title: 'Colaborativa y Descentralizada',
    description: 'Abrimos nuestras puertas a otros proyectos educativos y con impacto social para construir juntos una comunidad educativa diversa.',
    color: 'accent-blue'
  },
  {
    icon: 'fas fa-graduation-cap',
    title: 'Metodología de Aprendizaje',
    description: 'Aprende jugando toda la vida con nuestra metodología educativa, integrando ODS y proyectos que resuelven problemas reales.',
    color: 'accent-yellow'
  },
  {
    icon: 'fas fa-vr-cardboard',
    title: 'Tecnología Avanzada',
    description: 'Desde presentaciones y diapositivas hasta Realidad Virtual, Realidad Aumentada e Inteligencia Artificial en cada curso.',
    color: 'accent-blue'
  },
  {
    icon: 'fas fa-globe-americas',
    title: 'Impacto Global',
    description: 'Más de 120 estudiantes de 9 países en Latinoamérica y España, formando agentes de cambio para el desarrollo sostenible.',
    color: 'accent-yellow'
  },
  {
    icon: 'fas fa-certificate',
    title: 'Certificaciones Conjuntas',
    description: 'Certificaciones avaladas por Ecosistema WCA y los proyectos que imparten cada curso, reconocimiento de calidad internacional.',
    color: 'accent-red'
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-16 bg-primary-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            ¿Por qué elegir Ecosistema WCA?
          </h2>
          <p className="text-muted max-w-3xl mx-auto">
            Somos la primera academia tecnológica multidisciplinaria y colaborativa 100% gratuita que revoluciona la educación del siglo XXI
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-primary-700 rounded-xl p-8 transform transition hover:scale-105"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.5,
                delay: index * 0.1
              }}
            >
              <div className={`text-${feature.color} text-3xl mb-4`}>
                <i className={feature.icon}></i>
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
