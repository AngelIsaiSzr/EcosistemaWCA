import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Layers,
  Map,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { AnimateInView } from "@/components/ui/animate-in-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { SITE_URL } from "@/utils/titles";
import { cn } from "@/lib/utils";

const HERO_IMG = "/media/inedito/hero-oficial.jpg";
const IMG_VR = "/media/inedito/experiencia-vr.jpg";
const IMG_LAB = "/media/inedito/data-lab.jpg";
const LOGO_INEDITO = "/media/inedito/logo-inedito.png";
const LOGO_WCA_INEDITO = "/media/inedito/logo-wca-inedito.png";

const INEDITO_BLUE = "#0056FF";

const NAV_LINKS = [
  { href: "#experiencia", label: "Experiencia" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#quien", label: "A quién" },
  { href: "#proceso", label: "Proceso" },
  { href: "#faq", label: "FAQ" },
] as const;

const MOVEMENTS = [
  {
    n: "01",
    title: "Descubre",
    body: "Autoconocimiento, propósito, WCA, TecnoHumanismo y tu primera misión.",
    icon: Compass,
  },
  {
    n: "02",
    title: "Crea",
    body: "Laboratorios, prototipos, herramientas, usuarios reales y feedback.",
    icon: Layers,
  },
  {
    n: "03",
    title: "Transforma",
    body: "Proyecto real, liderazgo, colaboración y un resultado observable.",
    icon: Flame,
  },
  {
    n: "04",
    title: "Trasciende",
    body: "Producto Vivo, Bitácora, OBRA VIVA, Constancia y comunidad posterior.",
    icon: Sparkles,
  },
] as const;

const BENEFITS = [
  {
    title: "Proyectos reales",
    body: "Participas en misiones vivas del Ecosistema WCA, no en simulaciones.",
  },
  {
    title: "Formación 6D",
    body: "Play & Impact Learning aplicada directamente a tu misión.",
  },
  {
    title: "Mentoría de Dirección",
    body: "Acompañamiento de líderes, pares y usuarios en el camino.",
  },
  {
    title: "Experiencias interdisciplinarias",
    body: "Eventos, retos de innovación y trabajo con otras áreas.",
  },
  {
    title: "Evidencia de trayectoria",
    body: "Bitácora, Pasaporte, Producto Vivo, insignias y Constancia final.",
  },
  {
    title: "Red de INÉDITO",
    body: "Comunidad y oportunidades posteriores según criterios y disponibilidad.",
  },
] as const;

const PHASES = [
  {
    n: "01",
    title: "Aplicación",
    body: "Envías tu aplicación para una evaluación inicial de potencial e iniciativa.",
  },
  {
    n: "02",
    title: "Reto",
    body: "Participas en un reto de liderazgo e impacto que revela cómo piensas y creas.",
  },
  {
    n: "03",
    title: "Selección",
    body: "Cierras el proceso con las pruebas finales y, si hay match, entras a la experiencia.",
  },
] as const;

const FAQ = [
  {
    q: "¿Necesito experiencia previa?",
    a: "No. Ayuda, pero el proceso evalúa potencial, iniciativa, humanidad, creación y compromiso.",
  },
  {
    q: "¿Cuánto tiempo requiere?",
    a: "Carga estimada de 6–8 horas por semana durante 6 meses (Enero–Junio 2027).",
  },
  {
    q: "¿Puedo hacerlo como Servicio Social?",
    a: "Solo cuando exista proyecto, cupo y validación institucional. No se promete automáticamente.",
  },
  {
    q: "¿Qué voy a construir?",
    a: "Una contribución real dentro de una misión que evoluciona hacia un Producto Vivo con evidencia y transferencia.",
  },
  {
    q: "¿Qué recibo?",
    a: "Formación, acompañamiento, experiencia real, evidencias de trayectoria, comunidad y Constancia al cumplir los criterios del programa.",
  },
] as const;

const GALLERY = [
  {
    src: HERO_IMG,
    alt: "Equipo WCA colaborando en pizarra y laboratorio",
    rotate: "-6deg",
  },
  {
    src: IMG_VR,
    alt: "Experiencia inmersiva con realidad mixta",
    rotate: "3deg",
  },
  {
    src: IMG_LAB,
    alt: "Laboratorio de datos y medición en vivo",
    rotate: "-2deg",
  },
] as const;

function preloadAssets() {
  if (typeof window === "undefined") return;
  for (const src of [HERO_IMG, IMG_VR, IMG_LAB, LOGO_INEDITO, LOGO_WCA_INEDITO]) {
    const img = new Image();
    img.src = src;
    void img.decode?.().catch(() => undefined);
  }
}

function ApplySoonButton({
  className,
  label = "Comenzar mi aplicación",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled
      title="La convocatoria de INÉDITO abrirá pronto. No es el formulario de Integración."
      className={cn(
        "inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold tracking-wide text-white/85 opacity-90",
        "bg-[#0056FF] shadow-[0_12px_40px_rgba(0,86,255,0.35)]",
        className,
      )}
    >
      {label}
      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]">
        Muy pronto
      </span>
    </button>
  );
}

