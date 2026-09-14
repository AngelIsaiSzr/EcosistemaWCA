import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@shared/media-url";

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  /** Prioridad alta (hero / LCP). Desactiva lazy. */
  priority?: boolean;
};

/**
 * Normaliza URL (local / proxy ImgBB) y aplica lazy + fade-in.
 */
export function OptimizedImage({
  src,
  alt = "",
  className,
  priority = false,
  onLoad,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src);

  if (!resolved || failed) {
    return (
      <div
        className={cn("bg-muted/40", className)}
        role="img"
        aria-label={alt || "Imagen no disponible"}
      />
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={cn(
        "bg-muted/20 transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
