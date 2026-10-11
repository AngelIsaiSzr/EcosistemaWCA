import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock, PauseCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarEmailStatus = "sent" | "today" | "scheduled" | "missed" | "paused";

export type CalendarEmail = {
  id: number;
  date: string;
  label: string;
  emoji: string;
  chipClass: string;
  status: CalendarEmailStatus;
  hour: number;
};

export type CalendarRange = {
  id: number;
  name: string;
  start: string;
  end: string;
  softClass: string;
  dotClass: string;
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const STATUS_META: Record<CalendarEmailStatus, { label: string; icon: typeof Check; className: string }> = {
  sent: { label: "Enviado", icon: Check, className: "text-emerald-500" },
  today: { label: "Hoy", icon: Clock, className: "text-[#5b8fd4]" },
  scheduled: { label: "Programado", icon: Clock, className: "text-muted-foreground" },
  missed: { label: "No se envió", icon: AlertTriangle, className: "text-amber-500" },
  paused: { label: "Pausado", icon: PauseCircle, className: "text-muted-foreground/70" },
};

function shortLabel(label: string) {
  return label
    .replace(/Periodo\s*(\d)\s*·\s*Semana\s*(\d)/i, "P$1 · S$2")
    .replace(/Semana Tec\s*/i, "Tec ")
    .replace(/Cierre de semestre/i, "Cierre");
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const days: { iso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ iso: iso(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === month });
  }
  const lastRowUsed = days.slice(35).some((d) => d.inMonth);
  return lastRowUsed ? days : days.slice(0, 35);
}

export function EmailCalendar({
  year,
  month,
  onMonthChange,
  today,
  emails,
  ranges,
  selectedId,
  onDayClick,
  onEmailClick,
}: {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  today: string;
  emails: CalendarEmail[];
  ranges: CalendarRange[];
  selectedId?: number | null;
  onDayClick: (date: string) => void;
  onEmailClick: (id: number) => void;
}) {
  const [direction, setDirection] = useState(1);
  const days = useMemo(() => buildGrid(year, month), [year, month]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEmail[]>();
    for (const email of emails) {
      const list = map.get(email.date) ?? [];
      list.push(email);
      map.set(email.date, list);
    }
    return map;
  }, [emails]);

  const go = (delta: number) => {
    setDirection(delta);
    const d = new Date(year, month + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  const goToday = () => {
    const [y, m] = today.split("-").map(Number);
    setDirection(y * 12 + m - 1 >= year * 12 + month ? 1 : -1);
    onMonthChange(y, m - 1);
  };

  const rawTitle = new Date(year, month, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const monthTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
  const monthRanges = ranges.filter((r) => r.start <= days[days.length - 1].iso && r.end >= days[0].iso);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <h2 className="min-w-[10rem] font-heading text-lg font-semibold">{monthTitle}</h2>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => go(-1)} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={goToday}>
            Hoy
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => go(1)} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {monthRanges.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", r.dotClass)} />
              {r.name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={`${year}-${month}`}
          custom={direction}
          initial={{ opacity: 0, x: direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -28 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid grid-cols-7"
        >
          {days.map((day, i) => {
            const items = byDay.get(day.iso) ?? [];
            const range = ranges.find((r) => day.iso >= r.start && day.iso <= r.end);
            const isToday = day.iso === today;
            const isPast = day.iso < today;
            const shown = items.slice(0, 3);
            return (
              <div
                key={day.iso}
                role="button"
                tabIndex={0}
                onClick={() => onDayClick(day.iso)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDayClick(day.iso);
                  }
                }}
                className={cn(
                  "group/day relative min-h-[6.5rem] cursor-pointer border-b border-r p-1.5 text-left outline-none transition-colors",
                  "hover:bg-[#5b8fd4]/[0.05] focus-visible:bg-[#5b8fd4]/[0.08]",
                  i % 7 === 6 && "border-r-0",
                  range?.softClass,
                  !day.inMonth && "bg-muted/20",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs tabular-nums",
                      isToday
                        ? "bg-[#5b8fd4] font-semibold text-white shadow-md shadow-[#5b8fd4]/30"
                        : day.inMonth
                          ? isPast
                            ? "text-muted-foreground"
                            : "text-foreground"
                          : "text-muted-foreground/40",
                    )}
                  >
                    {day.day}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md text-[#5b8fd4] opacity-0 transition group-hover/day:opacity-100 group-focus-visible/day:opacity-100">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="space-y-1">
                  {shown.map((email) => {
                    const meta = STATUS_META[email.status];
                    return (
                      <motion.button
                        key={email.id}
                        type="button"
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEmailClick(email.id);
                        }}
                        title={`${email.label} · ${meta.label} · ${String(email.hour).padStart(2, "0")}:00`}
                        className={cn(
                          "flex w-full items-center gap-1 rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-colors",
                          email.chipClass,
                          email.status === "paused" && "opacity-55",
                          selectedId === email.id && "ring-2 ring-[#5b8fd4] ring-offset-1 ring-offset-background",
                        )}
                      >
                        <span className="shrink-0">{email.emoji}</span>
                        <span className="min-w-0 flex-1 truncate">{shortLabel(email.label)}</span>
                        <meta.icon className={cn("h-3 w-3 shrink-0", meta.className)} />
                      </motion.button>
                    );
                  })}
                  {items.length > shown.length && (
                    <p className="px-1 text-[10px] text-muted-foreground">+{items.length - shown.length} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
