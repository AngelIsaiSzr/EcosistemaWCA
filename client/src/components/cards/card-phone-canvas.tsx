import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { BatteryFull, Minus, MousePointerClick, Plus, Scan, Signal, Smartphone, Wifi } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Medidas en puntos CSS (viewport real de cada equipo). */
type PhoneDevice = {
  id: string;
  label: string;
  width: number;
  height: number;
  bezel: number;
  radius: number;
  camera: "island" | "punch" | "none";
  /** Clases literales para que Tailwind las genere: área segura arriba/abajo. */
  safeArea: string;
  homeIndicator: boolean;
};

const PHONE_DEVICES: PhoneDevice[] = [
  {
    id: "iphone-15-pro",
    label: "iPhone 15 Pro",
    width: 393,
    height: 852,
    bezel: 12,
    radius: 55,
    camera: "island",
    safeArea: "pt-[54px] pb-[34px]",
    homeIndicator: true,
  },
  {
    id: "iphone-15-pro-max",
    label: "iPhone 15 Pro Max",
    width: 430,
    height: 932,
    bezel: 12,
    radius: 55,
    camera: "island",
    safeArea: "pt-[54px] pb-[34px]",
    homeIndicator: true,
  },
  {
    id: "iphone-se",
    label: "iPhone SE",
    width: 375,
    height: 667,
    bezel: 12,
    radius: 28,
    camera: "none",
    safeArea: "pt-[20px]",
    homeIndicator: false,
  },
  {
    id: "pixel-8",
    label: "Android (Pixel 8)",
    width: 412,
    height: 915,
    bezel: 10,
    radius: 40,
    camera: "punch",
    safeArea: "pt-[32px] pb-[16px]",
    homeIndicator: true,
  },
];

const DEFAULT_DEVICE_ID = "iphone-15-pro";
const DEVICE_STORAGE_KEY = "wca.card-editor.device";
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
const FIT_PADDING = 72;

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

function readStoredDevice(): string {
  try {
    const stored = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (stored && PHONE_DEVICES.some((d) => d.id === stored)) return stored;
  } catch {
    /* almacenamiento bloqueado */
  }
  return DEFAULT_DEVICE_ID;
}

function touchDistance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function StatusBar({ device }: { device: PhoneDevice }) {
  const island = device.camera === "island";
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between text-white",
        island ? "h-[54px] px-8 pt-1.5" : device.camera === "punch" ? "h-[32px] px-5" : "h-[20px] px-2",
      )}
    >
      <span className={cn("font-semibold tabular-nums", island ? "text-[16px]" : "text-[12px]")}>9:41</span>
      <span className="flex items-center gap-1">
        <Signal className={island ? "h-4 w-4" : "h-3 w-3"} />
        <Wifi className={island ? "h-4 w-4" : "h-3 w-3"} />
        <BatteryFull className={island ? "h-5 w-5" : "h-3.5 w-3.5"} />
      </span>
      {island ? (
        <span className="absolute left-1/2 top-[11px] h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
      ) : null}
      {device.camera === "punch" ? (
        <span className="absolute left-1/2 top-[9px] h-[14px] w-[14px] -translate-x-1/2 rounded-full bg-black ring-2 ring-black/40" />
      ) : null}
    </div>
  );
}

/**
 * Lienzo con paneo y zoom (misma mecánica que el organigrama) que muestra
 * la tarjeta dentro de un teléfono a tamaño real.
 * - Arrastrar fuera de la pantalla del teléfono: mover.
 * - Rueda fuera de la pantalla (o Ctrl + rueda en cualquier lado): zoom.
 * - Rueda dentro de la pantalla: scroll de la tarjeta, como en un celular.
 */
