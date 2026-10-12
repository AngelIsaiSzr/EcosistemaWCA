import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "wouter";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionProps,
} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Globe,
  Heart,
  Layers,
  Lightbulb,
  Map,
  Menu,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  SECTION_TYPE_META,
  type IneditoLandingContent,
  type LandingButton,
  type LandingIcon,
  type LandingSection,
  type LandingSectionStyle,
} from "@shared/inedito-landing";

export const LANDING_ICON_COMPONENTS: Record<LandingIcon, LucideIcon> = {
  compass: Compass,
  layers: Layers,
  flame: Flame,
  sparkles: Sparkles,
  map: Map,
  calendar: CalendarDays,
  clock: Clock,
  check: CheckCircle2,
  rocket: Rocket,
  heart: Heart,
  users: Users,
  lightbulb: Lightbulb,
  target: Target,
  star: Star,
  trophy: Trophy,
  book: BookOpen,
  zap: Zap,
  globe: Globe,
  shield: ShieldCheck,
  message: MessageCircle,
};

/* ───────────── Utilidades ───────────── */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lighten(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** **negritas**, *cursiva*, ==acento== */
export function RichText({ text, accent }: { text: string; accent: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=]+==|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
          return (
            <span key={i} style={{ color: accent }}>
              {part.slice(2, -2)}
            </span>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const SPACING: Record<LandingSectionStyle["spacing"], string> = {
  none: "py-0",
  sm: "py-8 md:py-12",
  md: "py-14 md:py-20",
  lg: "py-20 md:py-28",
  xl: "py-28 md:py-36",
};

const WIDTH: Record<LandingSectionStyle["width"], string> = {
  narrow: "max-w-3xl",
  normal: "max-w-5xl",
  wide: "max-w-6xl",
};

const HEADING_SIZE: Record<LandingSectionStyle["textSize"], string> = {
  sm: "text-2xl md:text-4xl",
  md: "text-3xl md:text-5xl",
  lg: "text-4xl md:text-6xl",
};

const BODY_SIZE: Record<LandingSectionStyle["textSize"], string> = {
  sm: "text-sm md:text-base",
  md: "text-base md:text-lg",
  lg: "text-lg md:text-xl",
};

const RADIUS: Record<LandingSectionStyle["radius"], string> = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-[1.5rem]",
  xl: "rounded-[1.75rem]",
};

const SURFACE: Record<LandingSectionStyle["surface"], string> = {
  glass: "border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02]",
  solid: "border border-white/10 bg-[#0b1c3d]",
  outline: "border border-white/20 bg-transparent",
  plain: "border border-white/[0.08] bg-white/[0.03]",
};

const COLUMNS: Record<LandingSectionStyle["columns"], string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

function shadowStyle(shadow: LandingSectionStyle["shadow"], accent: string): CSSProperties | undefined {
  switch (shadow) {
    case "soft":
      return { boxShadow: "0 12px 32px rgba(0,0,0,0.28)" };
    case "strong":
      return { boxShadow: "0 24px 60px rgba(0,0,0,0.5)" };
    case "glow":
      return { boxShadow: `0 0 0 1px ${rgba(accent, 0.25)}, 0 18px 50px ${rgba(accent, 0.28)}` };
    default:
      return undefined;
  }
}

type Ctx = {
  accent: string;
  accentSoft: string;
  bg: string;
  reduce: boolean;
  editor: boolean;
};

function sectionCtx(section: LandingSection, content: IneditoLandingContent, reduce: boolean, editor: boolean): Ctx {
  const accent = section.style.accent || content.theme.accent;
  const accentSoft = section.style.accent ? lighten(section.style.accent, 0.3) : content.theme.accentSoft;
  return { accent, accentSoft, bg: content.theme.background, reduce, editor };
}

function reveal(kind: LandingSectionStyle["animation"], reduce: boolean, delay = 0): MotionProps {
  if (reduce || kind === "none") return {};
  const initial: { opacity: number; y?: number; scale?: number } =
    kind === "fade"
      ? { opacity: 0 }
      : kind === "scale"
        ? { opacity: 0, scale: 0.94 }
        : { opacity: 0, y: 28 };
  return {
    initial,
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  };
}

const display: CSSProperties = { fontFamily: "var(--inedito-display)" };

/* ───────────── Piezas compartidas ───────────── */

function StormSky({ reduce, accent }: { reduce: boolean; accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 20% 0%, ${rgba(accent, 0.28)}, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(56,189,248,0.12), transparent 45%), linear-gradient(180deg, #020617 0%, #0b1c3d 42%, #07101f 100%)`,
        }}
      />
      {!reduce && (
        <>
          <motion.div
            className="absolute -left-24 top-10 h-[28rem] w-[28rem] rounded-full blur-[100px]"
            style={{ backgroundColor: rgba(accent, 0.25) }}
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

function SectionBackground({ section, ctx, heroLike }: { section: LandingSection; ctx: Ctx; heroLike?: boolean }) {
  const s = section.style;
  switch (s.background) {
    case "storm":
      return <StormSky reduce={ctx.reduce} accent={ctx.accent} />;
    case "navy":
      return <div className="absolute inset-0 bg-[#061228]" aria-hidden />;
    case "glow":
      return (
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${rgba(ctx.accent, 0.12)}, transparent 55%)` }}
          aria-hidden
        />
      );
    case "color":
      return <div className="absolute inset-0" style={{ backgroundColor: s.bgColor }} aria-hidden />;
    case "gradient":
      return (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${s.bgColor}, ${s.bgColor2})` }}
          aria-hidden
        />
      );
    case "image": {
      if (!s.bgImage || heroLike) return null;
      const o = s.overlay / 100;
      return (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${s.bgImage})` }} aria-hidden />
          <div className="absolute inset-0" style={{ backgroundColor: rgba(ctx.bg, o) }} aria-hidden />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${ctx.bg}, ${rgba(ctx.bg, Math.min(0.7, o))}, ${rgba(ctx.bg, Math.min(0.5, o))})` }}
            aria-hidden
          />
        </>
      );
    }
    default:
      return null;
  }
}

