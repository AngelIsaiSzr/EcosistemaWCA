import { useEffect, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Compass,
  Flame,
  Layers,
  Sparkles,
  Users,
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

/** Azul oficial INÉDITO (logo) */
const BLUE = "#0056FF";
const BLUE_SOFT = "#5B8FFF";
const BLUE_GLOW = "rgba(0, 86, 255, 0.35)";
const BG = "#05070d";
const BG_ALT = "#070b14";

const HERO_IMG = "/media/inedito/hero-oficial.jpg";
const LOGO_INEDITO = "/media/inedito/logo-inedito.png";
const LOGO_WCA_INEDITO = "/media/inedito/logo-wca-inedito.png";
const APPLY_HREF = "/integracion";

const MOVEMENTS = [
  {
    id: "descubre",
    title: "DESCUBRE",
    body: "Autoconocimiento, propósito, WCA, TecnoHumanismo y primera misión.",
    icon: Compass,
  },
  {
    id: "crea",
    title: "CREA",
    body: "Laboratorios, prototipos, herramientas, usuarios y feedback.",
    icon: Layers,
  },
  {
    id: "transforma",
    title: "TRANSFORMA",
    body: "Proyecto real, liderazgo, colaboración y resultado observable.",
    icon: Flame,
  },
  {
    id: "trasciende",
    title: "TRASCIENDE",
    body: "Producto Vivo, Bitácora, OBRA VIVA, Constancia y comunidad posterior.",
    icon: Sparkles,
  },
] as const;

const BENEFITS = [
  "Participación en proyectos reales del Ecosistema WCA.",
  "Formación 6D y Play & Impact Learning aplicada a tu misión.",
  "Mentoría de Dirección y feedback de pares, usuarios y líderes.",
  "Experiencias interdisciplinarias, eventos y retos de innovación.",
  "Bitácora, Pasaporte, Producto Vivo, insignias y Constancia final.",
  "Posible ruta de Servicio Social, sujeta a proyecto, cupo y validación institucional.",
  "Acceso a la Red de INÉDITO y oportunidades posteriores según criterios y disponibilidad.",
] as const;

const PHASES = [
  {
    n: "01",
    title: "Aplicación",
    body: "Envías tu aplicación para una evaluación inicial.",
  },
  {
    n: "02",
    title: "Reto",
    body: "Participas en un reto de liderazgo e impacto.",
  },
  {
    n: "03",
    title: "Selección",
    body: "Cierras el proceso con las pruebas de selección final.",
  },
] as const;

const FAQ = [
  {
    q: "¿Necesito experiencia previa?",
    a: "No. La experiencia ayuda, pero el proceso evalúa potencial, iniciativa, humanidad, creación y compromiso.",
  },
  {
    q: "¿Cuánto tiempo requiere?",
    a: "Carga estimada de 6-8 horas por semana durante 6 meses.",
  },
  {
    q: "¿Puedo hacerlo como Servicio Social?",
    a: "Solo cuando exista proyecto, cupo y validación institucional. No debe prometerse automáticamente.",
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

const META = [
  { label: "7 Direcciones", detail: "Misiones reales" },
  { label: "Enero–Junio 2027", detail: "6 meses" },
  { label: "6–8 h / semana", detail: "Compromiso sostenido" },
] as const;

function preloadIneditoAssets() {
  if (typeof window === "undefined") return;
  for (const src of [HERO_IMG, LOGO_INEDITO, LOGO_WCA_INEDITO]) {
    const image = new Image();
    image.src = src;
    void image.decode?.().catch(() => undefined);
  }
}

function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-sm font-semibold tracking-wide text-white transition hover:scale-[1.02] active:scale-[0.98]",
        "bg-[#0056FF] shadow-[0_12px_40px_rgba(0,86,255,0.4)] hover:bg-[#0046d4]",
        className,
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export default function IneditoLandingPage() {
  useEffect(() => {
    preloadIneditoAssets();
  }, []);

  return (
    <>
      <Helmet>
        <title>INÉDITO · Edición Origen | Ecosistema WCA</title>
        <meta
          name="description"
          content="INÉDITO es la experiencia de formación, creación, liderazgo e impacto del Ecosistema WCA. Enero–Junio 2027."
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/inedito`} />
        <meta property="og:title" content="INÉDITO · Edición Origen | Ecosistema WCA" />
        <meta
          property="og:description"
          content="Descubre quién puedes llegar a ser mientras construyes algo que antes no existía."
        />
        <meta property="og:image" content={`${SITE_URL}${HERO_IMG}`} />
        <meta property="og:url" content={`${SITE_URL}/inedito`} />
        <meta property="og:type" content="website" />
        <link rel="preload" as="image" href={HERO_IMG} />
        <link rel="preload" as="image" href={LOGO_INEDITO} />
      </Helmet>

      <div
        className="inedito-landing flex min-h-screen flex-col text-white"
        style={{ backgroundColor: BG }}
      >
        <Navbar />

        <main className="flex-grow">
          {/* ——— Hero ——— */}
          <section className="relative isolate min-h-[100svh] overflow-hidden">
            <img
              src={HERO_IMG}
              alt="Comunidad WCA en formación colaborativa"
              className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-[#05070d]/75" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/40 via-[#05070d]/55 to-[#05070d]" />
            <div
              className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full blur-3xl"
              style={{ backgroundColor: BLUE_GLOW }}
            />
            <div
              className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full blur-3xl"
              style={{ backgroundColor: "rgba(0, 86, 255, 0.18)" }}
            />

            <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6">
              <motion.div
                className="mb-5 flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ backgroundColor: BLUE }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: BLUE }}
                  />
                </span>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.28em] sm:text-xs"
                  style={{ color: BLUE_SOFT }}
                >
                  Edición Origen · 01
                </p>
              </motion.div>

              <motion.img
                src={LOGO_INEDITO}
                alt="INÉDITO"
                className="mb-7 h-auto w-[min(90vw,30rem)] drop-shadow-[0_0_48px_rgba(0,86,255,0.4)]"
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.75, ease: "easeOut" }}
              />

              <motion.h1
                className="font-heading max-w-3xl text-balance text-3xl font-bold leading-[1.15] sm:text-4xl md:text-[2.75rem]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.55 }}
              >
                ¿Y si los próximos seis meses cambiaran quién eres?
              </motion.h1>

              <motion.p
                className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42, duration: 0.5 }}
              >
                Descubre quién puedes llegar a ser mientras construyes algo que antes no existía.
              </motion.p>

              <motion.div
                className="mt-8 flex w-full max-w-lg flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58, duration: 0.5 }}
              >
                <PrimaryCta href={APPLY_HREF}>Comenzar mi aplicación</PrimaryCta>
                <a
                  href="#experiencia"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-8 text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition hover:border-[#0056FF]/70 hover:bg-[#0056FF]/15"
                >
                  Conocer las misiones
                </a>
              </motion.div>

              <motion.div
                className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3 sm:gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.55 }}
              >
                {META.map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="font-heading text-sm font-semibold tracking-wide text-white sm:text-base">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-white/50">{item.detail}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ——— No es una vacante ——— */}
          <section
            className="relative border-t border-white/5 py-20 md:py-28"
            style={{ backgroundColor: BG_ALT }}
          >
            <div className="container mx-auto max-w-3xl px-4 text-center">
              <AnimateInView animation="slideUp">
                <p
                  className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: BLUE_SOFT }}
                >
                  Esto no es una vacante
                </p>
                <h2 className="font-heading text-3xl font-bold md:text-4xl">
                  No vienes a ocupar un puesto
                </h2>
              </AnimateInView>
              <AnimateInView
                animation="fadeIn"
                delay={0.12}
                className="mt-7 space-y-5 text-base leading-relaxed text-white/78 md:text-lg"
              >
                <p>
                  <span className="font-semibold" style={{ color: BLUE_SOFT }}>
                    INÉDITO
                  </span>{" "}
                  es la experiencia de formación, creación, liderazgo e impacto del Ecosistema WCA.
                  Durante seis meses te integrarás a una misión real, aprenderás con un equipo
                  interdisciplinario, recibirás mentoría y convertirás tus decisiones en un Producto
                  Vivo.
                </p>
                <p>
                  No buscamos manos extra. Buscamos personas con potencial para transformar y dejar
                  una parte de WCA mejor que antes.
                </p>
              </AnimateInView>
            </div>
          </section>

          {/* ——— Lo que vivirás ——— */}
          <section
            id="experiencia"
            className="scroll-mt-24 py-20 md:py-28"
            style={{ backgroundColor: BG }}
          >
            <div className="container mx-auto px-4">
              <AnimateInView animation="slideUp" className="mx-auto mb-16 max-w-2xl text-center">
                <p
                  className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: BLUE_SOFT }}
                >
                  Movimiento · Experiencia
                </p>
                <h2 className="font-heading text-3xl font-bold md:text-4xl">Lo que vivirás</h2>
              </AnimateInView>

              <div className="mx-auto grid max-w-5xl gap-x-12 gap-y-12 sm:grid-cols-2">
                {MOVEMENTS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <AnimateInView
                      key={item.id}
                      animation="slideUp"
                      delay={0.08 * i}
                      className="relative border-l-2 border-[#0056FF]/60 pl-6"
                    >
                      <p className="mb-2 font-heading text-xs font-bold tracking-[0.2em] text-white/35">
                        0{i + 1}
                      </p>
                      <div className="mb-3 flex items-center gap-3">
                        <Icon className="h-5 w-5" style={{ color: BLUE_SOFT }} aria-hidden />
                        <h3 className="font-heading text-xl font-bold tracking-wide">{item.title}</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-white/65 md:text-base">
                        {item.body}
                      </p>
                    </AnimateInView>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ——— Beneficios ——— */}
          <section
            className="border-y border-white/5 py-20 md:py-28"
            style={{ backgroundColor: BG_ALT }}
          >
            <div className="container mx-auto max-w-3xl px-4">
              <AnimateInView animation="slideUp" className="mb-12 text-center">
                <h2 className="font-heading text-3xl font-bold md:text-4xl">
                  Beneficios defendibles
                </h2>
              </AnimateInView>
              <ul className="space-y-5">
                {BENEFITS.map((text, i) => (
                  <AnimateInView
                    key={text}
                    animation="fadeIn"
                    delay={0.04 * i}
                    className="flex gap-3.5 text-sm leading-relaxed text-white/80 md:text-base"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${BLUE}33` }}
                      aria-hidden
                    >
                      <Check className="h-3 w-3" style={{ color: BLUE_SOFT }} />
                    </span>
                    <span>{text}</span>
                  </AnimateInView>
                ))}
              </ul>
            </div>
          </section>

          {/* ——— A quién buscamos ——— */}
          <section className="py-20 md:py-28" style={{ backgroundColor: BG }}>
            <div className="container mx-auto px-4">
              <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <AnimateInView animation="slideRight">
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={HERO_IMG}
                      alt="Equipo WCA colaborando en proyectos reales"
                      className="aspect-[4/3] w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05070d]/50 to-transparent" />
                  </div>
                </AnimateInView>
                <AnimateInView animation="slideLeft" delay={0.1}>
                  <p
                    className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em]"
                    style={{ color: BLUE_SOFT }}
                  >
                    A quién buscamos
                  </p>
                  <h2 className="font-heading text-3xl font-bold md:text-4xl">
                    No buscamos perfección
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-white/80">
                    Buscamos curiosidad, iniciativa, humanidad, creación, compromiso y potencial de
                    aprendizaje.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-white/65">
                    No necesitas experiencia previa ni un portafolio perfecto. Sí necesitas una
                    historia concreta de algo que hayas intentado, la disposición para aprender con
                    otros y una carga semanal que puedas sostener.
                  </p>
                  <div
                    className="mt-7 flex items-center gap-2 text-sm"
                    style={{ color: BLUE_SOFT }}
                  >
                    <Users className="h-4 w-4" aria-hidden />
                    Comunidad real · Impacto observable
                  </div>
                </AnimateInView>
              </div>
            </div>
          </section>

          {/* ——— Proceso ——— */}
          <section
            className="border-t border-white/5 py-20 md:py-28"
            style={{ backgroundColor: BG_ALT }}
          >
            <div className="container mx-auto px-4">
              <AnimateInView animation="slideUp" className="mx-auto mb-16 max-w-2xl text-center">
                <h2 className="font-heading text-3xl font-bold md:text-4xl">El proceso</h2>
                <p className="mt-3 text-white/60">
                  Tres fases para conocerte y construir contigo.
                </p>
              </AnimateInView>

              <div className="relative mx-auto grid max-w-4xl gap-12 md:grid-cols-3 md:gap-8">
                <div
                  className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px md:block"
                  style={{ background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)` }}
                  aria-hidden
                />
                {PHASES.map((phase, i) => (
                  <AnimateInView
                    key={phase.n}
                    animation="slideUp"
                    delay={0.1 * i}
                    className="relative text-center"
                  >
                    <p
                      className="font-heading text-5xl font-bold tabular-nums"
                      style={{ color: `${BLUE}cc` }}
                    >
                      {phase.n}
                    </p>
                    <h3 className="mt-3 font-heading text-xl font-semibold">{phase.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{phase.body}</p>
                  </AnimateInView>
                ))}
              </div>
            </div>
          </section>

          {/* ——— FAQ ——— */}
          <section className="py-20 md:py-28" style={{ backgroundColor: BG }}>
            <div className="container mx-auto max-w-3xl px-4">
              <AnimateInView animation="slideUp" className="mb-12 text-center">
                <h2 className="font-heading text-3xl font-bold md:text-4xl">
                  Preguntas frecuentes
                </h2>
              </AnimateInView>
              <Accordion type="single" collapsible className="w-full">
                {FAQ.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`faq-${i}`}
                    className="mt-3 border-0 first:mt-0"
                  >
                    <AccordionTrigger className="rounded-xl bg-white/[0.04] px-5 py-4 text-left font-heading text-base font-semibold hover:no-underline data-[state=open]:rounded-b-none data-[state=open]:bg-white/[0.06] md:text-lg">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="rounded-b-xl bg-white/[0.04] px-5 pb-5 text-sm leading-relaxed text-white/70 md:text-base">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* ——— Cierre ——— */}
          <section className="relative overflow-hidden border-t border-white/5 py-24 md:py-32">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, rgba(0,86,255,0.28) 0%, ${BG} 45%, ${BG} 100%)`,
              }}
            />
            <div
              className="pointer-events-none absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
              style={{ backgroundColor: BLUE_GLOW }}
            />
            <div className="container relative z-10 mx-auto max-w-3xl px-4 text-center">
              <AnimateInView animation="scale">
                <img
                  src={LOGO_WCA_INEDITO}
                  alt="WCA | INÉDITO"
                  className="mx-auto mb-10 h-auto w-[min(85vw,24rem)]"
                />
                <h2 className="font-heading text-3xl font-bold md:text-4xl">
                  Tu primer paso puede empezar aquí
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75">
                  Antes de aplicar, revisa fechas, dedicación, misiones y FAQ. Si la experiencia
                  hace sentido para ti, queremos conocer lo que ves, lo que has intentado y lo que
                  podrías traer a WCA que todavía no existe.
                </p>
                <PrimaryCta href={APPLY_HREF} className="mt-10 px-10">
                  Quiero formar parte de INÉDITO
                </PrimaryCta>
                <p className="mt-7 text-xs italic text-white/40">
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
