import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Textarea que empieza en una fila (alto de un Input) y crece con el contenido. */
export const AutoTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & { maxHeight?: number }
>(({ className, value, maxHeight = 240, onChange, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight + 2, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight + 2 > maxHeight ? "auto" : "hidden";
  }, [maxHeight]);

  React.useLayoutEffect(resize, [value, resize]);

  return (
    <Textarea
      ref={(node) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      rows={1}
      value={value}
      onChange={(event) => {
        onChange?.(event);
        resize();
      }}
      className={cn("min-h-10 resize-none leading-6", className)}
      {...props}
    />
  );
});
AutoTextarea.displayName = "AutoTextarea";