function LandingButtonView({ button, ctx, className }: { button: LandingButton; ctx: Ctx; className?: string }) {
  const base =
    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold tracking-wide transition";
  const variantClass =
    button.variant === "primary"
      ? "text-white hover:brightness-110"
      : button.variant === "outline"
        ? "border border-white/25 bg-white/5 px-6 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/10"
        : button.variant === "white"
          ? "bg-white text-[#020617] hover:bg-white/90"
          : "px-3 text-white/80 underline-offset-4 hover:text-white hover:underline";
  const style: CSSProperties | undefined =
    button.variant === "primary"
      ? { backgroundColor: ctx.accent, boxShadow: `0 12px 40px ${rgba(ctx.accent, 0.35)}` }
      : undefined;

  const inner = (
    <>
      {button.label}
      {button.soon ? (
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]">
          Muy pronto
        </span>
      ) : button.arrow ? (
        <ArrowRight className="h-4 w-4" aria-hidden />
      ) : null}
    </>
  );

  if (button.soon || !button.href) {
    return (
      <button
        type="button"
        disabled
        title={button.soon ? "Disponible muy pronto" : undefined}
        className={cn(base, variantClass, "cursor-not-allowed opacity-90", className)}
        style={style}
      >
        {inner}
      </button>
    );
  }
  return (
    <a
      href={button.href}
      target={button.newTab ? "_blank" : undefined}
      rel={button.newTab ? "noopener noreferrer" : undefined}
      className={cn(base, variantClass, className)}
      style={style}
    >
      {inner}
    </a>
  );
}

function Buttons({ buttons, ctx, center }: { buttons: LandingButton[]; ctx: Ctx; center?: boolean }) {
  if (buttons.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-3", center && "justify-center")}>
      {buttons.map((b) => (
        <LandingButtonView key={b.id} button={b} ctx={ctx} />
      ))}
    </div>
  );
}

function SectionHeading({ section, ctx, className }: { section: LandingSection; ctx: Ctx; className?: string }) {
  const s = section.style;
  const center = s.align === "center";
  if (!section.eyebrow && !section.title && !section.subtitle) return null;
  return (
    <motion.div className={cn(center ? "text-center" : "text-left", "mb-12 md:mb-14", className)} {...reveal(s.animation, ctx.reduce)}>
      {section.eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: ctx.accentSoft }}>
          {section.eyebrow}
        </p>
      ) : null}
      {section.title ? (
        <h2 className={cn("mb-3 text-balance font-bold tracking-tight", HEADING_SIZE[s.textSize])} style={display}>
          <RichText text={section.title} accent={ctx.accentSoft} />
        </h2>
      ) : null}
      {section.subtitle ? (
        <p className={cn("max-w-2xl text-white/60", center && "mx-auto")}>
          <RichText text={section.subtitle} accent={ctx.accentSoft} />
        </p>
      ) : null}
    </motion.div>
  );
}

