import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { RichText, SITE_BG_CLASS, useSiteContent } from '@/lib/site-content';

export default function AboutSection() {
  const mission = useSiteContent('mission');
  return (
    <section id="acerca" className="py-20 bg-secondary-900">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <motion.div 
            className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-10"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src="/media/about3-yw5df.webp" 
              alt="Misión del Ecosistema WCA" 
              className="rounded-xl shadow-lg"
            />
          </motion.div>
          
          <motion.div 
            className="w-full md:w-1/2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">{mission.title}</h2>
            <p className="text-muted mb-6 text-justify">
              <RichText text={mission.text} />
            </p>
            
            {mission.sdgs.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-heading font-semibold mb-4">{mission.sdgTitle}</h3>
                
                <div className="flex flex-wrap gap-4">
                  {mission.sdgs.map((sdg, i) => (
                    <div key={`${sdg.number}-${i}`} className="px-3 py-2 bg-primary-800 rounded-lg text-sm flex items-center">
                      <span className={`w-6 h-6 flex items-center justify-center ${SITE_BG_CLASS[sdg.color]} rounded-full mr-2 text-xs font-bold text-white`}>{sdg.number}</span>
                      {sdg.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-xl font-heading font-semibold mb-4">{mission.commitmentTitle}</h3>
              <p className="text-muted mb-6 text-justify">
                <RichText text={mission.commitmentText} />
              </p>
              
              {mission.linkLabel && (
                <Link href="/about" className="text-accent-blue underline-effect">
                  {mission.linkLabel}
                  <i className="fas fa-arrow-right ml-2"></i>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
