import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MoreHorizontal, Search, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 1024px)";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

const GLASS =
  "border border-border/70 bg-white/85 shadow-2xl shadow-black/10 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-black/60";

const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

type AdminEditPanelProps = {
  open: boolean;
  onClose: () => void;
  /** `side`: panel flotante a la derecha (la lista sigue visible). `modal`: ventana compacta centrada. */
  variant?: "side" | "modal";
  /** Ancho en escritorio (clase de Tailwind). */
  widthClass?: string;
  children: ReactNode;
};

export function AdminEditPanel({
  open,
  onClose,
  variant = "side",
  widthClass = "lg:w-[30rem]",
  children,
}: AdminEditPanelProps) {
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const isSheet = !isDesktop;
  const showBackdrop = variant === "modal" || isSheet;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector("[role='dialog'][data-state='open'], [role='menu'], [role='listbox']")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !showBackdrop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, showBackdrop]);

  if (!mounted) return null;

  const motionProps = isSheet
    ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }
    : variant === "modal"
      ? {
          initial: { opacity: 0, scale: 0.95, y: 12 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.97, y: 8 },
        }
      : {
          initial: { opacity: 0, x: 48, scale: 0.98 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: 48, scale: 0.98 },
        };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {showBackdrop && (
            <motion.div
              key="admin-panel-backdrop"
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
          )}
          <div
            className={cn(
              "pointer-events-none fixed z-40",
              isSheet
                ? "inset-x-0 bottom-0 flex justify-center"
                : variant === "modal"
                  ? "inset-0 flex items-center justify-center p-6"
                  : "bottom-4 right-4 top-[5.5rem]",
            )}
          >
            <motion.aside
              key="admin-panel"
              role="dialog"
              aria-modal={showBackdrop}
              {...motionProps}
              transition={SPRING}
              className={cn(
                "pointer-events-auto flex flex-col overflow-hidden",
                GLASS,
                isSheet
                  ? "max-h-[90dvh] w-full rounded-t-3xl"
                  : variant === "modal"
                    ? cn("max-h-[calc(100dvh-3rem)] w-full rounded-3xl", widthClass)
                    : cn("h-full rounded-3xl", widthClass),
              )}
            >
              {isSheet && (
                <div className="flex justify-center pb-1 pt-2.5">
                  <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
                </div>
              )}
              {children}
            </motion.aside>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export type PanelAction = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function AdminPanelHeader({
  media,
  title,
  subtitle,
  actions,
  onClose,
  className,
}: {
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: PanelAction[];
  onClose: () => void;
  className?: string;
}) {
  const regular = actions?.filter((a) => !a.destructive) ?? [];
  const destructive = actions?.filter((a) => a.destructive) ?? [];
  return (
    <div className={cn("flex items-center gap-3 px-5 pb-3 pt-4", className)}>
      {media}
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-heading text-base font-semibold leading-tight">{title}</h2>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions && actions.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="Más opciones">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {regular.map((action) => (
              <DropdownMenuItem key={action.label} disabled={action.disabled} onSelect={action.onClick}>
                {action.icon ? <action.icon className="mr-2 h-4 w-4" /> : null}
                {action.label}
              </DropdownMenuItem>
            ))}
            {regular.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
            {destructive.map((action) => (
              <DropdownMenuItem
                key={action.label}
                disabled={action.disabled}
                onSelect={action.onClick}
                className="text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-400 dark:focus:text-red-300"
              >
                {action.icon ? <action.icon className="mr-2 h-4 w-4" /> : null}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose} aria-label="Cerrar">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AdminPanelTabs<T extends string>({
  tabs,
  value,
  onChange,
  layoutId,
}: {
  tabs: { id: T; label: string; disabled?: boolean; hasError?: boolean }[];
  value: T;
  onChange: (id: T) => void;
  layoutId: string;
}) {
  return (
    <div className="px-5 pb-3">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1 text-sm">
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                tab.disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-lg bg-background shadow-sm dark:bg-white/10"
                  transition={{ type: "spring", stiffness: 450, damping: 36 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {tab.label}
                {tab.hasError && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminPanelBody({
  children,
  className,
  contentKey,
}: {
  children: ReactNode;
  className?: string;
  /** Cambia para animar el contenido (p. ej. al cambiar de pestaña o de elemento). */
  contentKey?: string | number;
}) {
  return (
    <div className="wca-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={contentKey ?? "body"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn("space-y-5 px-5 pb-6 pt-1", className)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function AdminPanelSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-2 border-t border-dashed border-border/70 pt-4 first:border-t-0 first:pt-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminPanelFooter({
  onCancel,
  submitLabel,
  pending,
  formId,
  onSubmit,
  extra,
  disabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  pending?: boolean;
  disabled?: boolean;
  /** Si se indica, el botón envía ese formulario (aunque esté fuera del <form>). */
  formId?: string;
  onSubmit?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border/70 px-5 py-4 dark:border-white/10">
      {extra}
      <Button type="button" variant="outline" className="h-10 flex-1 rounded-xl" onClick={onCancel}>
        Cancelar
      </Button>
      <Button
        type={formId ? "submit" : "button"}
        form={formId}
        onClick={onSubmit}
        disabled={pending || disabled}
        className="h-10 flex-1 rounded-xl bg-[#5b8fd4] text-white shadow-lg shadow-[#5b8fd4]/25 transition hover:bg-[#4a7fc4] active:scale-[0.98]"
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

export function AdminTile({
  index = 0,
  selected,
  onClick,
  className,
  children,
}: {
  index?: number;
  selected?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, delay: Math.min(index, 12) * 0.035, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative cursor-pointer rounded-2xl border bg-card text-left outline-none transition-[box-shadow,border-color,background-color] duration-200",
        "hover:border-[#5b8fd4]/50 hover:shadow-lg hover:shadow-[#5b8fd4]/10 focus-visible:ring-2 focus-visible:ring-[#5b8fd4]",
        selected
          ? "border-[#5b8fd4] bg-[#5b8fd4]/[0.06] shadow-lg shadow-[#5b8fd4]/15 ring-1 ring-[#5b8fd4]"
          : "border-border",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl pl-9"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed py-14 text-center text-sm text-muted-foreground"
    >
      {children}
    </motion.div>
  );
}

export function matchesSearch(query: string, ...values: (string | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => v?.toLowerCase().includes(q));
}
