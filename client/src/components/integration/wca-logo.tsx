import { WCA_LOGO_FALLBACK, WCA_LOGO_URL } from "@shared/integration-form";
import { cn } from "@/lib/utils";

let cachedSrc = WCA_LOGO_URL;

if (typeof window !== "undefined") {
  const warm = (src: string) => {
    const image = new Image();
    image.src = src;
    void image.decode?.().catch(() => undefined);
  };
  warm(WCA_LOGO_URL);
  cachedSrc = WCA_LOGO_URL;
}

export function WcaLogo({
  className,
  alt = "Ecosistema WCA",
  decorative = false,
}: {
  className?: string;
  alt?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src={cachedSrc}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      width={256}
      height={256}
      decoding="async"
      fetchPriority={decorative ? "low" : "high"}
      className={cn(className)}
      onError={(event) => {
        const image = event.currentTarget;
        if (image.src !== WCA_LOGO_FALLBACK) {
          cachedSrc = WCA_LOGO_FALLBACK;
          image.src = WCA_LOGO_FALLBACK;
        }
      }}
    />
  );
}
