import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, Phone, Minus, Plus, Maximize2, ChevronDown, Link2 } from "lucide-react";
import {
  ORG_DIRECTION_LABELS,
  buildOrgTree,
  initialsFromName,
  orgColor,
  type OrgPerson,
  type OrgDirectionKey,
} from "@shared/org-chart";
import { cn } from "@/lib/utils";

type Props = {
  people: OrgPerson[];
  title?: string;
  subtitle?: string;
  sedeLabel?: string;
};

type LayoutNode = {
  person: OrgPerson;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutNode[];
  hasChildren: boolean;
  expanded: boolean;
};

const CARD_W = 220;
const CARD_H = 168;
const DIR_CARD_W = 168;
const DIR_CARD_H = 196;
const GAP_X = 28;
const GAP_Y = 72;

function cardSize(person: OrgPerson) {
  if (person.roleKind === "director" && !person.directionKey.startsWith("sede")) {
    return { w: DIR_CARD_W, h: DIR_CARD_H };
  }
  return { w: CARD_W, h: CARD_H };
}

function layoutTree(
  person: OrgPerson,
  byParent: Map<number | null, OrgPerson[]>,
  expanded: Set<number>,
  x: number,
  y: number,
): LayoutNode {
  const kids = byParent.get(person.id) ?? [];
  const isExpanded = expanded.has(person.id);
  const { w, h } = cardSize(person);

  if (!isExpanded || kids.length === 0) {
    return {
      person,
      x,
      y,
      width: w,
      height: h,
      children: [],
      hasChildren: kids.length > 0,
      expanded: isExpanded,
    };
  }

  const childY = y + h + GAP_Y;
  const centered: LayoutNode[] = [];
  let walk = x;
  for (const child of kids) {
    const node = layoutTree(child, byParent, expanded, walk, childY);
    centered.push(node);
    walk += subtreeWidth(node) + GAP_X;
  }

  const childrenSpan =
    centered.reduce((sum, n) => sum + subtreeWidth(n), 0) +
    GAP_X * Math.max(0, centered.length - 1);
  const parentX = centered.length ? centered[0]!.x + childrenSpan / 2 - w / 2 : x;

  return {
    person,
    x: Math.max(0, parentX),
    y,
    width: w,
    height: h,
    children: centered,
    hasChildren: true,
    expanded: true,
  };
}

function subtreeWidth(node: LayoutNode): number {
  if (!node.expanded || node.children.length === 0) return node.width;
  const kidsW =
    node.children.reduce((sum, c) => sum + subtreeWidth(c), 0) +
    GAP_X * Math.max(0, node.children.length - 1);
  return Math.max(node.width, kidsW);
}

function collectNodes(node: LayoutNode, out: LayoutNode[] = []): LayoutNode[] {
  out.push(node);
  for (const c of node.children) collectNodes(c, out);
  return out;
}

function collectEdges(node: LayoutNode, edges: { from: LayoutNode; to: LayoutNode }[] = []) {
  for (const c of node.children) {
    edges.push({ from: node, to: c });
    collectEdges(c, edges);
  }
  return edges;
}

