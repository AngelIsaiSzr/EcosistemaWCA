import { Fragment, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  resolveSiteContent,
  type SiteColor,
  type SiteContent,
  type SiteContentKey,
} from "@shared/site-content";

export type SiteContentResponse = {
  content: Partial<Record<SiteContentKey, unknown>>;
  meta: Partial<Record<SiteContentKey, { updatedAt: string; updatedBy: string | null }>>;
};

export const SITE_CONTENT_QUERY_KEY = ["/api/site-content"] as const;

export function useSiteContentData() {
  return useQuery<SiteContentResponse>({
    queryKey: SITE_CONTENT_QUERY_KEY,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSiteContent<K extends SiteContentKey>(key: K): SiteContent[K] {
  const { data } = useSiteContentData();
  return resolveSiteContent(key, data?.content?.[key]);
}

export const SITE_TEXT_CLASS: Record<SiteColor, string> = {
  blue: "text-accent-blue",
  yellow: "text-accent-yellow",
  red: "text-accent-red",
  cyan: "text-accent-cyan",
  purple: "text-accent-purple",
  green: "text-accent-green",
};

export const SITE_BG_CLASS: Record<SiteColor, string> = {
  blue: "bg-accent-blue",
  yellow: "bg-accent-yellow",
  red: "bg-accent-red",
  cyan: "bg-accent-cyan",
  purple: "bg-accent-purple",
  green: "bg-accent-green",
};

const TAG_RE = /\[(blue|yellow|red|cyan|purple|green|b|i)\]([\s\S]*?)\[\/\1\]/g;
const ANY_TAG_RE = /\[\/?(blue|yellow|red|cyan|purple|green|b|i)\]/g;

function withLineBreaks(text: string, keyPrefix: string): ReactNode[] {
  return text.split("\n").map((line, i, all) => (
    <Fragment key={`${keyPrefix}-${i}`}>
      {line}
      {i < all.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function renderRich(text: string, emphasis: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(TAG_RE.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(...withLineBreaks(text.slice(last, match.index), `${keyPrefix}t${last}`));
    const tag = match[1];
    const key = `${keyPrefix}${tag}${match.index}`;
    const inner = renderRich(match[2], emphasis, `${key}-`);
    if (tag === "b") nodes.push(<strong key={key} className="font-bold">{inner}</strong>);
    else if (tag === "i") nodes.push(<em key={key} className="italic">{inner}</em>);
    else
      nodes.push(
        <span key={key} className={`${SITE_TEXT_CLASS[tag as SiteColor]} ${emphasis}`}>
          {inner}
        </span>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(...withLineBreaks(text.slice(last), `${keyPrefix}t${last}`));
  return nodes;
}

/** Pinta texto con etiquetas: [blue]color[/blue], [b]negrita[/b], [i]cursiva[/i] (se pueden combinar). */
export function RichText({ text, emphasis = "font-medium" }: { text: string; emphasis?: string }) {
  return <>{renderRich(text, emphasis, "")}</>;
}

const SOCIALS = [
  { id: "facebook", label: "Facebook", icon: "fab fa-facebook-f", hoverClass: "hover:bg-accent-blue", footerHover: "hover-accent-blue" },
  { id: "x", label: "X", icon: "fab fa-x-twitter", hoverClass: "hover:bg-accent-blue", footerHover: "hover-accent-blue" },
  { id: "instagram", label: "Instagram", icon: "fab fa-instagram", hoverClass: "hover:bg-accent-red", footerHover: "hover-accent-red" },
  { id: "linkedin", label: "LinkedIn", icon: "fab fa-linkedin-in", hoverClass: "hover:bg-accent-blue", footerHover: "hover-accent-blue" },
  { id: "youtube", label: "YouTube", icon: "fab fa-youtube", hoverClass: "hover:bg-accent-red", footerHover: "hover-accent-red" },
] as const;

export function getSocialLinks(contact: SiteContent["contact"]) {
  return SOCIALS.filter((s) => contact[s.id].trim()).map((s) => ({ ...s, href: contact[s.id].trim() }));
}

export function stripRichText(text: string) {
  return text.replace(ANY_TAG_RE, "").replace(/\s+/g, " ").trim();
}
