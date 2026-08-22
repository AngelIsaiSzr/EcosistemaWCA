import { WCA_LOGO_FALLBACK, WCA_LOGO_URL } from "@shared/integration-form";
import { cn } from "@/lib/utils";

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
      src={WCA_LOGO_URL}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      className={cn(className)}
      onError={(event) => {
        const image = event.currentTarget;
        if (image.src !== WCA_LOGO_FALLBACK) {
          image.src = WCA_LOGO_FALLBACK;
        }
      }}
    />
  );
}
