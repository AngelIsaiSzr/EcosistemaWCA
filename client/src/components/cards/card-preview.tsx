import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { PresentationCard } from "@shared/schema";
import { resolveMediaUrl } from "@shared/media-url";
import {
  getCardDirectionMeta,
  resolveCardDirectionColor,
  type CardSocialKey,
  type PresentationCardLink,
  type PresentationCardTheme,
} from "@shared/card-directions";

export type CardPreviewData = Pick<
  PresentationCard,
  | "name"
  | "roleTitle"
  | "bio"
  | "image"
  | "direction"
  | "linkedIn"
  | "instagram"
  | "twitter"
  | "github"
  | "youtube"
  | "tiktok"
  | "whatsapp"
  | "email"
  | "website"
> & {
  theme?: PresentationCardTheme | null;
  links?: PresentationCardLink[] | null;
};

function resolveAccent(card: CardPreviewData): string {
  const theme = card.theme ?? {};
  if (theme.accentColor) return theme.accentColor;
  return resolveCardDirectionColor(card.direction, theme);
}

const SOCIALS: Array<{
  key: CardSocialKey;
  label: string;
  href: (v: string) => string;
  icon: string;
  color: string;
}> = [
  { key: "linkedIn", label: "LinkedIn", href: (v) => v, icon: "fab fa-linkedin-in", color: "#0A66C2" },
  { key: "instagram", label: "Instagram", href: (v) => v, icon: "fab fa-instagram", color: "#E4405F" },
  { key: "twitter", label: "Twitter/X", href: (v) => v, icon: "fab fa-twitter", color: "#1DA1F2" },
  { key: "github", label: "GitHub", href: (v) => v, icon: "fab fa-github", color: "#fff" },
  { key: "youtube", label: "YouTube", href: (v) => v, icon: "fab fa-youtube", color: "#FF0000" },
  { key: "tiktok", label: "TikTok", href: (v) => v, icon: "fab fa-tiktok", color: "#69C9D0" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: (v) => (v.startsWith("http") ? v : `https://wa.me/${v.replace(/\D/g, "")}`),
    icon: "fab fa-whatsapp",
    color: "#25D366",
  },
  {
    key: "email",
    label: "Email",
    href: (v) => (v.startsWith("mailto:") ? v : `mailto:${v}`),
    icon: "fas fa-envelope",
    color: "#5b8fd4",
  },
  { key: "website", label: "Sitio web", href: (v) => v, icon: "fas fa-globe", color: "#5b8fd4" },
];

function socialMode(
  theme: PresentationCardTheme,
  key: CardSocialKey,
): "circle" | "button" {
  return theme.socialDisplay?.[key] ?? theme.socialDisplayDefault ?? "circle";
}

function buttonStyles(
  accent: string,
  buttonRadius: string,
  style: PresentationCardLink["style"],
): CSSProperties {
  if (style === "outline") {
    return {
      borderRadius: buttonRadius,
      border: `1.5px solid ${accent}`,
      color: accent,
      background: "transparent",
    };
  }
  if (style === "soft") {
    return {
      borderRadius: buttonRadius,
      background: `${accent}28`,
      color: "#fff",
    };
  }
  return {
    borderRadius: buttonRadius,
    background: accent,
    color: "#0b1220",
  };
}

