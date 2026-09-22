import { useEffect } from "react";
import { useLocation } from "wouter";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = "G-3FETLF03YY";

/** Solo páginas oficiales de marketing del sitio. */
const GA_PATHS = new Set(["/", "/about", "/programs", "/contact"]);

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }
}

function ensureGaScript() {
  const src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  if (document.querySelector(`script[src*="id=${GA_MEASUREMENT_ID}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/**
 * Google Analytics 4 (gtag) — solo Inicio, Acerca de, Programas y Contacto.
 * No se carga en admin, talento, forms, INÉDITO, etc.
 */
export function GoogleAnalytics() {
  const [location] = useLocation();
  const path = location.split("?")[0] || "/";
  const enabled = GA_PATHS.has(path);

  useEffect(() => {
    if (!enabled) return;

    ensureGtag();
    ensureGaScript();

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      anonymize_ip: true,
    });
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [enabled, path]);

  return null;
}
