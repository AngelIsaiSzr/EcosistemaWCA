import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, Sparkles, X } from "lucide-react";
import { WcaLogo } from "@/components/integration/wca-logo";
import { cn } from "@/lib/utils";

const BG_IMAGE = "/media/about1-cy3qzm.jpg";

type LxpTeaserModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LxpTeaserModal({ open, onClose }: LxpTeaserModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lxp-teaser-title"
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-white/15 text-white shadow-2xl"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${BG_IMAGE}")` }}
            />
            <div className="absolute inset-0 bg-black/72" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220]/85 via-[#132a4a]/55 to-[#5b8fd4]/30" />
            <div className="pointer-events-none absolute -left-12 top-[-20%] h-40 w-40 rounded-full bg-[#5b8fd4]/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-8 bottom-[-25%] h-44 w-44 rounded-full bg-[#87b1e0]/20 blur-3xl" />
            <WcaLogo
              decorative
              className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.12]"
            />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#e11d48] text-white shadow-lg shadow-rose-900/40 transition hover:scale-105 hover:bg-[#be123c]"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="relative z-10 px-5 pb-7 pt-9 text-center sm:px-7">
              <div className="mb-4 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-[#cfe0f7]">
                  <Sparkles className="h-3 w-3 text-[#87b1e0]" />
                  Nueva LXP
                </span>
              </div>

              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/35">
                <GraduationCap className="h-5 w-5 text-[#87b1e0]" />
              </div>

              <h2
                id="lxp-teaser-title"
                className="font-heading text-xl font-bold leading-snug drop-shadow-sm sm:text-2xl"
              >
                ¿Quieres vivir la experiencia completa?
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/90 sm:text-[15px]">
                Visita nuestra LXP y descubre nuestros últimos programas más actualizados, con una
                experiencia de aprendizaje renovada.
              </p>

              <button
                type="button"
                disabled
                className={cn(
                  "mt-6 inline-flex h-11 min-w-[11rem] cursor-not-allowed items-center justify-center rounded-full px-8 text-sm font-semibold",
                  "bg-white/20 text-white/70 opacity-70",
                )}
              >
                Muy pronto
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
