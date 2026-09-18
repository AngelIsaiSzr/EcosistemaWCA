import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Flame,
  Layers,
  Sparkles,
  Clock,
  Map,
  CalendarDays,
} from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { AnimateInView } from "@/components/ui/animate-in-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SITE_URL } from "@/utils/titles";
import { cn } from "@/lib/utils";

const HERO_IMG = "/media/inedito/hero-oficial.jpg";
const LOGO_INEDITO = "/media/inedito/logo-inedito.png";
const LOGO_WCA_INEDITO = "/media/inedito/logo-wca-inedito.png";

/** Azul oficial del logo INÉDITO */
const INEDITO = "#0056FF";

const MOVEMENTS = [
  {
    n: "01",
    title: "DESCUBRE",
    body: "Autoconocimiento, propósito, WCA, TecnoHumanismo y tu primera misión.",
    icon: Compass,
  },
  {
    n: "02",
    title: "CREA",
    body: "Laboratorios, prototipos, herramientas, usuarios reales y feedback.",
    icon: Layers,
  },
  {
    n: "03",
    title: "TRANSFORMA",
    body: "Proyecto real, liderazgo, colaboración y un resultado observable.",
    icon: Flame,
  },
  {
    n: "04",
    title: "TRASCIENDE",
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
    title: "Servicio Social (posible)",
    body: "Solo con proyecto, cupo y validación institucional. Nunca automático.",
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

function preloadAssets() {
  if (typeof window === "undefined") return;
  for (const src of [HERO_IMG, LOGO_INEDITO, LOGO_WCA_INEDITO]) {
    const img = new Image();
    img.src = src;
    void img.decode?.().catch(() => undefined);
  }
}

function ApplySoonButton({ className, label = "Comenzar mi aplicación" }: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      disabled
      title="La convocatoria de INÉDITO abrirá pronto. No es el formulario de Integración."
      className={cn(
        "inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-md px-7 text-sm font-semibold text-white/80 opacity-80",
        "bg-[hsl(215_100%_45%)] shadow-lg shadow-[hsl(215_100%_45%/0.25)]",
        className,
      )}
    >
      {label}
      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
        Muy pronto
      </span>
    </button>
  );
}

function FloatingOrbs({ reduce }: { reduce: boolean }) {
  if (reduce) return null;
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-[hsl(215_100%_45%/0.22)] blur-3xl"
        animate={{ y: [0, 28, 0], x: [0, 12, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-accent-cyan/20 blur-3xl"
        animate={{ y: [0, -24, 0], x: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-yellow/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export default function IneditoLandingPage() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  useEffect(() => {
    preloadAssets();
  }, []);

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
      </Helmet>

      <div className="flex min-h-screen flex-col overflow-x-hidden bg-primary-900 text-foreground">
        <Navbar />

        <main className="flex-grow">
          {/* ——— Hero (estilo sitio: split + atmósfera) ——— */}
          <section
            ref={heroRef}
            className="relative flex min-h-[100svh] items-center overflow-hidden bg-gradient-to-b from-primary-900 to-primary-800 pb-16 pt-24 md:pb-20 md:pt-28"
          >
            <motion.div
              className="absolute inset-0 bg-cover bg-center opacity-[0.14] dark:opacity-[0.22]"
              style={{
                backgroundImage: `url(${HERO_IMG})`,
                y: reduce ? 0 : heroY,
                opacity: reduce ? undefined : heroOpacity,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900/95 via-primary-900/88 to-primary-800/80" />
            <FloatingOrbs reduce={!!reduce} />

            {/* grid sutil */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "64px 64px",
              }}
            />

            <div className="container relative z-10 mx-auto px-4">
              <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-7">
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                  >
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent-blue/30 bg-primary-800/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur-sm">
                      <span
                        className="relative flex h-2 w-2"
                        aria-hidden
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(215_100%_45%)] opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(215_100%_45%)]" />
                      </span>
                      Edición Origen · 01 · Enero–Junio 2027
                    </div>

                    <img
                      src={LOGO_INEDITO}
                      alt="INÉDITO"
                      className="mb-5 h-auto w-[min(92vw,22rem)] drop-shadow-[0_8px_32px_hsl(215_100%_45%/0.35)] sm:w-[min(92vw,26rem)]"
                    />

                    <p className="mb-2 text-sm font-semibold tracking-wide text-accent-blue sm:text-base">
                      WCA | INÉDITO
                    </p>
                    <h1 className="font-heading mb-4 max-w-xl text-balance text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
                      Programa de Formación, Creación, Liderazgo e Impacto{" "}
                      <span className="text-[hsl(215_100%_45%)] dark:text-[hsl(215_90%_62%)]">
                        TecnoHumano
                      </span>
                    </h1>

                    <p className="mb-3 max-w-xl text-lg font-medium leading-snug sm:text-xl">
                      ¿Y si los próximos seis meses cambiaran quién eres?
                    </p>
                    <p className="mb-8 max-w-xl text-muted">
                      Descubre quién puedes llegar a ser mientras construyes algo que antes no
                      existía — dentro de una misión real del Ecosistema WCA.
                    </p>

                    <div className="flex flex-wrap gap-3 sm:gap-4">
                      <ApplySoonButton />
                      <a
                        href="#experiencia"
                        className="inline-flex h-12 items-center justify-center rounded-md border border-accent-blue px-6 text-sm font-medium text-accent-blue transition-colors hover:bg-accent-blue hover:text-white"
                      >
                        Conocer las misiones
                      </a>
                    </div>

                    <div className="mt-10 flex flex-wrap gap-6 border-t border-primary-700 pt-8 text-sm">
                      <div className="flex items-center gap-2 text-muted">
                        <Map className="h-4 w-4 text-accent-blue" aria-hidden />
                        <span>
                          <strong className="text-foreground">7</strong> Direcciones
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted">
                        <CalendarDays className="h-4 w-4 text-accent-yellow" aria-hidden />
                        <span>
                          <strong className="text-foreground">6</strong> meses
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted">
                        <Clock className="h-4 w-4 text-accent-cyan" aria-hidden />
                        <span>
                          <strong className="text-foreground">6–8 h</strong> / semana
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="lg:col-span-5">
                  <motion.div
                    className="relative mx-auto max-w-md lg:max-w-none"
                    initial={reduce ? false : { opacity: 0, x: 40, rotateY: -8 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 80 }}
                    style={{ perspective: 1200 }}
                  >
                    <motion.div
                      className="relative overflow-hidden rounded-2xl border border-primary-700 bg-primary-800 shadow-2xl shadow-[hsl(215_100%_45%/0.15)]"
                      whileHover={reduce ? undefined : { rotateY: -6, rotateX: 3, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 120, damping: 14 }}
                    >
                      <img
                        src={HERO_IMG}
                        alt="Comunidad WCA colaborando en formación TecnoHumana"
                        className="aspect-[4/5] w-full object-cover object-center sm:aspect-[5/6]"
                        fetchPriority="high"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-primary-900/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(215_90%_70%)]">
                          Experiencia real
                        </p>
                        <p className="mt-1 font-heading text-lg font-semibold leading-snug">
                          Formación · Creación · Liderazgo · Impacto
                        </p>
                      </div>
                    </motion.div>

                    {!reduce && (
                      <motion.div
                        className="absolute -bottom-4 -left-4 rounded-xl border border-primary-700 bg-primary-800/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:-left-6"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <p className="text-xs text-muted">Producto Vivo</p>
                        <p className="text-sm font-semibold">Resultado con evidencia</p>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          {/* ——— Qué es INÉDITO ——— */}
          <section className="bg-primary-800 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-2 lg:gap-16">
                <AnimateInView animation="slideUp">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-blue">
                    Esto no es una vacante
                  </p>
                  <h2 className="font-heading mb-4 text-3xl font-bold md:text-4xl">
                    No vienes a ocupar un puesto
                  </h2>
                  <p className="text-muted leading-relaxed">
                    <strong className="text-foreground">INÉDITO</strong> es la experiencia de
                    formación, creación, liderazgo e impacto del Ecosistema WCA. Durante seis meses
                    te integras a una misión real, aprendes con un equipo interdisciplinario,
                    recibes mentoría y conviertes tus decisiones en un{" "}
                    <strong className="text-foreground">Producto Vivo</strong>.
                  </p>
                </AnimateInView>
                <AnimateInView animation="slideUp" delay={0.12}>
                  <div className="rounded-xl border border-primary-700 bg-primary-900/60 p-6 md:p-8">
                    <p className="text-lg font-medium leading-relaxed">
                      No buscamos manos extra.
                    </p>
                    <p className="mt-3 text-muted leading-relaxed">
                      Buscamos personas con potencial para transformar y dejar una parte de WCA
                      mejor que antes — con curiosidad, iniciativa, humanidad, creación y
                      compromiso.
                    </p>
                    <div className="mt-6 h-1 w-16 rounded-full bg-[hsl(215_100%_45%)]" />
                  </div>
                </AnimateInView>
              </div>
            </div>
          </section>

          {/* ——— Lo que vivirás ——— */}
          <section id="experiencia" className="scroll-mt-24 bg-primary-900 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <AnimateInView animation="slideUp" className="mb-12 text-center md:mb-16">
                <h2 className="font-heading mb-3 text-3xl font-bold md:text-4xl">
                  Lo que vivirás
                </h2>
                <p className="mx-auto max-w-2xl text-muted">
                  Cuatro movimientos. Una trayectoria de descubrimiento a trascendencia.
                </p>
              </AnimateInView>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {MOVEMENTS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.n}
                      className="group relative overflow-hidden rounded-xl border border-primary-700 bg-primary-800 p-6 transition hover:border-[hsl(215_100%_45%/0.5)]"
                      initial={reduce ? false : { opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.45, delay: i * 0.08 }}
                      whileHover={reduce ? undefined : { y: -6, scale: 1.02 }}
                    >
                      <div
                        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition group-hover:opacity-100"
                        style={{ backgroundColor: `${INEDITO}44` }}
                      />
                      <p className="font-heading text-3xl font-bold text-[hsl(215_100%_45%/0.35)]">
                        {item.n}
                      </p>
                      <div className="mt-3 mb-3 flex items-center gap-2">
                        <Icon className="h-5 w-5 text-[hsl(215_100%_45%)]" aria-hidden />
                        <h3 className="font-heading text-lg font-bold tracking-wide">{item.title}</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{item.body}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ——— Beneficios ——— */}
          <section className="bg-primary-800 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <AnimateInView animation="slideUp" className="mb-12 text-center">
                <h2 className="font-heading mb-3 text-3xl font-bold md:text-4xl">
                  Beneficios defendibles
                </h2>
                <p className="mx-auto max-w-2xl text-muted">
                  Lo que sí puedes esperar — sin promesas vacías.
                </p>
              </AnimateInView>

              <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {BENEFITS.map((b, i) => (
                  <motion.div
                    key={b.title}
                    className="rounded-xl bg-primary-700 p-6 transition hover:scale-[1.02]"
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(215_100%_45%)]"
                        aria-hidden
                      />
                      <div>
                        <h3 className="font-heading font-semibold">{b.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.body}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ——— A quién buscamos ——— */}
          <section className="bg-primary-900 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
                <AnimateInView animation="slideRight" className="w-full lg:w-1/2">
                  <div className="overflow-hidden rounded-xl border border-primary-700 shadow-xl">
                    <img
                      src={HERO_IMG}
                      alt="Equipo WCA en colaboración interdisciplinaria"
                      className="aspect-[4/3] w-full object-cover object-center"
                    />
                  </div>
                </AnimateInView>
                <AnimateInView animation="slideLeft" delay={0.1} className="w-full lg:w-1/2">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-blue">
                    A quién buscamos
                  </p>
                  <h2 className="font-heading mb-4 text-3xl font-bold md:text-4xl">
                    No buscamos perfección
                  </h2>
                  <p className="mb-4 text-muted leading-relaxed">
                    Buscamos curiosidad, iniciativa, humanidad, creación, compromiso y potencial de
                    aprendizaje.
                  </p>
                  <p className="text-muted leading-relaxed">
                    No necesitas experiencia previa ni un portafolio impecable. Sí necesitas una
                    historia concreta de algo que hayas intentado, ganas de aprender con otros y
                    una carga semanal que puedas sostener.
                  </p>
                </AnimateInView>
              </div>
            </div>
          </section>

          {/* ——— Proceso ——— */}
          <section className="bg-primary-800 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <AnimateInView animation="slideUp" className="mb-14 text-center">
                <h2 className="font-heading mb-3 text-3xl font-bold md:text-4xl">El proceso</h2>
                <p className="text-muted">Tres fases para conocerte y construir contigo.</p>
              </AnimateInView>

              <div className="relative mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
                <div
                  className="pointer-events-none absolute left-[12%] right-[12%] top-10 hidden h-px md:block"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${INEDITO}55, transparent)`,
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
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[hsl(215_100%_45%/0.45)] bg-primary-900 font-heading text-xl font-bold text-[hsl(215_100%_45%)] shadow-[0_0_24px_hsl(215_100%_45%/0.25)]">
                      {phase.n}
                    </div>
                    <h3 className="font-heading text-xl font-semibold">{phase.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{phase.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ——— FAQ ——— */}
          <section className="bg-primary-900 py-16 md:py-24">
            <div className="container mx-auto max-w-3xl px-4">
              <AnimateInView animation="slideUp" className="mb-10 text-center">
                <h2 className="font-heading text-3xl font-bold md:text-4xl">
                  Preguntas frecuentes
                </h2>
              </AnimateInView>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {FAQ.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`faq-${i}`}
                    className="overflow-hidden rounded-xl border border-primary-700 bg-primary-800 px-1"
                  >
                    <AccordionTrigger className="px-4 py-4 text-left font-heading text-base font-semibold hover:no-underline md:text-lg">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-muted md:text-base">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* ——— CTA final ——— */}
          <section
            id="aplicar"
            className="relative scroll-mt-24 overflow-hidden bg-gradient-to-r from-secondary-900 to-primary-800 py-20 md:py-24"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
              style={{ backgroundImage: `url(${HERO_IMG})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary-900/95 to-primary-800/90" />
            <FloatingOrbs reduce={!!reduce} />

            <div className="container relative z-10 mx-auto max-w-3xl px-4 text-center">
              <AnimateInView animation="scale">
                <img
                  src={LOGO_WCA_INEDITO}
                  alt="WCA | INÉDITO"
                  className="mx-auto mb-8 h-auto w-[min(85vw,20rem)]"
                />
                <h2 className="font-heading mb-4 text-3xl font-bold md:text-4xl">
                  Tu primer paso puede empezar aquí
                </h2>
                <p className="mx-auto mb-3 max-w-xl text-muted">
                  Antes de aplicar, revisa fechas, dedicación, misiones y FAQ. Si la experiencia
                  hace sentido para ti, queremos conocer lo que ves, lo que has intentado y lo que
                  podrías traer a WCA que todavía no existe.
                </p>
                <p className="mb-8 text-sm text-muted/80">
                  La aplicación de INÉDITO es propia de este programa (no es el formulario de
                  Integración). Pronto habilitaremos el enlace oficial.
                </p>
                <ApplySoonButton label="Quiero formar parte de INÉDITO" className="px-8" />
                <p className="mt-6 text-xs italic text-muted">
                  *Pulso: la señal de que algo inédito está por comenzar.
                </p>
              </AnimateInView>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
