export const EMAIL_GROUP_COLORS = ["blue", "purple", "green", "amber", "rose", "cyan"] as const;
export type EmailGroupColor = (typeof EMAIL_GROUP_COLORS)[number];

export const EMAIL_GROUP_COLOR_LABEL: Record<EmailGroupColor, string> = {
  blue: "Azul",
  purple: "Morado",
  green: "Verde",
  amber: "Ámbar",
  rose: "Rosa",
  cyan: "Cian",
};

/** Clases literales (Tailwind necesita verlas completas). */
export const EMAIL_GROUP_CLASS: Record<
  EmailGroupColor,
  { dot: string; soft: string; chip: string; text: string; bar: string }
> = {
  blue: {
    dot: "bg-[#5b8fd4]",
    soft: "bg-[#5b8fd4]/[0.06]",
    chip: "border-l-[#5b8fd4] bg-[#5b8fd4]/10 hover:bg-[#5b8fd4]/20",
    text: "text-[#5b8fd4]",
    bar: "bg-[#5b8fd4]",
  },
  purple: {
    dot: "bg-violet-500",
    soft: "bg-violet-500/[0.06]",
    chip: "border-l-violet-500 bg-violet-500/10 hover:bg-violet-500/20",
    text: "text-violet-500",
    bar: "bg-violet-500",
  },
  green: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/[0.06]",
    chip: "border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20",
    text: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  amber: {
    dot: "bg-amber-500",
    soft: "bg-amber-500/[0.07]",
    chip: "border-l-amber-500 bg-amber-500/10 hover:bg-amber-500/20",
    text: "text-amber-500",
    bar: "bg-amber-500",
  },
  rose: {
    dot: "bg-rose-500",
    soft: "bg-rose-500/[0.06]",
    chip: "border-l-rose-500 bg-rose-500/10 hover:bg-rose-500/20",
    text: "text-rose-500",
    bar: "bg-rose-500",
  },
  cyan: {
    dot: "bg-cyan-500",
    soft: "bg-cyan-500/[0.06]",
    chip: "border-l-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20",
    text: "text-cyan-500",
    bar: "bg-cyan-500",
  },
};

export function groupColor(color: string | null | undefined): EmailGroupColor {
  return (EMAIL_GROUP_COLORS as readonly string[]).includes(color ?? "") ? (color as EmailGroupColor) : "blue";
}

/** Color neutro para correos sin grupo. */
export const UNGROUPED_CLASS = {
  dot: "bg-muted-foreground/50",
  soft: "",
  chip: "border-l-muted-foreground/50 bg-muted hover:bg-muted/80",
  text: "text-muted-foreground",
  bar: "bg-muted-foreground/50",
};
