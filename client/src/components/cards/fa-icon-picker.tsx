import { useState } from "react";
import { Check, Smile } from "lucide-react";
import { CARD_FA_ICONS } from "@shared/card-directions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function FaIconPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (icon: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2">
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
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
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
      </PopoverContent>
    </Popover>
  );
}
