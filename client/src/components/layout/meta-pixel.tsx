import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Meta Pixel en una SPA: el código base de index.html registra el PageView
 * de la carga inicial; aquí se registran las navegaciones internas.
 */
export function MetaPixel() {
  const [location] = useLocation();
  const path = location.split("?")[0] || "/";
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [path]);

  return null;
}
