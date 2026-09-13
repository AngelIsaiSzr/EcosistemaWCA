import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { HeartHandshake, Sparkles, Users, X } from "lucide-react";
import { usePageLoading } from "@/hooks/use-page-loading";
import { useTheme } from "@/components/ui/theme-provider";
import { WcaLogo } from "@/components/integration/wca-logo";
import { cn } from "@/lib/utils";

export const RECRUITMENT_STORAGE_KEY = "wca-recruitment-invite-dismissed-at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const BG_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80";

let bgPreloaded = false;

function preloadBackground() {
  if (typeof window === "undefined" || bgPreloaded) return;
  bgPreloaded = true;
  const image = new Image();
  image.src = BG_IMAGE;
  void image.decode?.().catch(() => undefined);
}

function shouldHideOnPath(path: string) {
  return (
    path === "/integracion" ||
    path.startsWith("/f/") ||
    path.startsWith("/talento") ||
    path.startsWith("/admin") ||
    path === "/auth" ||
    path.startsWith("/convocatoria") ||
    /^\/programs\/[^/]+\/learn$/.test(path) ||
    path.includes("registro-en-vivo") ||
    path.includes("live-course-registration")
  );
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(RECRUITMENT_STORAGE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(RECRUITMENT_STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function forceShowFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("convocatoria") === "1" || params.get("mostrarConvocatoria") === "1";
  } catch {
    return false;
  }
}

export function RecruitmentInviteModal() {
  const [location] = useLocation();
  const { isLoading } = usePageLoading();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    preloadBackground();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (shouldHideOnPath(location.split("?")[0] ?? location)) {
      setOpen(false);
      return;
    }
    if ((location.split("?")[0] || location) !== "/") return;
    if (isLoading) return;

    const force = forceShowFromQuery();
    if (force) {
      try {
        localStorage.removeItem(RECRUITMENT_STORAGE_KEY);
      } catch {
        // ignore
      }
    } else if (wasDismissedRecently()) {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, [mounted, location, isLoading]);

  const close = () => {
    markDismissed();
    setOpen(false);
  };

  const join = () => {
    markDismissed();
    setOpen(false);
    window.open("/integracion", "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6">
          <motion.button
            type="button"
            aria-label="Cerrar convocatoria"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruitment-invite-title"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={cn(
              "relative z-10 w-full max-w-[min(92vw,42rem)] overflow-hidden rounded-2xl border shadow-2xl sm:max-w-2xl md:max-w-3xl",
              isDark ? "border-white/15 text-white" : "border-black/10 text-white",
            )}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${BG_IMAGE}")` }}
            />
            {/* Capa negra fuerte para legibilidad */}
            <div className="absolute inset-0 bg-black/72" />
            <div
              className={cn(
                "absolute inset-0",
                isDark
                  ? "bg-gradient-to-br from-[#0b1220]/85 via-[#0b1220]/55 to-[#5b8fd4]/35"
                  : "bg-gradient-to-br from-[#0b1220]/80 via-[#132a4a]/50 to-[#5b8fd4]/30",
              )}
            />
            <div className="pointer-events-none absolute -left-16 top-[-20%] h-56 w-56 rounded-full bg-[#5b8fd4]/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-[-25%] h-64 w-64 rounded-full bg-[#87b1e0]/20 blur-3xl" />
            <WcaLogo
              decorative
              className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.1] sm:h-56 sm:w-56"
            />

            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#e11d48] text-white shadow-lg shadow-rose-900/40 transition hover:scale-105 hover:bg-[#be123c]"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 px-5 pb-8 pt-10 text-center sm:px-10 md:px-14 md:pb-10 md:pt-12">
              <div className="mb-5 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-xs font-medium text-[#cfe0f7]">
                  <Sparkles className="h-3.5 w-3.5 text-[#87b1e0]" />
                  Convocatoria abierta
                </span>
              </div>

              <h2
                id="recruitment-invite-title"
                className="font-heading text-3xl font-bold leading-tight drop-shadow-sm sm:text-4xl md:text-[2.6rem]"
              >
                ¿Listo para{" "}
                <span className="text-[#87b1e0]">transformar la educación</span> con nosotros?
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                En el Ecosistema WCA buscamos personas con vocación, visión y liderazgo que quieran cambiar el mundo 💙 
                <br />
                Educación + Tecnología + Humanidad.
              </p>

              <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-2 text-left text-xs text-white/85 sm:gap-3 sm:text-sm">
                <div className="rounded-xl border border-white/20 bg-black/35 p-3 backdrop-blur-sm">
                  <Users className="mb-1 h-4 w-4 text-[#87b1e0]" />
                  Comunidad real
                </div>
                <div className="rounded-xl border border-white/20 bg-black/35 p-3 backdrop-blur-sm">
                  <HeartHandshake className="mb-1 h-4 w-4 text-[#87b1e0]" />
                  Propósito
                </div>
                <div className="rounded-xl border border-white/20 bg-black/35 p-3 backdrop-blur-sm">
                  <Sparkles className="mb-1 h-4 w-4 text-[#87b1e0]" />
                  Impacto
                </div>
              </div>

              <button
                type="button"
                onClick={join}
                className="mt-8 inline-flex h-12 min-w-[14rem] items-center justify-center gap-2 rounded-full bg-[#5b8fd4] px-8 text-base font-semibold text-white shadow-lg shadow-[#5b8fd4]/35 transition hover:scale-[1.02] hover:bg-[#4a7fc4] active:scale-[0.98] sm:px-10"
              >
                ¡Ser parte del cambio!
              </button>

              <p className="mt-4 text-xs text-white/60 sm:text-sm">
                Al continuar aceptas los{" "}
                <a
                  href="/terms#convocatoria"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#87b1e0] underline-offset-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  términos de la convocatoria
                </a>
                .
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
