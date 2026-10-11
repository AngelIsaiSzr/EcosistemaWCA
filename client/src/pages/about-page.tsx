import { useEffect } from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import TeamSection from "@/components/home/team-section";
import { SITE_URL } from "@/utils/titles";
import { RichText, SITE_BG_CLASS, SITE_TEXT_CLASS, useSiteContent } from "@/lib/site-content";

const ABOUT_IMAGES = [
  "/media/about1-cy3qzm.jpg",
  "/media/about2-rxuu0v.jpg",
] as const;

const aboutImageCache = new Map<string, HTMLImageElement>();

function preloadAboutImages() {
  if (typeof window === "undefined") return;
  for (const src of ABOUT_IMAGES) {
    if (aboutImageCache.has(src)) continue;
    const image = new Image();
    image.src = src;
    aboutImageCache.set(src, image);
    void image.decode?.().catch(() => undefined);
  }
}

export default function AboutPage() {
  const intro = useSiteContent("aboutIntro");
  const mission = useSiteContent("mission");
  const history = useSiteContent("aboutHistory");
  const divisions = useSiteContent("aboutDivisions");
  const impact = useSiteContent("aboutImpact");

  useEffect(() => {
    preloadAboutImages();
  }, []);

  return (
    <>
      <Helmet>
        <title>Acerca de - Ecosistema WCA | Primera Academia Tecnológica, Multidisciplinaria y Colaborativa</title>
        <meta 
          name="description" 
          content="Conoce la evolución de World Community Academy, la primera academia tecnológica multidisciplinaria y colaborativa que revoluciona la educación del siglo XXI."
        />
        <link rel="canonical" href={`${SITE_URL}/about`} />
        <meta property="og:url" content={`${SITE_URL}/about`} />
        {ABOUT_IMAGES.map((src) => (
          <link key={src} rel="preload" as="image" href={src} />
        ))}
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="bg-secondary-900 py-20 pb-10 md:pb-20">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-heading font-bold mt-6 mb-4">
                  {intro.heroTitle}
                </h1>
                <p className="text-muted text-lg">
                  {intro.heroSubtitle}
                </p>
              </div>
            </div>
          </section>
          
          {/* Mission & Vision */}
          <section className="bg-primary-800 py-16">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="w-full md:w-1/2 order-2 md:order-1">
                  <h2 className="text-3xl font-heading font-bold mb-6">
                    {intro.missionTitle}
                  </h2>
                  <p className="text-muted mb-6 text-justify">
                    <RichText text={intro.missionText} />
                  </p>
                  
                  <h3 className="text-xl font-heading font-semibold mb-4">
                    {intro.methodologyTitle}
                  </h3>
                  <p className="text-muted mb-4 text-justify">
                    <RichText text={intro.methodologyText} />
                  </p>

                  {mission.sdgs.length > 0 && (
                    <>
                      <p className="mb-4 text-justify">
                        {intro.sdgIntro}
                      </p>
                      
                      <div className="flex flex-wrap gap-4">
                        {mission.sdgs.map((sdg, i) => (
                          <div key={`${sdg.number}-${i}`} className="px-3 py-2 bg-primary-700 rounded-lg text-sm flex items-center">
                            <span className={`w-6 h-6 flex items-center justify-center ${SITE_BG_CLASS[sdg.color]} rounded-full mr-2 text-xs font-bold text-white`}>{sdg.number}</span>
                            {sdg.label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="w-full md:w-1/2 order-1 md:order-2">
                  <img 
                    src={ABOUT_IMAGES[0]} 
                    alt="Misión del Ecosistema WCA" 
                    className="rounded-xl shadow-lg"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                </div>
              </div>
            </div>
          </section>
          
          {/* Evolution & Values */}
          <section className="bg-secondary-900 py-16">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="w-full md:w-1/2">
                  <img 
                    src={ABOUT_IMAGES[1]}
                    alt="Evolución del Ecosistema WCA" 
                    className="rounded-xl shadow-lg"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                
                <div className="w-full md:w-1/2">
                  <h2 className="text-3xl font-heading font-bold mb-6">
                    {history.title}
                  </h2>
                  {history.paragraphs.map((paragraph, i) => (
                    <p key={i} className="text-muted mb-6 text-justify">
                      <RichText text={paragraph} />
                    </p>
                  ))}
                  
                  {history.values.length > 0 && (
                    <>
                      <h3 className="text-xl font-heading font-semibold mb-4">
                        {history.valuesTitle}
                      </h3>
                      
                      <div className="space-y-4">
                        {history.values.map((value, i) => (
                          <div key={`${value.title}-${i}`} className="flex items-start">
                            <div className={`${SITE_TEXT_CLASS[value.color]} mr-4 mt-1 w-5 shrink-0 text-center`}>
                              <i className={value.icon}></i>
                            </div>
                            <div>
                              <h4 className="font-medium">{value.title}</h4>
                              <p className="text-muted text-sm text-justify">{value.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
          
          {/* WCA Ecosystem Divisions */}
          <section className="bg-primary-900 py-16">
            <div className="container mx-auto px-4 relative z-10">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
                {divisions.title}
              </h2>
              <p className="text-center text-muted max-w-2xl mx-auto mb-14">
                {divisions.subtitle}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 px-6">
                {divisions.items.map((division, i) => (
                  <div key={`${division.name}-${i}`} className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                    <div className={`p-6 ${SITE_BG_CLASS[division.color]} text-white`}>
                      <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                        <i className={`${division.icon} text-2xl`} />
                      </div>
                      <h3 className="text-lg font-heading font-bold mb-1">{division.name}</h3>
                      <p className="text-sm text-white font-medium">{division.tagline}</p>
                    </div>
                    <div className="p-6 flex-grow bg-primary-700">
                      <p className="text-sm leading-relaxed text-justify">
                        {division.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {divisions.quote && (
                <p className="text-center text-muted font-medium mt-12 text-lg">
                  <i>{divisions.quote}</i>
                </p>
              )}
            </div>
          </section>
          
          {/* Team Section */}
          <TeamSection />
          
          {/* Impact */}
          <section className="bg-secondary-900 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-heading font-bold mb-6">
                  {impact.title}
                </h2>
                <p className="text-muted mb-12">
                  {impact.text}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {impact.stats.map((stat, i) => (
                  <div key={`${stat.label}-${i}`} className="bg-primary-700 rounded-xl p-8 text-center">
                    <div className={`text-4xl font-bold ${SITE_TEXT_CLASS[stat.color]} mb-4`}>{stat.value}</div>
                    <h3 className="text-xl font-heading font-semibold mb-2">{stat.label}</h3>
                    <p className="text-muted">{stat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
