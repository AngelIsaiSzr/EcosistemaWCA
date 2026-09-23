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

/** Líderes (Director / Subdirectora / Directores de área): tarjeta vertical. */
const LEADER_W = 268;
const LEADER_H = 248;
/** Integrantes: tarjeta horizontal más compacta. */
const MEMBER_W = 292;
const MEMBER_H = 112;
const GAP_X = 40;
const GAP_Y = 92;
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.8;

function isLeader(person: OrgPerson) {
  return person.roleKind === "director" || person.roleKind === "subdirector";
}

function cardSize(person: OrgPerson) {
  if (isLeader(person)) return { w: LEADER_W, h: LEADER_H };
  return { w: MEMBER_W, h: MEMBER_H };
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

  // Centrar al padre sobre el centro visual de las tarjetas hijas (no del ancho del subárbol).
  // Así Director y Subdirección quedan en línea vertical recta.
  const first = centered[0]!;
  const last = centered[centered.length - 1]!;
  const mid =
    (first.x + first.width / 2 + last.x + last.width / 2) / 2;
  const parentX = mid - w / 2;

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

/**
 * Colores de conexión:
 * - Bajada + bus horizontal: color del padre
 * - Stub vertical al hijo: color del hijo
 * - Un solo hijo: toda la línea en color del padre
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
    segments.push({
      key: `link-${node.person.id}-${child.person.id}`,
      d: `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`,
      color: parentColor,
    });
    collectEdgeSegments(child, segments);
    return segments;
  }

  const childCenters = node.children.map((c) => c.x + c.width / 2);
  const minX = Math.min(...childCenters);
  const maxX = Math.max(...childCenters);

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
      // Sin `layout`: evita que las tarjetas se animen solas mientras las líneas saltan.
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -8 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => {
        if (node.hasChildren) onToggle(p.id);
        // Quita el “seleccionado” residual del navegador al abrir/cerrar
        (e.currentTarget as HTMLButtonElement).blur();
      }}
      onMouseDown={(e) => {
        if (e.detail > 1) e.preventDefault();
      }}
      className={cn(
        "absolute flex select-none flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
        "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
        "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]",
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
        <div className="h-2.5 w-full shrink-0" style={{ backgroundColor: color }} />
      )}

      {leader ? (
        <div className="flex min-h-0 flex-1 flex-col items-center px-3.5 pb-3 pt-3 text-center">
          <div
            className="relative h-[3.75rem] w-[3.75rem] shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2"
            style={{ ["--tw-ring-color" as string]: `${color}55` }}
          >
            {p.photoUrl ? (
              <img src={p.photoUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initialsFromName(p.name)}
              </div>
            )}
          </div>

          <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {directionLabel}
          </p>
          <p className="mt-1 text-[14px] font-bold leading-snug text-slate-900">{p.name}</p>
          <p className="mt-1 text-[12px] font-medium leading-snug" style={{ color }}>
            {p.roleTitle}
          </p>

          <div className="mt-2 w-full space-y-0.5 text-[11px] leading-snug text-slate-500">
            {p.email && (
              <p className="flex items-start justify-center gap-1.5" title={p.email}>
                <Mail className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                <span className="break-all text-left">{p.email}</span>
              </p>
            )}
            {p.phone && (
              <p className="flex items-start justify-center gap-1.5">
                <Phone className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                <span>{p.phone}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          className="flex h-full items-center gap-3 px-3.5 py-2.5"
          style={{ borderLeftWidth: 4, borderLeftColor: color }}
        >
          <div
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2"
            style={{ ["--tw-ring-color" as string]: `${color}55` }}
          >
            {p.photoUrl ? (
              <img src={p.photoUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initialsFromName(p.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <p className="text-[13px] font-bold leading-snug text-slate-900">{p.name}</p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug" style={{ color }}>
              {p.roleTitle}
            </p>
            {p.email && (
              <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-slate-500" title={p.email}>
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
        <motion.div
          className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow"
          style={{ backgroundColor: color }}
          animate={{ rotate: node.expanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
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

  const tree = useMemo(() => {
    if (!root) return null;
    return layoutTree(root, byParent, expanded, 48, 48);
  }, [root, byParent, expanded]);

  const nodes = useMemo(() => (tree ? collectNodes(tree) : []), [tree]);
  const edgeSegments = useMemo(() => (tree ? collectEdgeSegments(tree) : []), [tree]);

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { w: 1000, h: 700 };
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    return { w: maxX + 96, h: maxY + 96 };
  }, [nodes]);

  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.78);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomDraft, setZoomDraft] = useState("78");
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const toggle = useCallback((id: number) => {
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
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    window.getSelection()?.removeAllRanges();
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
      setScale((s) => clampScale(s + delta));
    };
    const onSelectStart = (ev: Event) => ev.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("selectstart", onSelectStart);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("selectstart", onSelectStart);
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
    if (!el) return;
    const pad = 96;
    const sx = (el.clientWidth - pad) / bounds.w;
    const sy = (el.clientHeight - pad) / bounds.h;
    const next = clampScale(Math.min(0.95, Math.min(sx, sy)));
    setScale(next);
    setPan({
      x: (el.clientWidth - bounds.w * next) / 2,
      y: 28,
    });
  }, [bounds.w, bounds.h]);

  useEffect(() => {
    const t = window.setTimeout(fit, 60);
    return () => window.clearTimeout(t);
  }, [fit]);

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

      <header className="relative z-20 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/85 px-5 py-3.5 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {title ?? "Organigrama Oficial"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {subtitle ?? "Estructura Organizativa Institucional del Ecosistema WCA"}
          </p>
        </div>
        <div className="flex shrink-0 items-center self-center">
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
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={bounds.w}
            height={bounds.h}
            aria-hidden
          >
            <AnimatePresence>
              {edgeSegments.map((seg) => (
                <motion.path
                  key={seg.key}
                  d={seg.d}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.72 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
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

      <p className="pointer-events-none absolute bottom-5 left-5 z-20 select-none text-xs text-slate-400">
        Arrastra para mover · scroll para zoom · clic en % para editar · clic en tarjeta para abrir equipo
      </p>
    </div>
  );
}
