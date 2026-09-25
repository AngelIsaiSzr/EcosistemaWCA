import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FORM_CATALOG, type CatalogItem } from "./form-builder-catalog-data";

export function FormBuilderCatalog({ onPick }: { onPick: (item: CatalogItem) => void }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const term = query.trim().toLowerCase();

  const categories = useMemo(() => {
    if (!term) return FORM_CATALOG;
    return FORM_CATALOG.map((category) => ({
      ...category,
      items: category.items.filter((item) => item.label.toLowerCase().includes(term)),
    })).filter((category) => category.items.length > 0);
  }, [term]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b p-3">
        <div>
          <p className="font-heading text-sm font-semibold">Campos de formulario</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Toca un elemento para agregarlo al formulario.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar campo…"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {categories.length === 0 && (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            No hay elementos que coincidan con «{query.trim()}».
          </p>
        )}

        {categories.map((category) => {
          const isCollapsed = !term && collapsed[category.id];
          return (
            <div key={category.id} className="min-w-0">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [category.id]: !prev[category.id] }))
                }
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
              >
                <span className="min-w-0 truncate">{category.title}</span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 shrink-0 transition", isCollapsed && "-rotate-90")}
                />
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-1">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const key = item.kind === "structure" ? `structure-${item.id}` : `field-${item.type}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onPick(item)}
                        className="flex w-full min-w-0 items-center gap-2.5 rounded-xl border bg-card px-2 py-1.5 text-left transition hover:border-[#5b8fd4]/60 hover:bg-muted"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[#5b8fd4]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
