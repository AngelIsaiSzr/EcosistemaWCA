import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mail,
  Phone,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  ChevronDown,
  Link2,
} from "lucide-react";
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
  /** @deprecated Ya no se muestra en el header */
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

type EdgeSegment = {
  key: string;
  d: string;
  color: string;
};

type AnchorPos = { id: number; x: number; y: number };

/** Líderes (Director / Subdirectora / Directores de área): tarjeta vertical. */
const LEADER_W = 268;
/** Extremos con nombre de dirección largo (Academia / Desarrollo Tecnológico). */
const LEADER_W_WIDE = 312;
const LEADER_H = 198;
/** Integrantes: tarjeta horizontal más compacta. */
const MEMBER_W = 292;
const MEMBER_H = 108;
const GAP_X = 40;
const GAP_Y = 88;
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.8;

const WIDE_DIRECTION_KEYS = new Set<OrgDirectionKey>([
  "academia-innovacion",
  "desarrollo-tecnologico",
]);

function isLeader(person: OrgPerson) {
  return person.roleKind === "director" || person.roleKind === "subdirector";
}

function cardSize(person: OrgPerson) {
  if (isLeader(person)) {
    const wide = WIDE_DIRECTION_KEYS.has(person.directionKey as OrgDirectionKey);
    return { w: wide ? LEADER_W_WIDE : LEADER_W, h: LEADER_H };
  }
  return { w: MEMBER_W, h: MEMBER_H };
}

/** Ancho del subárbol (para empujar hermanos al expandir). */
function measureWidth(
  person: OrgPerson,
  byParent: Map<number | null, OrgPerson[]>,
  expanded: Set<number>,
): number {
  const { w } = cardSize(person);
  const kids = byParent.get(person.id) ?? [];
  if (!expanded.has(person.id) || kids.length === 0) return w;
  const kidsW =
    kids.reduce((sum, c) => sum + measureWidth(c, byParent, expanded), 0) +
    GAP_X * Math.max(0, kids.length - 1);
  return Math.max(w, kidsW);
}

/**
 * Layout top-down: cada nodo se coloca en un centerX fijo del padre.
 * Los hijos se centran bajo ese centerX y crecen a los lados.
 */
function layoutTree(
  person: OrgPerson,
  byParent: Map<number | null, OrgPerson[]>,
  expanded: Set<number>,
  centerX: number,
  y: number,
): LayoutNode {
  const kids = byParent.get(person.id) ?? [];
  const isExpanded = expanded.has(person.id);
  const { w, h } = cardSize(person);
  const x = centerX - w / 2;

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
  const widths = kids.map((c) => measureWidth(c, byParent, expanded));
  const total =
    widths.reduce((a, b) => a + b, 0) + GAP_X * Math.max(0, kids.length - 1);
  let walk = centerX - total / 2;
  const children: LayoutNode[] = [];

  for (let i = 0; i < kids.length; i++) {
    const cw = widths[i]!;
    const childCenter = walk + cw / 2;
    children.push(layoutTree(kids[i]!, byParent, expanded, childCenter, childY));
    walk += cw + GAP_X;
  }

  return {
    person,
    x,
    y,
    width: w,
    height: h,
    children,
    hasChildren: true,
    expanded: true,
  };
}

function shiftTree(node: LayoutNode, dx: number, dy: number) {
  node.x += dx;
  node.y += dy;
  for (const c of node.children) shiftTree(c, dx, dy);
}

function collectNodes(node: LayoutNode, out: LayoutNode[] = []): LayoutNode[] {
  out.push(node);
  for (const c of node.children) collectNodes(c, out);
  return out;
}

/**
 * Colores:
 * - Bajada + bus: color del padre
 * - Stub al hijo: color del hijo
 * - Un solo hijo: línea completa en color del padre
 */