function resolveCardBackground(
  theme: PresentationCardTheme,
  accent: string,
): CSSProperties {
  const style = theme.backgroundStyle || "gradient";
  const solid = theme.backgroundColor?.trim() || "#0b1220";
  const overlayPct = Math.max(0, Math.min(100, theme.backgroundOverlay ?? 55));
  const overlay = overlayPct / 100;

  switch (style) {
    case "solid":
      return { background: solid };
    case "mesh":
      return {
        background: `radial-gradient(ellipse at 20% 0%, ${accent}33, transparent 50%), radial-gradient(ellipse at 80% 20%, ${accent}22, transparent 45%), linear-gradient(180deg, hsl(222 45% 7%), hsl(222 40% 10%))`,
      };
    case "aurora":
      return {
        background: [
          `radial-gradient(ellipse at 12% 18%, ${accent}45, transparent 42%)`,
          `radial-gradient(ellipse at 88% 8%, hsl(280 85% 55% / 0.28), transparent 44%)`,
          `radial-gradient(ellipse at 55% 95%, hsl(190 90% 45% / 0.22), transparent 48%)`,
          `linear-gradient(180deg, hsl(222 48% 6%), hsl(222 40% 10%))`,
        ].join(", "),
      };
    case "noir":
      return {
        background: `linear-gradient(180deg, #050505 0%, #0a0a0a 55%, color-mix(in srgb, ${accent} 14%, #050505) 100%)`,
      };
    case "sunset":
      return {
        background:
          "linear-gradient(160deg, hsl(222 42% 7%) 0%, hsl(340 48% 16%) 38%, hsl(22 72% 22%) 68%, hsl(38 78% 28%) 100%)",
      };
    case "ocean":
      return {
        background:
          "linear-gradient(180deg, hsl(212 52% 7%) 0%, hsl(198 58% 13%) 42%, hsl(168 42% 15%) 100%)",
      };
    case "spotlight":
      return {
        background: `radial-gradient(ellipse 85% 55% at 50% -8%, ${accent}50, transparent 55%), linear-gradient(180deg, hsl(222 45% 7%), hsl(222 42% 4%))`,
      };
    case "duo":
      return {
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 38%, #0b1220) 0%, #0b1220 48%, color-mix(in srgb, ${accent} 22%, #1a1028) 100%)`,
      };
    case "carbon":
      return {
        backgroundColor: solid,
        backgroundImage: [
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 4px)",
          "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)",
        ].join(", "),
      };
    case "image": {
      const img = theme.backgroundImage?.trim();
      if (!img) {
        return { background: solid };
      }
      const url = resolveMediaUrl(img);
      return {
        backgroundColor: "#0b1220",
        backgroundImage: `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), url("${url.replace(/"/g, '\\"')}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }
    case "gradient":
    default:
      return {
        background: `linear-gradient(165deg, hsl(222 45% 8%) 0%, hsl(222 40% 12%) 45%, color-mix(in srgb, ${accent} 18%, hsl(222 40% 8%)) 100%)`,
      };
  }
}

export function CardPreview({
  card,
  className,
  compact,
}: {
  card: CardPreviewData;
  className?: string;
  compact?: boolean;
}) {
  const accent = resolveAccent(card);
  const direction = getCardDirectionMeta(card.direction);
  const theme = card.theme ?? {};
  const buttonRadius =
    theme.buttonStyle === "pill" ? "9999px" : theme.buttonStyle === "square" ? "6px" : "14px";
  const links = [...(card.links ?? [])]
    .filter((l) => l.enabled !== false)
    .sort((a, b) => a.order - b.order);

  const activeSocials = SOCIALS.filter((s) => {
    const val = card[s.key];
    return typeof val === "string" && val.trim().length > 0;
  });
  const circleSocials = activeSocials.filter((s) => socialMode(theme, s.key) === "circle");
  const buttonSocials = activeSocials.filter((s) => socialMode(theme, s.key) === "button");

  const bg = resolveCardBackground(theme, accent);

  return (
    <div
      className={cn(
        "relative text-white",
        compact
          ? "flex min-h-[560px] items-center justify-center overflow-hidden rounded-[2rem]"
          : "fixed inset-0 flex flex-col overflow-y-auto overscroll-y-contain",
        className,
      )}
      style={bg}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-md flex-col items-center px-5",
          compact ? "py-8" : "my-auto py-8 sm:py-10",
        )}
      >
        {theme.showBrand !== false && (
          <div className="mb-6 flex items-center gap-2 opacity-80">
            <img
              src="https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png"
              alt="Ecosistema WCA"
              className="h-6 w-6"
            />
            <span className="text-xs font-medium tracking-wide text-white/70">Ecosistema WCA</span>
          </div>
        )}

        <div
          className="mb-4 h-28 w-28 overflow-hidden rounded-full"
          style={{ boxShadow: `0 0 0 3px ${accent}` }}
        >
          {card.image ? (
            <img
              src={resolveMediaUrl(card.image)}
              alt={card.name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-3xl font-bold"
              style={{ background: accent, color: "#0b1220" }}
            >
              {(card.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-center font-heading text-2xl font-bold leading-tight">
          {card.name || "Nombre"}
        </h1>
        <p
          className="mt-1.5 text-center text-[15px] font-semibold tracking-tight"
          style={{ color: accent }}
        >
          {card.roleTitle || "Cargo"}
        </p>

        <div className="mt-3.5 flex max-w-[92%] items-center gap-2.5">
          <span className="h-px min-w-[1.25rem] flex-1 bg-white/20" aria-hidden />
          <span className="inline-flex items-center gap-1.5 text-center text-[10px] font-medium uppercase leading-snug tracking-[0.14em] text-white/55">
            <i className="fas fa-sitemap text-[9px] text-white/40" aria-hidden />
            {direction.label}
          </span>
          <span className="h-px min-w-[1.25rem] flex-1 bg-white/20" aria-hidden />
        </div>

        {card.bio ? (
          <p className="mt-4 text-center text-sm leading-relaxed text-white/75">{card.bio}</p>
        ) : null}

        {circleSocials.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {circleSocials.map((s) => {
              const value = String(card[s.key]);
              return (
                <a
                  key={s.key}
                  href={s.href(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                  style={{ color: s.color }}
                >
                  <i className={s.icon} />
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex w-full flex-col gap-3">
          {buttonSocials.map((s) => {
            const value = String(card[s.key]);
            return (
              <a
                key={s.key}
                href={s.href(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-center text-sm font-semibold transition hover:opacity-90"
                style={buttonStyles(accent, buttonRadius, "solid")}
              >
                <i className={s.icon} style={{ color: s.key === "github" ? "#0b1220" : undefined }} />
                {s.label}
              </a>
            );
          })}

          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-center text-sm font-semibold transition hover:opacity-90"
              style={buttonStyles(accent, buttonRadius, link.style)}
            >
              {link.icon ? <i className={link.icon} /> : null}
              {link.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