function PersonCard({
  node,
  onToggle,
}: {
  node: LayoutNode;
  onToggle: (id: number) => void;
}) {
  const p = node.person;
  const color = orgColor(p.directionKey as OrgDirectionKey);
  const isDeptDirector =
    p.roleKind === "director" && !p.directionKey.startsWith("sede");
  const directionLabel = ORG_DIRECTION_LABELS[p.directionKey as OrgDirectionKey];

  return (
    <button
      type="button"
      onClick={() => node.hasChildren && onToggle(p.id)}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition",
        "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]",
        node.hasChildren ? "cursor-pointer" : "cursor-default",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        borderColor: `${color}55`,
        borderLeftWidth: isDeptDirector ? 1 : 4,
        borderLeftColor: color,
      }}
    >
      {isDeptDirector && (
        <div className="h-2 w-full shrink-0" style={{ backgroundColor: color }} />
      )}
      <div
        className={cn(
          "flex flex-1 flex-col items-center px-3 pb-3 pt-3",
          !isDeptDirector && "flex-row items-center gap-3",
        )}
      >
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2",
            isDeptDirector ? "h-14 w-14" : "h-12 w-12",
          )}
          style={{ ["--tw-ring-color" as string]: `${color}55` }}
        >
          {p.photoUrl ? (
            <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {initialsFromName(p.name)}
            </div>
          )}
        </div>

        <div className={cn("min-w-0", isDeptDirector ? "mt-2 w-full text-center" : "flex-1")}>
          {isDeptDirector && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {directionLabel}
            </p>
          )}
          <p className="truncate text-sm font-bold leading-snug text-slate-900">{p.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug" style={{ color }}>
            {p.roleTitle}
          </p>
          <div
            className={cn(
              "mt-2 space-y-0.5 text-[11px] text-slate-500",
              isDeptDirector ? "text-center" : "",
            )}
          >
            {p.email && (
              <p className="flex items-center gap-1 truncate" title={p.email}>
                {!isDeptDirector && <Mail className="h-3 w-3 shrink-0" />}
                <span className="truncate">{p.email}</span>
              </p>
            )}
            {p.phone && (
              <p className="flex items-center gap-1 truncate">
                {!isDeptDirector && <Phone className="h-3 w-3 shrink-0" />}
                <span className="truncate">{p.phone}</span>
              </p>
            )}
            {p.socialLinks?.slice(0, 1).map((s) => (
              <p key={s.id} className="flex items-center gap-1 truncate">
                {!isDeptDirector && <Link2 className="h-3 w-3 shrink-0" />}
                <span className="truncate">{s.label}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {node.hasChildren && (
        <div
          className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white shadow"
          style={{ backgroundColor: color }}
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition", node.expanded && "rotate-180")}
          />
        </div>
      )}
    </button>
  );
}

export function OrgChartCanvas({ people, title, subtitle, sedeLabel }: Props) {
  const byParent = useMemo(() => buildOrgTree(people), [people]);
  const roots = byParent.get(null) ?? [];
  const root = roots[0];

  const defaultExpanded = useMemo(() => {
    const set = new Set<number>();
    if (root) {
      set.add(root.id);
      const level2 = byParent.get(root.id) ?? [];
      for (const n of level2) set.add(n.id);
    }
    return set;
  }, [root, byParent]);

  const [expanded, setExpanded] = useState<Set<number>>(defaultExpanded);
  useEffect(() => setExpanded(defaultExpanded), [defaultExpanded]);

  const tree = useMemo(() => {
    if (!root) return null;
    return layoutTree(root, byParent, expanded, 40, 40);
  }, [root, byParent, expanded]);

  const nodes = useMemo(() => (tree ? collectNodes(tree) : []), [tree]);
  const edges = useMemo(() => (tree ? collectEdges(tree) : []), [tree]);

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { w: 800, h: 600 };
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    return { w: maxX + 80, h: maxY + 80 };
  }, [nodes]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const toggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.panX + (e.clientX - drag.current.x),
      y: drag.current.panY + (e.clientY - drag.current.y),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.06 : 0.06;
      setScale((s) => Math.min(1.8, Math.max(0.35, s + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fit = () => {
    const el = viewportRef.current;
    if (!el) return;
    const pad = 80;
    const sx = (el.clientWidth - pad) / bounds.w;
    const sy = (el.clientHeight - pad) / bounds.h;
    const next = Math.min(1, Math.max(0.35, Math.min(sx, sy)));
    setScale(next);
    setPan({
      x: (el.clientWidth - bounds.w * next) / 2,
      y: 24,
    });
  };

  useEffect(() => {
    const t = window.setTimeout(fit, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.w, bounds.h]);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#f4f7fb]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="relative z-20 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur-md">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4086E7]">
            {sedeLabel ?? "Sede Monterrey"}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {title ?? "Organigrama Oficial"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {subtitle ?? "Estructura Organizativa Institucional del Ecosistema WCA"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <img
            src="https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png"
            alt="Ecosistema WCA"
            className="h-10 w-10"
          />
          <span className="hidden font-heading text-lg font-bold text-[#4086E7] sm:inline">
            Ecosistema WCA
          </span>
        </div>
      </header>

      <div
        ref={viewportRef}
        className="relative z-10 flex-1 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: bounds.w,
            height: bounds.h,
          }}
        >
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={bounds.w}
            height={bounds.h}
            aria-hidden
          >
            {edges.map(({ from, to }) => {
              const x1 = from.x + from.width / 2;
              const y1 = from.y + from.height;
              const x2 = to.x + to.width / 2;
              const y2 = to.y;
              const midY = (y1 + y2) / 2;
              const color = orgColor(to.person.directionKey as OrgDirectionKey);
              return (
                <path
                  key={`${from.person.id}-${to.person.id}`}
                  d={`M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.55}
                />
              );
            })}
          </svg>

          {nodes.map((node) => (
            <PersonCard key={node.person.id} node={node} onToggle={toggle} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-5 right-5 z-30 flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          onClick={() => setScale((s) => Math.max(0.35, s - 0.1))}
          aria-label="Alejar"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3.25rem] text-center text-xs font-semibold text-slate-600">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          onClick={() => setScale((s) => Math.min(1.8, s + 0.1))}
          aria-label="Acercar"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          onClick={fit}
          aria-label="Ajustar a pantalla"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-5 left-5 z-20 text-xs text-slate-400">
        Arrastra para mover · scroll para zoom · clic en una tarjeta para abrir su equipo
      </p>
    </div>
  );
}
