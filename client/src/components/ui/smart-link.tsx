import type { ReactNode } from "react";
import { Link } from "wouter";

/** Enlace configurable desde Admin: rutas internas usan el router; URLs externas abren en otra pestaña. */
export function SmartLink({
  href,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const target = href.trim();
  if (!target) {
    return (
      <span className={className} aria-label={ariaLabel}>
        {children}
      </span>
    );
  }
  if (target.startsWith("/") && !target.startsWith("//")) {
    return (
      <Link href={target} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  const isWeb = /^https?:\/\//i.test(target);
  return (
    <a
      href={target}
      className={className}
      aria-label={ariaLabel}
      {...(isWeb ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