function collectEdgeSegments(node: LayoutNode, segments: EdgeSegment[] = []): EdgeSegment[] {
  if (!node.expanded || node.children.length === 0) return segments;

  const parentColor = orgColor(node.person.directionKey as OrgDirectionKey);
  const x1 = node.x + node.width / 2;
  const y1 = node.y + node.height;
  const midY = (y1 + node.children[0]!.y) / 2;

  if (node.children.length === 1) {
    const child = node.children[0]!;
    const x2 = child.x + child.width / 2;
    const y2 = child.y;
    // Misma X → línea recta; si no, ortogonal corta
    const d =
      Math.abs(x1 - x2) < 0.5
        ? `M ${x1} ${y1} V ${y2}`
        : `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
    segments.push({
      key: `link-${node.person.id}-${child.person.id}`,
      d,
      color: parentColor,
    });
    collectEdgeSegments(child, segments);
    return segments;
  }

  const childCenters = node.children.map((c) => c.x + c.width / 2);
  const minX = Math.min(x1, ...childCenters);
  const maxX = Math.max(x1, ...childCenters);

  segments.push({
    key: `drop-${node.person.id}`,
    d: `M ${x1} ${y1} V ${midY}`,
    color: parentColor,
  });
  segments.push({
    key: `bus-${node.person.id}`,
    d: `M ${minX} ${midY} H ${maxX}`,
    color: parentColor,
  });

  for (const child of node.children) {
    const x2 = child.x + child.width / 2;
    const y2 = child.y;
    const childColor = orgColor(child.person.directionKey as OrgDirectionKey);
    segments.push({
      key: `stub-${node.person.id}-${child.person.id}`,
      d: `M ${x2} ${midY} V ${y2}`,
      color: childColor,
    });
    collectEdgeSegments(child, segments);
  }

  return segments;
}

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/** Cache en memoria de fotos del organigrama (el navegador también las guarda). */
const photoWarmCache = new Set<string>();

function warmPhotoCache(urls: Array<string | null | undefined>) {
  for (const raw of urls) {
    const url = (raw || "").trim();
    if (!url || photoWarmCache.has(url)) continue;
    photoWarmCache.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

function touchDistance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

const CARD_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

const EDGE_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 0.72 },
  exit: { opacity: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

function PersonCard({
  node,
  onToggle,
}: {
  node: LayoutNode;
  onToggle: (id: number) => void;
}) {
  const p = node.person;
  const color = orgColor(p.directionKey as OrgDirectionKey);
  const leader = isLeader(p);
  const directionLabel = ORG_DIRECTION_LABELS[p.directionKey as OrgDirectionKey];

  return (
    <motion.button
      type="button"
      layout={false}
      initial={CARD_MOTION.initial}
      animate={CARD_MOTION.animate}
      exit={CARD_MOTION.exit}
      transition={CARD_MOTION.transition}
      onClick={(e) => {
        if (node.hasChildren) onToggle(p.id);
        (e.currentTarget as HTMLButtonElement).blur();
      }}
      onMouseDown={(e) => {
        if (e.detail > 1) e.preventDefault();
      }}
      className={cn(
        "absolute flex select-none flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
        "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
        "hover:shadow-[0_14px_36px_rgba(15,23,42,0.11)]",
        "[&_*]:select-none",
        node.hasChildren ? "cursor-pointer" : "cursor-default",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        borderColor: `${color}40`,
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {leader && (
        <div className="h-2 w-full shrink-0" style={{ backgroundColor: color }} />
      )}

      {leader ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-2 text-center">
          <div
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2"
            style={{ ["--tw-ring-color" as string]: `${color}55` }}
          >
            {p.photoUrl ? (
              <img
                src={p.photoUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initialsFromName(p.name)}
              </div>
            )}
          </div>

          <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            {directionLabel}
          </p>
          <p className="mt-0.5 text-[13px] font-bold leading-snug text-slate-900">{p.name}</p>
          <p className="mt-0.5 text-[11px] font-medium leading-snug" style={{ color }}>
            {p.roleTitle}
          </p>

          <div className="mt-1 w-full space-y-0.5 text-[10px] leading-snug text-slate-500">
            {p.email && (
              <p className="flex items-start justify-center gap-1" title={p.email}>
                <Mail className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                <span className="break-all text-left">{p.email}</span>
              </p>
            )}
            {p.phone && (
              <p className="flex items-start justify-center gap-1">
                <Phone className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                <span>{p.phone}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          className="flex h-full items-center gap-3 px-3 py-2"
          style={{ borderLeftWidth: 4, borderLeftColor: color }}
        >
          <div
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2"
            style={{ ["--tw-ring-color" as string]: `${color}55` }}
          >
            {p.photoUrl ? (
              <img
                src={p.photoUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initialsFromName(p.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-5">
            <p className="text-[13px] font-bold leading-snug text-slate-900">{p.name}</p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug" style={{ color }}>
              {p.roleTitle}
            </p>
            {p.email && (
              <p className="mt-0.5 flex items-start gap-1 text-[10px] leading-snug text-slate-500" title={p.email}>
                <Mail className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                <span className="break-all">{p.email}</span>
              </p>
            )}
            {p.phone && (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                <Phone className="h-3 w-3 shrink-0 opacity-70" />
                <span>{p.phone}</span>
              </p>
            )}
            {p.socialLinks?.slice(0, 1).map((s) => (
              <p key={s.id} className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                <Link2 className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">{s.label}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {node.hasChildren && (
        <div
          className={cn(
            "absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white shadow transition-transform duration-200",
            node.expanded && "rotate-180",
          )}
          style={{ backgroundColor: color }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      )}
    </motion.button>
  );
}

export function OrgChartCanvas({ people, title, subtitle }: Props) {
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

  const pendingAnchorRef = useRef<AnchorPos | null>(null);
  const nodePosRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const tree = useMemo(() => {
    if (!root) return null;
    const totalW = measureWidth(root, byParent, expanded);
    const t = layoutTree(root, byParent, expanded, 48 + totalW / 2, 48);

    // Mantener fija la tarjeta que se abrió/cerró; el resto se mueve a los lados.
    const anchor = pendingAnchorRef.current;
    if (anchor) {
      const flat = collectNodes(t);
      const n = flat.find((node) => node.person.id === anchor.id);
      if (n) shiftTree(t, anchor.x - n.x, anchor.y - n.y);
    }
    return t;
  }, [root, byParent, expanded]);

  const nodes = useMemo(() => (tree ? collectNodes(tree) : []), [tree]);
  const edgeSegments = useMemo(() => (tree ? collectEdgeSegments(tree) : []), [tree]);

  useEffect(() => {
    // Limpiar ancla después del commit (Strict Mode puede recalcular el memo 2 veces).
    pendingAnchorRef.current = null;
  }, [tree]);

  useEffect(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const n of nodes) {
      map.set(n.person.id, { x: n.x, y: n.y });
    }
    nodePosRef.current = map;
  }, [nodes]);

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { w: 1000, h: 700 };
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    return {
      w: maxX - Math.min(0, minX) + 96,
      h: maxY - Math.min(0, minY) + 96,
    };
  }, [nodes]);

  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.78);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomDraft, setZoomDraft] = useState("78");
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const activePointers = useRef(new Set<number>());
  const pinch = useRef<{
    startDist: number;
    startScale: number;
    originMidX: number;
    originMidY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  scaleRef.current = scale;
  panRef.current = pan;

  // Precargar fotos en caché al recibir el organigrama
  useEffect(() => {
    warmPhotoCache(people.map((p) => p.photoUrl));
  }, [people]);

  const toggle = useCallback((id: number) => {
    const pos = nodePosRef.current.get(id);
    if (pos) pendingAnchorRef.current = { id, x: pos.x, y: pos.y };
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-org-ui]")) return;
    if ((e.target as HTMLElement).closest("button")) return;
    activePointers.current.add(e.pointerId);
    // Con 2+ dedos no iniciar arrastre (lo maneja el pinch)
    if (activePointers.current.size > 1 || pinch.current) {
      drag.current = null;
      return;
    }
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pinch.current || activePointers.current.size > 1) {
      drag.current = null;
      return;
    }
    if (!drag.current) return;
    window.getSelection()?.removeAllRanges();
    setPan({
      x: drag.current.panX + (e.clientX - drag.current.x),
      y: drag.current.panY + (e.clientY - drag.current.y),
    });
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) drag.current = null;
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.06 : 0.06;
      setScale((s) => clampScale(s + delta));
    };
    const onSelectStart = (ev: Event) => ev.preventDefault();

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        drag.current = null;
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        pinch.current = {
          startDist: Math.max(1, touchDistance(a, b)),
          startScale: scaleRef.current,
          originMidX: (a.clientX + b.clientX) / 2,
          originMidY: (a.clientY + b.clientY) / 2,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault();
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        const p = pinch.current;
        const next = clampScale(p.startScale * (touchDistance(a, b) / p.startDist));
        const cx = (p.originMidX - p.panX) / p.startScale;
        const cy = (p.originMidY - p.panY) / p.startScale;
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        setScale(next);
        setPan({
          x: midX - cx * next,
          y: midY - cy * next,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("selectstart", onSelectStart);
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("selectstart", onSelectStart);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const fsEl = document.fullscreenElement;
      setIsFullscreen(
        !!fsEl && (fsEl === shellRef.current || !!shellRef.current?.contains(fsEl)),
      );
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el || nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const pad = 96;
    const sx = (el.clientWidth - pad) / contentW;
    const sy = (el.clientHeight - pad) / contentH;
    const next = clampScale(Math.min(0.95, Math.min(sx, sy)));
    setScale(next);
    setPan({
      x: (el.clientWidth - contentW * next) / 2 - minX * next,
      y: 28 - minY * next,
    });
  }, [nodes]);

  const didInitialFit = useRef(false);
  useEffect(() => {
    if (didInitialFit.current || nodes.length === 0) return;
    const t = window.setTimeout(() => {
      fit();
      didInitialFit.current = true;
    }, 80);
    return () => window.clearTimeout(t);
  }, [fit, nodes.length]);

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      fit();
    }
  };

  const commitZoomDraft = () => {
    const raw = zoomDraft.replace("%", "").trim();
    const pct = Number(raw);
    if (!Number.isFinite(pct)) {
      setZoomDraft(String(Math.round(scale * 100)));
      setEditingZoom(false);
      return;
    }
    setScale(clampScale(pct / 100));
    setEditingZoom(false);
  };

  const onZoomSubmit = (e: FormEvent) => {
    e.preventDefault();
    commitZoomDraft();
  };

  return (
    <div
      ref={shellRef}
      className="relative flex h-[100dvh] select-none flex-col overflow-hidden bg-[#f4f7fb]"
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="relative z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-2.5 backdrop-blur-md md:gap-4 md:px-5 md:py-3.5">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-lg font-bold tracking-tight text-slate-900 sm:text-xl md:text-2xl lg:text-3xl">
            {title ?? "Organigrama Oficial"}
          </h1>
          <p className="mt-0.5 hidden text-sm text-slate-500 md:block">
            {subtitle ?? "Estructura Organizativa Institucional del Ecosistema WCA"}
          </p>
        </div>
        <div className="hidden shrink-0 items-center self-center md:flex">
          <img
            src="/media/logo-wca-oficial-transparent.png"
            alt="Ecosistema WCA"
            className="h-11 w-auto object-contain sm:h-12 md:h-14"
            draggable={false}
          />
        </div>
      </header>

      <div
        ref={viewportRef}
        className="relative z-10 flex-1 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: bounds.w,
            height: bounds.h,
          }}
        >
          {/* Líneas: solo fade de opacity (sin pathLength) para no parpadear. */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={Math.max(bounds.w, 1)}
            height={Math.max(bounds.h, 1)}
            aria-hidden
          >
            <AnimatePresence initial={false}>
              {edgeSegments.map((seg) => (
                <motion.path
                  key={seg.key}
                  d={seg.d}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={EDGE_MOTION.initial}
                  animate={EDGE_MOTION.animate}
                  exit={EDGE_MOTION.exit}
                  transition={EDGE_MOTION.transition}
                />
              ))}
            </AnimatePresence>
          </svg>

          <AnimatePresence initial={false}>
            {nodes.map((node) => (
              <PersonCard key={node.person.id} node={node} onToggle={toggle} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div
        data-org-ui
        className="absolute bottom-5 right-5 z-30 flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur"
      >
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          onClick={() => setScale((s) => clampScale(s - 0.1))}
          aria-label="Alejar"
        >
          <Minus className="h-4 w-4" />
        </button>

        {editingZoom ? (
          <form onSubmit={onZoomSubmit} className="flex items-center">
            <input
              autoFocus
              inputMode="numeric"
              aria-label="Porcentaje de zoom"
              value={zoomDraft}
              onChange={(e) => setZoomDraft(e.target.value.replace(/[^\d.]/g, ""))}
              onBlur={commitZoomDraft}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setZoomDraft(String(Math.round(scale * 100)));
                  setEditingZoom(false);
                }
              }}
              className="h-8 w-14 rounded-md border border-slate-200 bg-white px-1 text-center text-xs font-semibold text-slate-700 outline-none ring-2 ring-[#4086E7]/30"
            />
            <span className="pr-1 text-xs font-semibold text-slate-500">%</span>
          </form>
        ) : (
          <button
            type="button"
            title="Clic para editar zoom"
            className="min-w-[3.25rem] rounded-md px-1 py-1 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100"
            onClick={() => {
              setZoomDraft(String(Math.round(scale * 100)));
              setEditingZoom(true);
            }}
          >
            {Math.round(scale * 100)}%
          </button>
        )}

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          onClick={() => setScale((s) => clampScale(s + 0.1))}
          aria-label="Acercar"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-5 left-5 z-20 hidden select-none text-xs text-slate-400 md:block">
        Arrastra para mover · scroll para zoom · clic en % para editar · clic en tarjeta para abrir equipo
      </p>
    </div>
  );
}