function StormSky({ reduce }: { reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(0,86,255,0.28),transparent_55%),radial-gradient(ellipse_at_85%_15%,rgba(56,189,248,0.12),transparent_45%),linear-gradient(180deg,#020617_0%,#0b1c3d_42%,#07101f_100%)]" />
      {!reduce && (
        <>
          <motion.div
            className="absolute -left-24 top-10 h-[28rem] w-[28rem] rounded-full bg-[#0056FF]/25 blur-[100px]"
            animate={{ x: [0, 40, 0], y: [0, 30, 0], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-20 top-40 h-[22rem] w-[22rem] rounded-full bg-sky-400/15 blur-[90px]"
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-indigo-500/20 blur-[80px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
    </div>
  );
}

function IneditoNav({ offsetTop = false }: { offsetTop?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 z-50 transition-all duration-300",
        offsetTop ? "top-10" : "top-0",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="mx-auto max-w-6xl px-4">
        <nav
          className={cn(
            "flex items-center justify-between gap-4 rounded-full border px-3 py-2.5 backdrop-blur-xl transition-colors sm:px-5",
            scrolled
              ? "border-white/10 bg-[#020617]/85 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
              : "border-white/10 bg-white/[0.04]",
          )}
        >
          <a href="#inicio" className="flex shrink-0 items-center gap-2" aria-label="INÉDITO inicio">
            <img src={LOGO_INEDITO} alt="" className="h-7 w-auto sm:h-8" />
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium tracking-wide text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/"
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white/55 transition hover:text-white"
            >
              Ecosistema WCA
            </Link>
            <a
              href="#aplicar"
              className="inline-flex h-9 items-center rounded-full bg-[#0056FF] px-4 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(0,86,255,0.35)] transition hover:brightness-110"
            >
              Aplicar
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white md:hidden"
            aria-expanded={open}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      {open && (
        <div className="fixed inset-0 top-[4.5rem] z-40 bg-[#020617]/95 px-4 backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-lg flex-col gap-2 pt-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base font-medium text-white"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#aplicar"
              className="mt-2 rounded-2xl bg-[#0056FF] px-4 py-3 text-center font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Aplicar
            </a>
            <Link
              href="/"
              className="px-4 py-3 text-center text-sm text-white/60"
              onClick={() => setOpen(false)}
            >
              Volver a Ecosistema WCA
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function IneditoFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#020617] py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 md:flex-row md:items-start">
        <div className="text-center md:text-left">
          <img src={LOGO_WCA_INEDITO} alt="WCA | INÉDITO" className="mx-auto mb-4 h-10 w-auto md:mx-0" />
          <p className="max-w-sm text-sm leading-relaxed text-white/55 text-justify md:text-left">
            Programa de Formación, Creación, Liderazgo e Impacto TecnoHumano. Edición Origen ·
            Enero–Junio 2027.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/55">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
          <Link href="/" className="transition hover:text-white">
            Ecosistema WCA
          </Link>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-white/35">
        © {new Date().getFullYear()} Ecosistema WCA · INÉDITO
      </p>
    </footer>
  );
}

export default function IneditoLandingPage() {
  const reduce = useReducedMotion();
  const { user, isLoading: authLoading } = useAuth();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const heroFade = useTransform(scrollYProgress, [0, 0.9], [1, 0.4]);

  const landingQuery = useQuery<{ isEnabled: boolean }>({
    queryKey: ["/api/inedito/landing"],
    queryFn: async () => {
      const res = await fetch("/api/inedito/landing", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar el estado");
      return res.json();
    },
  });

  useEffect(() => {
    preloadAssets();
  }, []);

  const canPreview = user?.role === "admin" || user?.role === "talento";
  const isEnabled = landingQuery.data?.isEnabled ?? true;
  const accessPending = authLoading || landingQuery.isLoading;

  if (accessPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (!isEnabled && !canPreview) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>INÉDITO · Programa TecnoHumano | Ecosistema WCA</title>
        <meta
          name="description"
          content="WCA | INÉDITO — Programa de Formación, Creación, Liderazgo e Impacto TecnoHumano. Edición Origen · Enero–Junio 2027."
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/inedito`} />
        <meta property="og:title" content="INÉDITO · Programa TecnoHumano | Ecosistema WCA" />
        <meta
          property="og:description"
          content="Descubre quién puedes llegar a ser mientras construyes algo que antes no existía."
        />
        <meta property="og:image" content={`${SITE_URL}${HERO_IMG}`} />
        <meta property="og:url" content={`${SITE_URL}/inedito`} />
        <link rel="preload" as="image" href={HERO_IMG} />
        <link rel="preload" as="image" href={LOGO_INEDITO} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </Helmet>

      {!isEnabled && canPreview && (
        <div className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-amber-950">
          Vista previa · la landing está desactivada para el público.{" "}
          {user?.role === "talento" ? (
            <Link href="/talento/inedito/landing" className="underline underline-offset-2">
              Activar en Talento
            </Link>
          ) : (
            <span>Actívala desde una cuenta Talento.</span>
          )}
        </div>
      )}

      <div
        className="inedito-landing flex min-h-screen flex-col overflow-x-hidden text-white antialiased"
        style={
          {
            "--inedito-display": '"Syne", system-ui, sans-serif',
            "--inedito-body": '"Figtree", system-ui, sans-serif',
            fontFamily: "var(--inedito-body)",
            backgroundColor: "#020617",
          } as CSSProperties
        }
      >
        <IneditoNav offsetTop={!isEnabled && canPreview} />

        <main className="flex-grow">
          {/* ——— Hero: brand + one shot + CTA ——— */}
          <section
            id="inicio"
            ref={heroRef}
            className="relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 sm:items-center sm:pb-20 sm:pt-24"
          >
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${HERO_IMG})`,
                y: reduce ? 0 : heroY,
                opacity: reduce ? 1 : heroFade,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/82 to-[#020617]/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50" />
            {!reduce && (
              <motion.div
                className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-[#0056FF]/20 blur-[90px]"
                animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.15, 1] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
              <motion.div
                className="max-w-2xl"
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/80">
                  Edición Origen · Enero–Junio 2027
                </p>

                <img
                  src={LOGO_INEDITO}
                  alt="INÉDITO"
                  className="mb-6 h-auto w-[min(90vw,20rem)] drop-shadow-[0_12px_48px_rgba(0,86,255,0.45)] sm:w-[min(90vw,24rem)]"
                />

                <h1
                  className="mb-5 max-w-xl text-balance text-2xl font-bold leading-[1.15] tracking-tight sm:text-3xl md:text-[2.35rem]"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  Formación, creación, liderazgo e impacto{" "}
                  <span className="text-[#4d8cff]">TecnoHumano</span>
                </h1>

                <p className="mb-8 max-w-lg text-lg font-medium leading-snug text-white/85 sm:text-xl">
                  ¿Y si los próximos seis meses cambiaran quién eres?
                </p>

                <div className="flex flex-wrap gap-3">
                  <ApplySoonButton />
                  <a
                    href="#experiencia"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/10"
                  >
                    Conocer las misiones
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ——— Meta strip ——— */}
          <section className="relative border-y border-white/10 bg-[#061228]/80">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-6 text-sm text-white/70 sm:justify-between">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-[#4d8cff]" aria-hidden />
                <span>
                  <strong className="font-semibold text-white">7</strong> Direcciones
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-sky-300" aria-hidden />
                <span>
                  <strong className="font-semibold text-white">6</strong> meses
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-300" aria-hidden />
                <span>
                  <strong className="font-semibold text-white">6–8 h</strong> / semana
                </span>
              </div>
              <p className="w-full text-center text-xs uppercase tracking-[0.2em] text-white/40 sm:w-auto sm:text-left">
                WCA · INÉDITO
              </p>
            </div>
          </section>

          {/* ——— Qué es ——— */}
          <section className="relative overflow-hidden py-20 md:py-28">
            <StormSky reduce={!!reduce} />
            <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
              <AnimateInView animation="slideUp">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#4d8cff]">
                  Esto no es una vacante
                </p>
                <h2
                  className="mb-6 text-balance text-3xl font-bold tracking-tight md:text-5xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  No vienes a ocupar un puesto
                </h2>
                <p className="mb-6 text-justify text-base leading-relaxed text-white/70 md:text-lg">
                  <strong className="font-semibold text-white">INÉDITO</strong> es la experiencia de
                  formación, creación, liderazgo e impacto del Ecosistema WCA. Durante seis meses te
                  integras a una misión real, aprendes con un equipo interdisciplinario, recibes
                  mentoría y conviertes tus decisiones en un{" "}
                  <strong className="font-semibold text-white">Producto Vivo</strong>.
                </p>
                <p className="text-justify text-base leading-relaxed text-white/70 md:text-lg">
                  No buscamos manos extra. Buscamos personas con potencial para transformar y dejar
                  una parte de WCA mejor que antes — con curiosidad, iniciativa, humanidad, creación
                  y compromiso.
                </p>
              </AnimateInView>
            </div>
          </section>

          {/* ——— Galería tipo “behind the scenes” ——— */}
          <section className="relative pb-8 md:pb-12">
            <div className="mx-auto max-w-5xl px-4">
              <AnimateInView animation="slideUp" className="mb-10 text-center">
                <h2
                  className="text-2xl font-bold tracking-tight md:text-3xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  Detrás de la experiencia
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-white/55 text-justify sm:text-center">
                  Formación en vivo, tecnología inmersiva y evidencia medible. Tres escenas de lo
                  que se siente construir algo que antes no existía.
                </p>
              </AnimateInView>

              <div className="relative mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 sm:flex-row sm:gap-0 sm:py-8">
                {GALLERY.map((shot, i) => (
                  <motion.figure
                    key={shot.src}
                    className={cn(
                      "relative w-[min(78vw,16rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1c3d] shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:w-56 md:w-64",
                      i === 1 && "z-20 sm:-mx-6 sm:scale-110",
                      i === 0 && "z-10 sm:rotate-[-6deg]",
                      i === 2 && "z-10 sm:rotate-[4deg]",
                    )}
                    style={i === 1 ? undefined : { rotate: shot.rotate }}
                    initial={reduce ? false : { opacity: 0, y: 36 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    whileHover={reduce ? undefined : { y: -10, rotate: 0, scale: 1.04, zIndex: 30 }}
                  >
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      className="aspect-[4/5] w-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-[11px] font-medium uppercase tracking-[0.14em] text-white/85">
                      {i === 0 ? "Colaboración" : i === 1 ? "Inmersión" : "Evidencia"}
                    </figcaption>
                  </motion.figure>
                ))}
              </div>
            </div>
          </section>

          {/* ——— Lo que vivirás ——— */}
          <section id="experiencia" className="relative scroll-mt-28 overflow-hidden py-20 md:py-28">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,86,255,0.12),transparent_55%)]" />
            <div className="relative z-10 mx-auto max-w-6xl px-4">
              <AnimateInView animation="slideUp" className="mb-12 text-center md:mb-16">
                <h2
                  className="mb-3 text-3xl font-bold tracking-tight md:text-5xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  Lo que vivirás
                </h2>
                <p className="mx-auto max-w-2xl text-white/60 text-justify sm:text-center">
                  Cuatro movimientos. Una trayectoria de descubrimiento a trascendencia.
                </p>
              </AnimateInView>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {MOVEMENTS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.article
                      key={item.n}
                      className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-7 transition hover:border-[#0056FF]/45"
                      initial={reduce ? false : { opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{ duration: 0.45, delay: i * 0.07 }}
                    >
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <span
                          className="text-4xl font-bold tracking-tight text-[#0056FF]/35 transition group-hover:text-[#0056FF]/70"
                          style={{ fontFamily: "var(--inedito-display)" }}
                        >
                          {item.n}
                        </span>
                        <Icon className="h-6 w-6 text-[#4d8cff]" aria-hidden />
                      </div>
                      <h3
                        className="mb-2 text-xl font-bold tracking-tight"
                        style={{ fontFamily: "var(--inedito-display)" }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-white/65 text-justify">{item.body}</p>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ——— Beneficios ——— */}
          <section id="beneficios" className="relative scroll-mt-28 py-20 md:py-28">
            <div className="absolute inset-0 bg-[#061228]" />
            <div className="relative z-10 mx-auto max-w-6xl px-4">
              <AnimateInView animation="slideUp" className="mb-12 text-center">
                <h2
                  className="mb-3 text-3xl font-bold tracking-tight md:text-5xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  Beneficios defendibles
                </h2>
                <p className="mx-auto max-w-2xl text-white/60 text-justify sm:text-center">
                  Lo que sí puedes esperar — sin promesas vacías.
                </p>
              </AnimateInView>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {BENEFITS.map((b, i) => (
                  <motion.article
                    key={b.title}
                    className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6"
                    initial={reduce ? false : { opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <div className="mb-3 flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4d8cff]" aria-hidden />
                      <h3
                        className="text-lg font-bold tracking-tight"
                        style={{ fontFamily: "var(--inedito-display)" }}
                      >
                        {b.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-white/65 text-justify">{b.body}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          {/* ——— A quién ——— */}
          <section id="quien" className="relative scroll-mt-28 overflow-hidden py-20 md:py-28">
            <StormSky reduce={!!reduce} />
            <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16">
              <AnimateInView animation="slideRight" className="order-2 lg:order-1">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <img
                    src={IMG_VR}
                    alt="Participantes en experiencia inmersiva"
                    className="aspect-[3/4] w-full rounded-[1.5rem] object-cover shadow-2xl"
                    loading="lazy"
                  />
                  <img
                    src={IMG_LAB}
                    alt="Tablets con visualización de datos en laboratorio"
                    className="mt-8 aspect-[3/4] w-full rounded-[1.5rem] object-cover shadow-2xl sm:mt-12"
                    loading="lazy"
                  />
                </div>
              </AnimateInView>

              <AnimateInView animation="slideLeft" delay={0.08} className="order-1 lg:order-2">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#4d8cff]">
                  A quién buscamos
                </p>
                <h2
                  className="mb-5 text-3xl font-bold tracking-tight md:text-4xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  No buscamos perfección
                </h2>
                <p className="mb-4 text-base leading-relaxed text-white/70 text-justify md:text-lg">
                  Buscamos curiosidad, iniciativa, humanidad, creación, compromiso y potencial de
                  aprendizaje.
                </p>
                <p className="text-base leading-relaxed text-white/70 text-justify md:text-lg">
                  No necesitas experiencia previa ni un portafolio impecable. Sí necesitas una
                  historia concreta de algo que hayas intentado, ganas de aprender con otros y una
                  carga semanal que puedas sostener.
                </p>
              </AnimateInView>
            </div>
          </section>

          {/* ——— Proceso ——— */}
          <section id="proceso" className="relative scroll-mt-28 py-20 md:py-28">
            <div className="absolute inset-0 bg-[#061228]" />
            <div className="relative z-10 mx-auto max-w-5xl px-4">
              <AnimateInView animation="slideUp" className="mb-14 text-center">
                <h2
                  className="mb-3 text-3xl font-bold tracking-tight md:text-5xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  El proceso
                </h2>
                <p className="text-white/60">Tres fases para conocerte y construir contigo.</p>
              </AnimateInView>

              <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
                <div
                  className="pointer-events-none absolute left-[10%] right-[10%] top-8 hidden h-px md:block"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${INEDITO_BLUE}66, transparent)`,
                  }}
                  aria-hidden
                />
                {PHASES.map((phase, i) => (
                  <motion.div
                    key={phase.n}
                    className="relative text-center"
                    initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.12 }}
                  >
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#0056FF]/50 bg-[#020617] text-xl font-bold text-[#4d8cff] shadow-[0_0_32px_rgba(0,86,255,0.3)]"
                      style={{ fontFamily: "var(--inedito-display)" }}
                    >
                      {phase.n}
                    </div>
                    <h3
                      className="mb-2 text-xl font-bold"
                      style={{ fontFamily: "var(--inedito-display)" }}
                    >
                      {phase.title}
                    </h3>
                    <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/65 text-justify sm:text-center">
                      {phase.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ——— FAQ ——— */}
          <section id="faq" className="relative scroll-mt-28 py-20 md:py-28">
            <StormSky reduce={!!reduce} />
            <div className="relative z-10 mx-auto max-w-3xl px-4">
              <AnimateInView animation="slideUp" className="mb-10 text-center">
                <h2
                  className="text-3xl font-bold tracking-tight md:text-5xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  Preguntas frecuentes
                </h2>
              </AnimateInView>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {FAQ.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`faq-${i}`}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-1"
                  >
                    <AccordionTrigger className="px-4 py-4 text-left text-base font-semibold hover:no-underline md:text-lg"
                      style={{ fontFamily: "var(--inedito-display)" }}
                    >
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-white/65 text-justify md:text-base">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* ——— CTA final ——— */}
          <section id="aplicar" className="relative scroll-mt-28 overflow-hidden py-24 md:py-28">
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${IMG_VR})` }}
              initial={false}
            />
            <div className="absolute inset-0 bg-[#020617]/88" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-[#020617]/50" />
            {!reduce && (
              <motion.div
                className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0056FF]/25 blur-[100px]"
                animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
              <AnimateInView animation="scale">
                <img
                  src={LOGO_WCA_INEDITO}
                  alt="WCA | INÉDITO"
                  className="mx-auto mb-8 h-auto w-[min(85vw,18rem)]"
                />
                <h2
                  className="mb-4 text-3xl font-bold tracking-tight md:text-4xl"
                  style={{ fontFamily: "var(--inedito-display)" }}
                >
                  Tu primer paso puede empezar aquí
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-white/70 text-justify sm:text-center">
                  Antes de aplicar, revisa fechas, dedicación, misiones y FAQ. Si la experiencia hace
                  sentido para ti, queremos conocer lo que ves, lo que has intentado y lo que podrías
                  traer a WCA que todavía no existe.
                </p>
                <ApplySoonButton label="Quiero formar parte de INÉDITO" className="px-8" />
                <p className="mt-6 text-xs italic text-white/40">
                  *Pulso: la señal de que algo inédito está por comenzar.
                </p>
              </AnimateInView>
            </div>
          </section>
        </main>

        <IneditoFooter />
      </div>
    </>
  );
}
