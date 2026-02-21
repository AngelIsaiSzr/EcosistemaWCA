import React, { useRef, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Componente para manejar la carga individual de cada logo
const LogoImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative h-28 w-56">
      {!isLoaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-md bg-primary-700" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "object-contain h-full w-auto max-w-full select-none transition-opacity duration-500 ease-in-out",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setIsLoaded(true)}
        draggable={false}
        style={{ background: "transparent" }}
      />
    </div>
  );
};

// Array de rutas de logos
const logos = [
    "https://i.ibb.co/DH3TZKPG/logo1-vvirpf.png",
    "https://i.ibb.co/9mjvc9Fj/logo2-wqdznp.png",
    "https://i.ibb.co/PZ2CTGm2/logo3-s02rgy.png",
    "https://i.ibb.co/RGrQC93M/logo4-ilfyy0.png",
    "https://i.ibb.co/G4FbZGLy/logo5-xq2wnf.png",
    "https://i.ibb.co/MJPggHQ/logo6-iT3Wnt.png",
    "https://i.ibb.co/fYTRxP2G/logo7-o8Mj5c.png",
    "https://i.ibb.co/XfdjR9bk/logo8-z6C9yx.png",
    "https://i.ibb.co/SwVW4MW3/logo11-b3kTz6.png"
];

// Genera una secuencia alternada de logos para llenar el ancho visible y que sea múltiplo exacto de logos.length
const getAlternatingLogos = (logos: string[], minCount: number) => {
  const arr: string[] = [];
  let i = 0;
  // Calcula el siguiente múltiplo de logos.length mayor o igual a minCount
  const total = Math.ceil(minCount / logos.length) * logos.length;
  while (arr.length < total) {
    arr.push(logos[i % logos.length]);
    i++;
  }
  return arr;
};

export const LogosCarousel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [logoCount, setLogoCount] = useState(16); // valor por defecto
  const [baseWidth, setBaseWidth] = useState(0);
  const [offset, setOffset] = useState(0);

  // Calcula cuántos logos se necesitan para cubrir al menos 3 veces el ancho visible
  useEffect(() => {
    const updateLogoCount = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Cada logo + gap (gap pequeño: 8px)
        const logoWidth = 224 + 8;
        // 3 veces el ancho visible para evitar huecos
        const minCount = Math.ceil((containerWidth * 3) / logoWidth);
        setLogoCount(minCount);
      }
    };
    updateLogoCount();
    window.addEventListener("resize", updateLogoCount);
    return () => window.removeEventListener("resize", updateLogoCount);
  }, []);

  // Triplicar la secuencia base para el bucle perfecto
  const baseLogos = getAlternatingLogos(logos, logoCount);
  const repeatedLogos = [...baseLogos, ...baseLogos, ...baseLogos];

  // Medir el ancho de la secuencia base (la longitud de baseLogos)
  useEffect(() => {
    if (trackRef.current) {
      // Suma el ancho de los primeros N hijos (baseLogos.length)
      const children = Array.from(trackRef.current.children).slice(0, baseLogos.length) as HTMLDivElement[];
      const width = children.reduce((acc, child) => acc + child.offsetWidth + 8, 0); // 8px gap
      setBaseWidth(width);
    }
  }, [logoCount]);

  // Animación profesional con JS
  useEffect(() => {
    if (!baseWidth) return;
    let start: number | null = null;
    let rafId: number;
    const speed = 80; // px por segundo

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      // Avance en píxeles
      const px = (elapsed / 1000) * speed;
      // Cuando llega al final de la secuencia base, reinicia
      if (px >= baseWidth) {
        start = timestamp;
        setOffset(0);
        rafId = requestAnimationFrame(animate);
        return;
      }
      setOffset(-px);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [baseWidth]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden py-8 bg-secondary-900 border-y-0">
      <div className="relative flex items-center justify-center">
        <div
          ref={trackRef}
          className="logos-carousel-track flex gap-2"
          style={{
            transform: `translateX(${offset}px)`,
            willChange: "transform",
          }}
        >
          {repeatedLogos.map((src, idx) => (
            <div key={idx} className="flex-shrink-0 h-32 w-56 flex items-center justify-center">
              <LogoImage src={src} alt={`Logo ${(idx % logos.length) + 1}`} />
            </div>
          ))}
        </div>
      </div>
      {/*
        NOTA: Para quitar el fondo blanco de los logos, usa imágenes PNG con fondo transparente.
        Puedes usar remove.bg o cualquier editor de imágenes para lograrlo.
      */}
    </div>
  );
};

export default LogosCarousel; 