export function CardPhoneCanvas({
  children,
  className,
}: {
  /** Contenido de la pantalla; recibe las clases del área segura del equipo. */
  children: (safeAreaClassName: string) => ReactNode;
  className?: string;
}) {
  const [deviceId, setDeviceId] = useState(readStoredDevice);
  const device = PHONE_DEVICES.find((d) => d.id === deviceId) ?? PHONE_DEVICES[0];
  const frameW = device.width + device.bezel * 2;
  const frameH = device.height + device.bezel * 2;

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomDraft, setZoomDraft] = useState("70");
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinch = useRef<{ startDist: number; startScale: number; cx: number; cy: number } | null>(null);
  /** Si la persona ya movió/acercó, no re-ajustar al cambiar el tamaño del contenedor. */
  const userMoved = useRef(false);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  scaleRef.current = scale;
  panRef.current = pan;

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
    const next = clampScale(
      Math.min(1, (el.clientWidth - FIT_PADDING) / frameW, (el.clientHeight - FIT_PADDING) / frameH),
    );
    setScale(next);
    setPan({
      x: (el.clientWidth - frameW * next) / 2,
      y: (el.clientHeight - frameH * next) / 2,
    });
    userMoved.current = false;
  }, [frameW, frameH]);

  /** Zoom manteniendo fijo el punto (px, py) del viewport. */
  const zoomAt = useCallback((next: number, px?: number, py?: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const s = scaleRef.current;
    const target = clampScale(next);
    const ox = px ?? el.clientWidth / 2;
    const oy = py ?? el.clientHeight / 2;
    const p = panRef.current;
    setScale(target);
    setPan({
      x: ox - ((ox - p.x) / s) * target,
      y: oy - ((oy - p.y) / s) * target,
    });
    userMoved.current = true;
  }, []);

  useEffect(() => {
    fit();
  }, [fit]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (!userMoved.current) fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const inScreen = (e.target as HTMLElement).closest("[data-phone-screen]");
      if (inScreen && !e.ctrlKey) return; // scroll natural de la tarjeta
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      zoomAt(scaleRef.current * factor, e.clientX - rect.left, e.clientY - rect.top);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      drag.current = null;
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      const rect = el.getBoundingClientRect();
      pinch.current = {
        startDist: Math.max(1, touchDistance(a, b)),
        startScale: scaleRef.current,
        cx: (a.clientX + b.clientX) / 2 - rect.left,
        cy: (a.clientY + b.clientY) / 2 - rect.top,
      };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinch.current) return;
      e.preventDefault();
      const p = pinch.current;
      zoomAt(p.startScale * (touchDistance(e.touches[0]!, e.touches[1]!) / p.startDist), p.cx, p.cy);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [zoomAt]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-canvas-ui]") || target.closest("[data-phone-screen]")) return;
    if (pinch.current) return;
    e.preventDefault();
    drag.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || pinch.current) return;
    setPan({
      x: drag.current.panX + (e.clientX - drag.current.x),
      y: drag.current.panY + (e.clientY - drag.current.y),
    });
    userMoved.current = true;
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const changeDevice = (id: string) => {
    setDeviceId(id);
    try {
      window.localStorage.setItem(DEVICE_STORAGE_KEY, id);
    } catch {
      /* almacenamiento bloqueado */
    }
  };

  const commitZoomDraft = () => {
    const pct = Number(zoomDraft.replace("%", "").trim());
    if (Number.isFinite(pct) && pct > 0) zoomAt(pct / 100);
    setEditingZoom(false);
  };

  const controlButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground";

  return (
    <section
      className={cn("relative min-h-0 min-w-0 flex-1 select-none overflow-hidden bg-muted/20", className)}
      style={{
        backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <div
        ref={viewportRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          {/* Equipo a tamaño real */}
          <div
            className="relative bg-[#05070c] shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
            style={{ width: frameW, height: frameH, borderRadius: device.radius + device.bezel, padding: device.bezel }}
          >
            {/* Botones laterales */}
            <span className="absolute -left-[3px] top-[150px] h-[60px] w-[3px] rounded-l bg-[#1a1d24]" />
            <span className="absolute -left-[3px] top-[225px] h-[60px] w-[3px] rounded-l bg-[#1a1d24]" />
            <span className="absolute -right-[3px] top-[190px] h-[90px] w-[3px] rounded-r bg-[#1a1d24]" />

            <div
              data-phone-screen
              className="relative h-full w-full cursor-auto overflow-hidden bg-black touch-pan-y"
              style={{ borderRadius: device.radius }}
            >
              <StatusBar device={device} />
              <div className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {children(device.safeArea)}
              </div>
              {device.homeIndicator ? (
                <span className="pointer-events-none absolute bottom-2 left-1/2 z-20 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-white/80" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Barra superior: equipo + ayuda */}
      <div data-canvas-ui className="absolute left-4 right-4 top-4 z-30 flex flex-wrap items-center justify-between gap-2">
        <Select value={device.id} onValueChange={changeDevice}>
          <SelectTrigger className="h-9 w-auto gap-2 rounded-full bg-background/95 pl-3 pr-3 text-sm shadow-sm backdrop-blur">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHONE_DEVICES.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label} · {d.width}×{d.height}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="hidden items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur xl:flex">
          <MousePointerClick className="h-3.5 w-3.5" />
          Clic en la tarjeta para editar · arrastra el fondo para mover · rueda para zoom
        </p>
      </div>

      {/* Controles de zoom */}
      <div
        data-canvas-ui
        className="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-full border bg-background/95 p-1 shadow-lg backdrop-blur"
      >
        <button type="button" className={controlButton} onClick={() => zoomAt(scale - 0.1)} aria-label="Alejar">
          <Minus className="h-4 w-4" />
        </button>
        {editingZoom ? (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              commitZoomDraft();
            }}
            className="flex items-center"
          >
            <input
              autoFocus
              inputMode="numeric"
              aria-label="Porcentaje de zoom"
              value={zoomDraft}
              onChange={(e) => setZoomDraft(e.target.value.replace(/[^\d.]/g, ""))}
              onBlur={commitZoomDraft}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingZoom(false);
              }}
              className="h-8 w-14 rounded-md border bg-background px-1 text-center text-xs font-semibold outline-none ring-2 ring-[#5b8fd4]/30"
            />
            <span className="pr-1 text-xs font-semibold text-muted-foreground">%</span>
          </form>
        ) : (
          <button
            type="button"
            title="Clic para editar zoom"
            className="min-w-[3.25rem] rounded-md px-1 py-1 text-center text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              setZoomDraft(String(Math.round(scale * 100)));
              setEditingZoom(true);
            }}
          >
            {Math.round(scale * 100)}%
          </button>
        )}
        <button type="button" className={controlButton} onClick={() => zoomAt(scale + 0.1)} aria-label="Acercar">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" className={controlButton} onClick={fit} aria-label="Ajustar a la vista" title="Ajustar a la vista">
          <Scan className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
