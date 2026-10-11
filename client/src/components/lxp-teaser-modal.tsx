import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const BG_IMAGE = "/media/lxp-teaser-bg.jpg";

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
            <div className="absolute inset-0 bg-[#030a1c]/70" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#030a1c]/40 via-[#061637]/55 to-[#030a1c]/90" />
            <div className="pointer-events-none absolute -left-14 top-[-18%] h-44 w-44 rounded-full bg-[#2f7bff]/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-[-22%] h-48 w-48 rounded-full bg-[#38bdf8]/25 blur-3xl" />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#e11d48] text-white shadow-lg shadow-rose-900/40 transition hover:scale-105 hover:bg-[#be123c]"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="relative z-10 px-6 pb-8 pt-12 text-center sm:px-8">
              <h2
                id="lxp-teaser-title"
                className="font-brush text-[1.7rem] italic leading-[1.15] tracking-wide drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] sm:text-[2rem]"
              >
                <span className="block text-white">¿Quieres vivir</span>
                <span className="block bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#3b82f6] bg-clip-text pr-2 text-transparent">
                  la experiencia completa?
                </span>
              </h2>

              <p className="font-display mx-auto mt-4 max-w-sm text-[15px] font-semibold leading-relaxed text-white/90 sm:text-base">
                Visita nuestra <span className="font-extrabold text-[#7dd3fc]">LXP</span> y descubre
                nuestros últimos programas más actualizados, con una experiencia de aprendizaje
                renovada.
              </p>

              <button
                type="button"
                disabled
                className={cn(
                  "font-display mt-7 inline-flex h-11 min-w-[11rem] cursor-not-allowed items-center justify-center rounded-full px-8 text-sm font-extrabold uppercase tracking-wider",
                  "border border-[#60a5fa]/40 bg-[#1d4ed8]/30 text-[#bfdbfe] backdrop-blur-sm",
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
