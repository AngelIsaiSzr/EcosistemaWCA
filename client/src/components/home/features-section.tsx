import { motion } from 'framer-motion';
import { SITE_TEXT_CLASS, useSiteContent } from '@/lib/site-content';

export default function FeaturesSection() {
  const content = useSiteContent('features');
  return (
    <section className="py-16 bg-primary-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            {content.title}
          </h2>
          <p className="text-muted max-w-3xl mx-auto">
            {content.subtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.items.map((feature, index) => (
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
              <div className={`${SITE_TEXT_CLASS[feature.color]} text-3xl mb-4`}>
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
