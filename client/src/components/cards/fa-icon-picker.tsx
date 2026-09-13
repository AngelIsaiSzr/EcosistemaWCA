import { useEffect, useRef, useState } from "react";
import { Check, Smile } from "lucide-react";
import { CARD_FA_ICONS } from "@shared/card-directions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FaIconPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (icon: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        {value ? (
          <>
            <i className={cn(value, "w-4 text-center")} />
            <span className="truncate text-sm">
              {CARD_FA_ICONS.find((i) => i.className === value)?.label || "Icono"}
            </span>
          </>
        ) : (
          <>
            <Smile className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Elegir icono</span>
          </>
        )}
      </Button>

      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.5rem)] z-[200] w-80 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Iconos</p>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                Quitar
              </Button>
            ) : null}
          </div>
          <div className="grid max-h-64 grid-cols-6 gap-1.5 overflow-y-auto pr-1">
            {CARD_FA_ICONS.map((icon) => {
              const selected = value === icon.className;
              return (
                <button
                  key={icon.className}
                  type="button"
                  title={icon.label}
                  onClick={() => {
                    onChange(icon.className);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex h-10 w-full items-center justify-center rounded-lg border text-base transition hover:bg-accent",
                    selected && "border-[#5b8fd4] bg-[#5b8fd4]/15 text-[#5b8fd4]",
                  )}
                >
                  <i className={icon.className} />
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#5b8fd4] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