/* ───────────── Secciones ───────────── */

function HeroSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const heroFade = useTransform(scrollYProgress, [0, 0.9], [1, 0.4]);
  const s = section.style;
  const center = section.variant === "center" || s.align === "center";
  const bgImage = s.background === "image" ? s.bgImage || section.image : "";
  const o = s.overlay / 100;

  return (
    <section
      ref={ref}
      className={cn(
        "relative flex min-h-[100svh] overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-24",
        center ? "items-center" : "items-end sm:items-center",
      )}
    >
      {bgImage ? (
        <>
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${bgImage})`,
              y: ctx.reduce || ctx.editor ? 0 : heroY,
              opacity: ctx.reduce || ctx.editor ? 1 : heroFade,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: center
                ? rgba(ctx.bg, o)
                : `linear-gradient(to right, ${ctx.bg}, ${rgba(ctx.bg, o)}, ${rgba(ctx.bg, Math.max(0, o - 0.47))})`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${ctx.bg}, transparent, ${rgba(ctx.bg, 0.5)})` }}
          />
        </>
      ) : (
        <SectionBackground section={section} ctx={ctx} heroLike />
      )}
      {!ctx.reduce && (
        <motion.div
          className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full blur-[90px]"
          style={{ backgroundColor: rgba(ctx.accent, 0.2) }}
          animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.15, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className={cn("relative z-10 mx-auto w-full px-4", WIDTH[s.width])}>
        <motion.div
          className={cn("max-w-2xl", center && "mx-auto text-center")}
          initial={ctx.reduce || s.animation === "none" ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {section.eyebrow ? (
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/80">{section.eyebrow}</p>
          ) : null}
          {section.logo ? (
            <img
              src={section.logo}
              alt=""
              className={cn("mb-6 h-auto w-[min(90vw,20rem)] sm:w-[min(90vw,24rem)]", center && "mx-auto")}
              style={{ filter: `drop-shadow(0 12px 48px ${rgba(ctx.accent, 0.45)})` }}
            />
          ) : null}
          {section.title ? (
            <h1
              className={cn(
                "mb-5 max-w-xl text-balance font-bold leading-[1.15] tracking-tight",
                center && "mx-auto",
                s.textSize === "lg"
                  ? "text-3xl sm:text-4xl md:text-5xl"
                  : s.textSize === "sm"
                    ? "text-xl sm:text-2xl md:text-3xl"
                    : "text-2xl sm:text-3xl md:text-[2.35rem]",
              )}
              style={display}
            >
              <RichText text={section.title} accent={ctx.accentSoft} />
            </h1>
          ) : null}
          {section.subtitle ? (
            <p className={cn("mb-8 max-w-lg text-lg font-medium leading-snug text-white/85 sm:text-xl", center && "mx-auto")}>
              <RichText text={section.subtitle} accent={ctx.accentSoft} />
            </p>
          ) : null}
          <Buttons buttons={section.buttons} ctx={ctx} center={center} />
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  const pad = { none: "py-2", sm: "py-6", md: "py-10", lg: "py-14", xl: "py-20" }[s.spacing];
  const iconColors = [ctx.accentSoft, "#7dd3fc", "#67e8f9", ctx.accentSoft];
  if (section.variant === "cards") {
    return (
      <div className={cn("relative mx-auto px-4", WIDTH[s.width], pad)}>
        <div className={cn("grid gap-4", COLUMNS[Math.min(4, Math.max(1, section.items.length)) as 1 | 2 | 3 | 4])}>
          {section.items.map((it, i) => {
            const Icon = it.icon ? LANDING_ICON_COMPONENTS[it.icon] : null;
            return (
              <motion.div
                key={it.id}
                className={cn("p-6 text-center", SURFACE[s.surface], RADIUS[s.radius])}
                style={shadowStyle(s.shadow, ctx.accent)}
                {...reveal(s.animation, ctx.reduce, i * 0.06)}
              >
                {Icon ? <Icon className="mx-auto mb-3 h-6 w-6" style={{ color: iconColors[i % 4] }} aria-hidden /> : null}
                <p className="text-3xl font-bold" style={display}>
                  {it.title}
                </p>
                <p className="mt-1 text-sm text-white/65">{it.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative mx-auto flex flex-wrap items-center gap-x-10 gap-y-4 px-4 text-sm text-white/70",
        WIDTH[s.width],
        pad,
        s.align === "center" || !section.note ? "justify-center" : "justify-center sm:justify-between",
      )}
    >
      {section.items.map((it, i) => {
        const Icon = it.icon ? LANDING_ICON_COMPONENTS[it.icon] : null;
        return (
          <div key={it.id} className="flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4" style={{ color: iconColors[i % 4] }} aria-hidden /> : null}
            <span>
              <strong className="font-semibold text-white">{it.title}</strong> {it.body}
            </span>
          </div>
        );
      })}
      {section.note ? (
        <p className="w-full text-center text-xs uppercase tracking-[0.2em] text-white/40 sm:w-auto sm:text-left">
          {section.note}
        </p>
      ) : null}
    </div>
  );
}

function TextSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  const center = s.align === "center";
  const body = (
    <>
      {section.eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: ctx.accentSoft }}>
          {section.eyebrow}
        </p>
      ) : null}
      {section.title ? (
        <h2 className={cn("mb-6 text-balance font-bold tracking-tight", HEADING_SIZE[s.textSize])} style={display}>
          <RichText text={section.title} accent={ctx.accentSoft} />
        </h2>
      ) : null}
      {section.subtitle ? (
        <p className="mb-6 text-white/60">
          <RichText text={section.subtitle} accent={ctx.accentSoft} />
        </p>
      ) : null}
      {paragraphs(section.body).map((p, i, all) => (
        <p
          key={i}
          className={cn("text-justify leading-relaxed text-white/70", BODY_SIZE[s.textSize], i < all.length - 1 && "mb-6")}
        >
          <RichText text={p} accent={ctx.accentSoft} />
        </p>
      ))}
      {section.buttons.length > 0 ? (
        <div className="mt-8">
          <Buttons buttons={section.buttons} ctx={ctx} center={center} />
        </div>
      ) : null}
    </>
  );
  return (
    <div className={cn("relative z-10 mx-auto px-4", WIDTH[s.width], center ? "text-center" : "text-left")}>
      <motion.div {...reveal(s.animation, ctx.reduce)}>
        {section.variant === "card" ? (
          <div className={cn("p-8 md:p-12", SURFACE[s.surface], RADIUS[s.radius])} style={shadowStyle(s.shadow, ctx.accent)}>
            {body}
          </div>
        ) : (
          body
        )}
      </motion.div>
    </div>
  );
}

function GallerySection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  const items = section.items.filter((it) => it.image);
  return (
    <div className={cn("relative z-10 mx-auto px-4", WIDTH[s.width])}>
      <SectionHeading section={section} ctx={ctx} className="mb-10" />
      {section.variant === "grid" ? (
        <div className={cn("grid gap-4", COLUMNS[s.columns])}>
          {items.map((shot, i) => (
            <motion.figure
              key={shot.id}
              className={cn("relative overflow-hidden border border-white/15 bg-[#0b1c3d]", RADIUS[s.radius])}
              style={shadowStyle(s.shadow, ctx.accent)}
              {...reveal(s.animation, ctx.reduce, i * 0.08)}
            >
              <img src={shot.image} alt={shot.body} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              {shot.tag ? (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-[11px] font-medium uppercase tracking-[0.14em] text-white/85">
                  {shot.tag}
                </figcaption>
              ) : null}
            </motion.figure>
          ))}
        </div>
      ) : (
        <div className="relative mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 sm:flex-row sm:gap-0 sm:py-8">
          {items.map((shot, i) => {
            const middle = i === 1 && items.length >= 3;
            const rotate = i === 0 ? -6 : i === items.length - 1 ? 4 : i % 2 ? 3 : -2;
            return (
              <motion.figure
                key={shot.id}
                className={cn(
                  "relative w-[min(78vw,16rem)] overflow-hidden border border-white/15 bg-[#0b1c3d] shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:w-56 md:w-64",
                  RADIUS[s.radius === "lg" ? "md" : s.radius],
                  middle ? "z-20 sm:-mx-6 sm:scale-110" : "z-10",
                )}
                style={middle ? undefined : { rotate }}
                initial={ctx.reduce ? false : { opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={ctx.reduce ? undefined : { y: -10, rotate: 0, scale: 1.04, zIndex: 30 }}
              >
                <img src={shot.image} alt={shot.body} className="aspect-[4/5] w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
                {shot.tag ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-[11px] font-medium uppercase tracking-[0.14em] text-white/85">
                    {shot.tag}
                  </figcaption>
                ) : null}
              </motion.figure>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardsSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  const center = s.align === "center";
  return (
    <div className={cn("relative z-10 mx-auto px-4", WIDTH[s.width])}>
      <SectionHeading section={section} ctx={ctx} />
      <div className={cn("grid", section.variant === "check" ? "gap-4" : "gap-5", COLUMNS[s.columns])}>
        {section.items.map((it, i) => {
          const Icon = it.icon ? LANDING_ICON_COMPONENTS[it.icon] : null;
          return (
            <motion.article
              key={it.id}
              className={cn(
                "group relative overflow-hidden transition",
                SURFACE[s.surface],
                RADIUS[s.radius],
                section.variant === "image" ? "p-0" : section.variant === "check" ? "p-6" : "p-7",
                center && section.variant === "icon" && "text-center",
              )}
              style={{ ...shadowStyle(s.shadow, ctx.accent), ["--card-accent" as string]: rgba(ctx.accent, 0.45) }}
              {...reveal(s.animation, ctx.reduce, i * 0.07)}
            >
              {section.variant === "numbered" ? (
                <>
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <span className="text-4xl font-bold tracking-tight opacity-40 transition group-hover:opacity-80" style={{ ...display, color: ctx.accent }}>
                      {it.tag || String(i + 1).padStart(2, "0")}
                    </span>
                    {Icon ? <Icon className="h-6 w-6" style={{ color: ctx.accentSoft }} aria-hidden /> : null}
                  </div>
                  <h3 className="mb-2 text-xl font-bold tracking-tight" style={display}>
                    {it.title}
                  </h3>
                  <p className="text-justify text-sm leading-relaxed text-white/65">
                    <RichText text={it.body} accent={ctx.accentSoft} />
                  </p>
                </>
              ) : section.variant === "check" ? (
                <>
                  <div className="mb-3 flex items-center gap-2.5">
                    {(() => {
                      const CheckIcon = Icon ?? CheckCircle2;
                      return <CheckIcon className="h-5 w-5 shrink-0" style={{ color: ctx.accentSoft }} aria-hidden />;
                    })()}
                    <h3 className="text-lg font-bold tracking-tight" style={display}>
                      {it.title}
                    </h3>
                  </div>
                  <p className="text-justify text-sm leading-relaxed text-white/65">
                    <RichText text={it.body} accent={ctx.accentSoft} />
                  </p>
                </>
              ) : section.variant === "image" ? (
                <>
                  {it.image ? <img src={it.image} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" /> : null}
                  <div className="p-6">
                    {it.tag ? (
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ctx.accentSoft }}>
                        {it.tag}
                      </p>
                    ) : null}
                    <h3 className="mb-2 text-lg font-bold tracking-tight" style={display}>
                      {it.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/65">
                      <RichText text={it.body} accent={ctx.accentSoft} />
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {Icon ? (
                    <div
                      className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl", center && "mx-auto")}
                      style={{ backgroundColor: rgba(ctx.accent, 0.15), color: ctx.accentSoft }}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                  ) : null}
                  <h3 className="mb-2 text-lg font-bold tracking-tight" style={display}>
                    {it.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/65">
                    <RichText text={it.body} accent={ctx.accentSoft} />
                  </p>
                </>
              )}
              <span
                className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent transition group-hover:border-[color:var(--card-accent)]"
                aria-hidden
              />
            </motion.article>
          );
        })}
      </div>
      {section.buttons.length > 0 ? (
        <div className="mt-10">
          <Buttons buttons={section.buttons} ctx={ctx} center={center} />
        </div>
      ) : null}
    </div>
  );
}

function SplitSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  const imagesRight = section.variant === "images-right";
  const imgs = section.images.length > 0 ? section.images : section.image ? [section.image] : [];
  return (
    <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16">
      <motion.div
        className={cn("order-2", imagesRight ? "lg:order-2" : "lg:order-1")}
        {...reveal(s.animation === "none" ? "none" : "fade", ctx.reduce)}
      >
        <div className={cn("grid gap-3 sm:gap-4", imgs.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {imgs.map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src}
              alt=""
              className={cn(
                "w-full object-cover",
                imgs.length > 1 ? "aspect-[3/4]" : "aspect-[4/3]",
                RADIUS[s.radius],
                i % 2 === 1 && "mt-8 sm:mt-12",
              )}
              style={shadowStyle(s.shadow, ctx.accent)}
              loading="lazy"
            />
          ))}
        </div>
      </motion.div>
      <motion.div
        className={cn("order-1", imagesRight ? "lg:order-1" : "lg:order-2", s.align === "center" && "text-center")}
        {...reveal(s.animation, ctx.reduce, 0.08)}
      >
        {section.eyebrow ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: ctx.accentSoft }}>
            {section.eyebrow}
          </p>
        ) : null}
        {section.title ? (
          <h2 className={cn("mb-5 font-bold tracking-tight", s.textSize === "lg" ? "text-4xl md:text-5xl" : s.textSize === "sm" ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl")} style={display}>
            <RichText text={section.title} accent={ctx.accentSoft} />
          </h2>
        ) : null}
        {paragraphs(section.body).map((p, i, all) => (
          <p key={i} className={cn("text-justify leading-relaxed text-white/70", BODY_SIZE[s.textSize], i < all.length - 1 && "mb-4")}>
            <RichText text={p} accent={ctx.accentSoft} />
          </p>
        ))}
        {section.buttons.length > 0 ? (
          <div className="mt-8">
            <Buttons buttons={section.buttons} ctx={ctx} center={s.align === "center"} />
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

function StepsSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  const vertical = section.variant === "vertical";
  return (
    <div className={cn("relative z-10 mx-auto px-4", WIDTH[s.width])}>
      <SectionHeading section={section} ctx={ctx} />
      <div
        className={cn(
          "relative grid gap-10",
          !vertical && (section.items.length >= 4 ? "md:grid-cols-4 md:gap-6" : section.items.length === 2 ? "md:grid-cols-2 md:gap-6" : "md:grid-cols-3 md:gap-6"),
        )}
      >
        {!vertical && section.items.length > 1 ? (
          <div
            className="pointer-events-none absolute left-[10%] right-[10%] top-8 hidden h-px md:block"
            style={{ background: `linear-gradient(90deg, transparent, ${rgba(ctx.accent, 0.4)}, transparent)` }}
            aria-hidden
          />
        ) : null}
        {section.items.map((step, i) => (
          <motion.div
            key={step.id}
            className={cn("relative", vertical ? "flex items-start gap-5 text-left" : "text-center")}
            {...reveal(s.animation, ctx.reduce, i * 0.12)}
          >
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border bg-[#020617] text-xl font-bold",
                !vertical && "mx-auto mb-5",
              )}
              style={{ ...display, borderColor: rgba(ctx.accent, 0.5), color: ctx.accentSoft, boxShadow: `0 0 32px ${rgba(ctx.accent, 0.3)}` }}
            >
              {step.tag || String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <h3 className={cn("mb-2 text-xl font-bold", vertical && "mt-3")} style={display}>
                {step.title}
              </h3>
              <p className={cn("text-sm leading-relaxed text-white/65", vertical ? "max-w-xl" : "mx-auto max-w-xs text-justify sm:text-center")}>
                <RichText text={step.body} accent={ctx.accentSoft} />
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FaqSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  return (
    <div className={cn("relative z-10 mx-auto px-4", WIDTH[s.width])}>
      <SectionHeading section={section} ctx={ctx} className="mb-10" />
      <Accordion type="single" collapsible className="w-full space-y-3">
        {section.items.map((it, i) => (
          <AccordionItem
            key={it.id}
            value={`faq-${i}`}
            className={cn("overflow-hidden px-1", SURFACE[s.surface === "glass" ? "plain" : s.surface], RADIUS[s.radius === "lg" ? "md" : s.radius])}
            style={shadowStyle(s.shadow, ctx.accent)}
          >
            <AccordionTrigger className="px-4 py-4 text-left text-base font-semibold hover:no-underline md:text-lg" style={display}>
              {it.title}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-justify text-sm leading-relaxed text-white/65 md:text-base">
              <RichText text={it.body} accent={ctx.accentSoft} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function CtaSection({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  const s = section.style;
  return (
    <>
      {!ctx.reduce && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
          style={{ backgroundColor: rgba(ctx.accent, 0.25) }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className={cn("relative z-10 mx-auto px-4", WIDTH[s.width], s.align === "center" ? "text-center" : "text-left")}>
        <motion.div {...reveal(s.animation, ctx.reduce)}>
          {section.logo ? (
            <img src={section.logo} alt="" className={cn("mb-8 h-auto w-[min(85vw,18rem)]", s.align === "center" && "mx-auto")} />
          ) : null}
          {section.title ? (
            <h2 className={cn("mb-4 font-bold tracking-tight", s.textSize === "lg" ? "text-4xl md:text-5xl" : s.textSize === "sm" ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl")} style={display}>
              <RichText text={section.title} accent={ctx.accentSoft} />
            </h2>
          ) : null}
          {paragraphs(section.body).map((p, i) => (
            <p key={i} className={cn("mb-8 max-w-xl text-justify text-white/70 sm:text-center", s.align === "center" && "mx-auto")}>
              <RichText text={p} accent={ctx.accentSoft} />
            </p>
          ))}
          <Buttons buttons={section.buttons} ctx={ctx} center={s.align === "center"} />
          {section.note ? <p className="mt-6 text-xs italic text-white/40">{section.note}</p> : null}
        </motion.div>
      </div>
    </>
  );
}

function SectionBody({ section, ctx }: { section: LandingSection; ctx: Ctx }) {
  switch (section.type) {
    case "stats":
      return <StatsSection section={section} ctx={ctx} />;
    case "text":
      return <TextSection section={section} ctx={ctx} />;
    case "gallery":
      return <GallerySection section={section} ctx={ctx} />;
    case "cards":
      return <CardsSection section={section} ctx={ctx} />;
    case "split":
      return <SplitSection section={section} ctx={ctx} />;
    case "steps":
      return <StepsSection section={section} ctx={ctx} />;
    case "faq":
      return <FaqSection section={section} ctx={ctx} />;
    case "cta":
      return <CtaSection section={section} ctx={ctx} />;
    default:
      return null;
  }
}

/* ───────────── Nav y footer ───────────── */

function navLinks(content: IneditoLandingContent) {
  return content.sections
    .filter((s) => s.enabled && s.navLabel.trim() && s.anchor)
    .map((s) => ({ href: `#${s.anchor}`, label: s.navLabel.trim() }));
}

function IneditoNav({ content, offsetTop }: { content: IneditoLandingContent; offsetTop: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const links = navLinks(content);
  const accent = content.theme.accent;
  const firstAnchor = content.sections.find((s) => s.enabled && s.anchor)?.anchor;

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

  const cta = content.nav.ctaLabel.trim() ? (
    <a
      href={content.nav.ctaHref || "#"}
      className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
      style={{ backgroundColor: accent, boxShadow: `0 8px 24px ${rgba(accent, 0.35)}` }}
    >
      {content.nav.ctaLabel}
    </a>
  ) : null;

  return (
    <header className={cn("fixed inset-x-0 z-50 transition-all duration-300", offsetTop ? "top-10" : "top-0", scrolled ? "py-2" : "py-4")}>
      <div className="mx-auto max-w-6xl px-4">
        <nav
          className={cn(
            "flex items-center justify-between gap-4 rounded-full border px-3 py-2.5 backdrop-blur-xl transition-colors sm:px-5",
            scrolled ? "border-white/10 bg-[#020617]/85 shadow-[0_8px_40px_rgba(0,0,0,0.35)]" : "border-white/10 bg-white/[0.04]",
          )}
        >
          <a href={firstAnchor ? `#${firstAnchor}` : "#"} className="flex shrink-0 items-center gap-2" aria-label="Inicio">
            {content.nav.logo ? <img src={content.nav.logo} alt="" className="h-7 w-auto sm:h-8" /> : <span className="font-bold">INÉDITO</span>}
          </a>
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium tracking-wide text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {content.nav.showHomeLink ? (
              <Link href="/" className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-white/55 transition hover:text-white">
                Ecosistema WCA
              </Link>
            ) : null}
            {cta}
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
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base font-medium text-white"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {content.nav.ctaLabel.trim() ? (
              <a
                href={content.nav.ctaHref || "#"}
                className="mt-2 rounded-2xl px-4 py-3 text-center font-semibold text-white"
                style={{ backgroundColor: accent }}
                onClick={() => setOpen(false)}
              >
                {content.nav.ctaLabel}
              </a>
            ) : null}
            {content.nav.showHomeLink ? (
              <Link href="/" className="px-4 py-3 text-center text-sm text-white/60" onClick={() => setOpen(false)}>
                Volver a Ecosistema WCA
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}

function IneditoFooter({ content }: { content: IneditoLandingContent }) {
  const links = navLinks(content);
  return (
    <footer className="border-t border-white/10 py-12" style={{ backgroundColor: content.theme.background }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 md:flex-row md:items-start">
        <div className="text-center md:text-left">
          {content.footer.logo ? <img src={content.footer.logo} alt="" className="mx-auto mb-4 h-10 w-auto md:mx-0" /> : null}
          {content.footer.text ? (
            <p className="max-w-sm text-justify text-sm leading-relaxed text-white/55 md:text-left">{content.footer.text}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/55">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
          <Link href="/" className="transition hover:text-white">
            Ecosistema WCA
          </Link>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-white/35">© {new Date().getFullYear()} Ecosistema WCA · INÉDITO</p>
    </footer>
  );
}

/* ───────────── Vista completa ───────────── */

export function landingFontsHref(content: IneditoLandingContent) {
  const fonts = Array.from(new Set([content.theme.displayFont, content.theme.bodyFont]));
  const families = fonts
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Mensajes entre el editor (ventana padre) y /inedito?editor=1 dentro del iframe de vista previa. */
export const LANDING_PREVIEW_MSG = {
  ready: "inedito-landing:ready",
  content: "inedito-landing:content",
  select: "inedito-landing:select",
  selected: "inedito-landing:selected",
  scrollTo: "inedito-landing:scroll-to",
} as const;

export type LandingEditorBridge = {
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function IneditoLandingView({
  content,
  banner,
  editor,
}: {
  content: IneditoLandingContent;
  banner?: ReactNode;
  editor?: LandingEditorBridge;
}) {
  const reduce = !!useReducedMotion();
  const isEditor = !!editor;

  return (
    <div
      className={cn("inedito-landing flex min-h-screen flex-col overflow-x-hidden text-white antialiased", isEditor && "inedito-editor")}
      style={
        {
          "--inedito-display": `"${content.theme.displayFont}", system-ui, sans-serif`,
          "--inedito-body": `"${content.theme.bodyFont}", system-ui, sans-serif`,
          fontFamily: "var(--inedito-body)",
          backgroundColor: content.theme.background,
        } as CSSProperties
      }
      onClickCapture={
        isEditor
          ? (event) => {
              const target = event.target as HTMLElement;
              const sectionEl = target.closest<HTMLElement>("[data-section-id]");
              const interactive = target.closest("a, button");
              if (interactive && !target.closest("[data-radix-collection-item], [data-state]")) event.preventDefault();
              if (sectionEl) editor!.onSelect(sectionEl.dataset.sectionId!);
            }
          : undefined
      }
    >
      {banner}
      {content.nav.show ? <IneditoNav content={content} offsetTop={!!banner} /> : null}
      <main className="flex-grow">
        {content.sections
          .filter((s) => s.enabled)
          .map((section) => {
            const ctx = sectionCtx(section, content, reduce, isEditor);
            const selected = editor?.selectedId === section.id;
            const wrapperProps = {
              id: section.anchor || undefined,
              "data-section-id": section.id,
              "data-section-label": section.title.replace(/[*=]/g, "") || SECTION_TYPE_META[section.type].label,
            };
            if (section.type === "hero") {
              return (
                <div key={section.id} {...wrapperProps} className={cn("relative scroll-mt-28", isEditor && "inedito-editable", selected && "inedito-selected")}>
                  <HeroSection section={section} ctx={ctx} />
                </div>
              );
            }
            const s = section.style;
            return (
              <section
                key={section.id}
                {...wrapperProps}
                className={cn(
                  "relative scroll-mt-28 overflow-hidden",
                  section.type === "stats" ? "" : SPACING[s.spacing],
                  s.divider && "border-y border-white/10",
                  section.type === "stats" && s.background === "navy" && "bg-[#061228]/80",
                  isEditor && "inedito-editable",
                  selected && "inedito-selected",
                )}
              >
                {!(section.type === "stats" && s.background === "navy") ? <SectionBackground section={section} ctx={ctx} /> : null}
                <SectionBody section={section} ctx={ctx} />
              </section>
            );
          })}
      </main>
      {content.footer.show ? <IneditoFooter content={content} /> : null}
      {isEditor ? (
        <style>{`
          .inedito-editor .inedito-editable { cursor: pointer; }
          .inedito-editor .inedito-editable::after {
            content: attr(data-section-label); position: absolute; inset: 0; z-index: 40; pointer-events: none;
            border: 2px dashed transparent; transition: border-color .15s, background-color .15s;
            padding: 8px 10px; font: 600 11px/1 system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase;
            color: transparent;
          }
          .inedito-editor .inedito-editable:hover::after { border-color: rgba(91,143,212,.7); color: #cfe0ff; background: rgba(91,143,212,.06); }
          .inedito-editor .inedito-selected::after { border: 2px solid #5b8fd4 !important; color: #fff !important; background: rgba(91,143,212,.08); }
        `}</style>
      ) : null}
    </div>
  );
}