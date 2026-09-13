import React, { useRef, useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Country } from "@shared/schema";

const FlagImage = ({ country }: { country: Country }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const code = country.code.toLowerCase();

  return (
    <div className="relative flex h-32 w-40 flex-col items-center justify-center">
      {!isLoaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-md bg-primary-700" />
      )}
      <div
        className={cn(
          "flex flex-col items-center space-y-2 transition-opacity duration-500 ease-in-out",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
      >
        <img
          src={`https://flagcdn.com/w160/${code}.png`}
          srcSet={`https://flagcdn.com/w320/${code}.png 2x`}
          width="160"
          height="120"
          alt={country.name}
          className="h-20 w-32 select-none object-contain shadow-sm"
          onLoad={() => setIsLoaded(true)}
          draggable={false}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{country.name}</p>
          <p className="text-xs text-muted-foreground">
            {country.students} {country.students === "1" ? "Estudiante" : "Estudiantes"}
          </p>
        </div>
      </div>
    </div>
  );
};

const getAlternatingCountries = (items: Country[], minCount: number) => {
  if (items.length === 0) return [] as Country[];
  const arr: Country[] = [];
  let i = 0;
  const total = Math.ceil(minCount / items.length) * items.length;
  while (arr.length < total) {
    arr.push(items[i % items.length]);
    i++;
  }
  return arr;
};

export const FlagsCarousel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [countryCount, setCountryCount] = useState(16);
  const [baseWidth, setBaseWidth] = useState(0);
  const [offset, setOffset] = useState(0);

  const { data: countriesData = [], isLoading } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const countries = useMemo(
    () => [...countriesData].sort((a, b) => a.order - b.order),
    [countriesData],
  );

  useEffect(() => {
    const updateCountryCount = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const flagWidth = 160 + 16;
        const minCount = Math.ceil((containerWidth * 3) / flagWidth);
        setCountryCount(minCount);
      }
    };
    updateCountryCount();
    window.addEventListener("resize", updateCountryCount);
    return () => window.removeEventListener("resize", updateCountryCount);
  }, []);

  const baseCountries = useMemo(
    () => getAlternatingCountries(countries, countryCount),
    [countries, countryCount],
  );
  const repeatedCountries = useMemo(
    () => [...baseCountries, ...baseCountries, ...baseCountries],
    [baseCountries],
  );

  useEffect(() => {
    if (!trackRef.current || baseCountries.length === 0) {
      setBaseWidth(0);
      return;
    }
    const children = Array.from(trackRef.current.children).slice(
      0,
      baseCountries.length,
    ) as HTMLDivElement[];
    const width = children.reduce((acc, child) => acc + child.offsetWidth + 16, 0);
    setBaseWidth(width);
  }, [baseCountries.length, countries.length]);

  useEffect(() => {
    if (!baseWidth) return;
    let start: number | null = null;
    let rafId: number;
    const speed = 60;

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
      <div className="w-full overflow-hidden border-y-0 bg-secondary-900 py-12">
        <div className="flex justify-center gap-4 px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-40 rounded-md bg-primary-700" />
          ))}
        </div>
      </div>
    );
  }

  if (countries.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden border-y-0 bg-secondary-900 py-12">
      <div className="relative flex items-center justify-center">
        <div
          ref={trackRef}
          className="flags-carousel-track flex gap-4"
          style={{
            transform: `translateX(${offset}px)`,
            willChange: "transform",
          }}
        >
          {repeatedCountries.map((country, idx) => (
            <div
              key={`${country.id}-${idx}`}
              className="flex h-40 w-40 flex-shrink-0 items-center justify-center"
            >
              <FlagImage country={country} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlagsCarousel;
