import React, { useRef, useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Ally } from "@shared/schema";

import { resolveMediaUrl } from "@shared/media-url";

const LogoImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const resolved = resolveMediaUrl(src);

  return (
    <div className="relative h-28 w-56">
      {!isLoaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-md bg-primary-700" />
      )}
      <img
        src={resolved}
        alt={alt}
        className={cn(
          "object-contain h-full w-auto max-w-full select-none transition-opacity duration-500 ease-in-out",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{ background: "transparent" }}
      />
    </div>
  );
};

const getAlternatingLogos = (items: Ally[], minCount: number) => {
  if (items.length === 0) return [] as Ally[];
  const arr: Ally[] = [];
  let i = 0;
  const total = Math.ceil(minCount / items.length) * items.length;
  while (arr.length < total) {
    arr.push(items[i % items.length]);
    i++;
  }
  return arr;
};

export const LogosCarousel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [logoCount, setLogoCount] = useState(16);
  const [baseWidth, setBaseWidth] = useState(0);
  const [offset, setOffset] = useState(0);

  const { data: allies = [], isLoading } = useQuery<Ally[]>({
    queryKey: ["/api/allies"],
  });

  const logos = useMemo(
    () => [...allies].sort((a, b) => a.order - b.order),
    [allies],
  );

  useEffect(() => {
    const updateLogoCount = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const logoWidth = 224 + 8;
        const minCount = Math.ceil((containerWidth * 3) / logoWidth);
        setLogoCount(minCount);
      }
    };
    updateLogoCount();
    window.addEventListener("resize", updateLogoCount);
    return () => window.removeEventListener("resize", updateLogoCount);
  }, []);

  const baseLogos = useMemo(
    () => getAlternatingLogos(logos, logoCount),
    [logos, logoCount],
  );
  const repeatedLogos = useMemo(
    () => [...baseLogos, ...baseLogos, ...baseLogos],
    [baseLogos],
  );

  useEffect(() => {
    if (!trackRef.current || baseLogos.length === 0) {
      setBaseWidth(0);
      return;
    }
    const children = Array.from(trackRef.current.children).slice(
      0,
      baseLogos.length,
    ) as HTMLDivElement[];
    const width = children.reduce((acc, child) => acc + child.offsetWidth + 8, 0);
    setBaseWidth(width);
  }, [baseLogos.length, logos.length]);

  useEffect(() => {
    if (!baseWidth) return;
    let start: number | null = null;
    let rafId: number;
    const speed = 80;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const px = (elapsed / 1000) * speed;
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

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden border-y-0 bg-secondary-900 py-8">
        <div className="flex justify-center gap-2 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-56 rounded-md bg-primary-700" />
          ))}
        </div>
      </div>
    );
  }

  if (logos.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden border-y-0 bg-secondary-900 py-8">
      <div className="relative flex items-center justify-center">
        <div
          ref={trackRef}
          className="logos-carousel-track flex gap-2"
          style={{
            transform: `translateX(${offset}px)`,
            willChange: "transform",
          }}
        >
          {repeatedLogos.map((ally, idx) => (
            <div key={`${ally.id}-${idx}`} className="flex h-32 w-56 flex-shrink-0 items-center justify-center">
              <LogoImage src={ally.image} alt={ally.name || `Logo ${(idx % logos.length) + 1}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogosCarousel;
