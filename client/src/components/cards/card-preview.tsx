import { cn } from "@/lib/utils";
import type { PresentationCard } from "@shared/schema";
import {
  getCardDirectionMeta,
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
  if (card.direction === "direccion-sede" && theme.sedeAccent === "purple") {
    return "hsl(270 95% 68%)";
  }
  const meta = getCardDirectionMeta(card.direction);
  return `hsl(${meta.hsl})`;
}

const SOCIALS: Array<{
  key: keyof CardPreviewData;
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
  { key: "email", label: "Email", href: (v) => (v.startsWith("mailto:") ? v : `mailto:${v}`), icon: "fas fa-envelope", color: "#5b8fd4" },
  { key: "website", label: "Web", href: (v) => v, icon: "fas fa-globe", color: "#5b8fd4" },
];

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
  const socials = SOCIALS.filter((s) => {
    const val = card[s.key];
    return typeof val === "string" && val.trim().length > 0;
  });

  const bg =
    theme.backgroundStyle === "solid"
      ? `linear-gradient(180deg, hsl(222 40% 8%), hsl(222 40% 8%))`
      : theme.backgroundStyle === "mesh"
        ? `radial-gradient(ellipse at 20% 0%, ${accent}33, transparent 50%), radial-gradient(ellipse at 80% 20%, ${accent}22, transparent 45%), linear-gradient(180deg, hsl(222 45% 7%), hsl(222 40% 10%))`
        : `linear-gradient(165deg, hsl(222 45% 8%) 0%, hsl(222 40% 12%) 45%, color-mix(in srgb, ${accent} 18%, hsl(222 40% 8%)) 100%)`;

  return (
    <div
      className={cn(
        "relative overflow-hidden text-white",
        compact ? "min-h-[560px] rounded-[2rem]" : "min-h-screen",
        className,
      )}
      style={{ background: bg }}
    >
      <div className={cn("mx-auto flex w-full max-w-md flex-col items-center px-5", compact ? "py-8" : "py-12")}>
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
          className="mb-4 h-28 w-28 overflow-hidden rounded-full ring-4"
          style={{ boxShadow: `0 0 0 3px ${accent}55` }}
        >
          {card.image ? (
            <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-3xl font-bold"
              style={{ background: accent }}
            >
              {(card.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-center font-heading text-2xl font-bold leading-tight">{card.name || "Nombre"}</h1>
        <p className="mt-1 text-center text-sm font-medium" style={{ color: accent }}>
          {card.roleTitle || "Cargo"}
        </p>
        <span
          className="mt-3 rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
        >
          {direction.label}
        </span>

        {card.bio ? (
          <p className="mt-4 text-center text-sm leading-relaxed text-white/75">{card.bio}</p>
        ) : null}

        {socials.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {socials.map((s) => {
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
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-center text-sm font-semibold transition hover:opacity-90"
              style={
                link.style === "outline"
                  ? {
                      borderRadius: buttonRadius,
                      border: `1.5px solid ${accent}`,
                      color: accent,
                      background: "transparent",
                    }
                  : link.style === "soft"
                    ? {
                        borderRadius: buttonRadius,
                        background: `${accent}28`,
                        color: "#fff",
                      }
                    : {
                        borderRadius: buttonRadius,
                        background: accent,
                        color: "#0b1220",
                      }
              }
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
