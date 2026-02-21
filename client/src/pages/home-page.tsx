import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/home/hero-section";
import FeaturesSection from "@/components/home/features-section";
import CoursesSection from "@/components/home/courses-section";
import CourseDetailPreview from "@/components/home/course-detail-preview";
import AboutSection from "@/components/home/about-section";
import TeamSection from "@/components/home/team-section";
import TestimonialsSection from "@/components/home/testimonials-section";
import CtaSection from "@/components/home/cta-section";
import { useEffect, useState } from "react";
import LogosCarousel from "@/components/home/logos-carousel";
import FlagsCarousel from "@/components/home/flags-carousel";

export default function HomePage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simplemente marcamos como listo el componente
      setIsReady(true);

    // Cleanup 
    return () => {
      setIsReady(false);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Ecosistema WCA</title>
        <meta
          name="description"
          content="La Primera Academia Tecnológica, Multidisciplinaria y Colaborativa 100% Gratuita que busca combatir el analfabetismo digital creciente en el mundo, brindando educación tecnológica gratuita, accesible y de calidad para todas las personas."
        />
      </Helmet>

      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Navbar />

        <main className="flex-grow overflow-x-hidden">
          {isReady && (
            <>
              <HeroSection />
              <LogosCarousel />
              <FeaturesSection />
              <CoursesSection />
              <CourseDetailPreview />
              <AboutSection />
              <TeamSection />
              <TestimonialsSection />
              <CtaSection />
              <FlagsCarousel />
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
