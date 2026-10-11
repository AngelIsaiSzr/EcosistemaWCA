import { ReactNode, useEffect } from "react";

interface PageTransitionProps {
  children: ReactNode;
  id?: string;
}

/**
 * Fundido CSS al cambiar de ruta. No usa framer-motion: su animación acelerada (WAAPI) deja un
 * cuadro con opacidad 0 al terminar si el hilo principal está ocupado, y se veía como un parpadeo
 * justo cuando el PageLoader se desvanece.
 */
export function PageTransition({ children, id = "default" }: PageTransitionProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <div key={id} className="animate-[fadeIn_0.3s_ease-out]">
      {children}
    </div>
  );
}
