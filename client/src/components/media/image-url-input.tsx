import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LibraryItem = {
  url: string;
  label: string;
  source: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

const SOURCE_LABEL: Record<string, string> = {
  media: "Archivos",
  equipo: "Equipo",
  tarjeta: "Tarjetas",
  testimonio: "Testimonios",
  aliado: "Aliados",
  organigrama: "Organigrama",
};

export function ImageUrlInput({
  value,
  onChange,
  placeholder = "https://… o /media/…",
  id,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery<{ items: LibraryItem[] }>({
    queryKey: ["/api/media/library"],
    queryFn: async () => {
      const res = await fetch("/api/media/library", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la biblioteca");
      return res.json();
    },
    enabled: open,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(needle) ||
        i.url.toLowerCase().includes(needle) ||
        (SOURCE_LABEL[i.source] || i.source).toLowerCase().includes(needle),
    );
  }, [data?.items, q]);

  return (
    <>
      <div className={cn("flex gap-2", className)}>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          title="Biblioteca de imágenes"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4 text-left">
            <DialogTitle>Biblioteca de imágenes</DialogTitle>
            <DialogDescription>
              Elige una imagen ya usada en la plataforma (Equipo, media, tarjetas, organigrama…).
            </DialogDescription>
          </DialogHeader>

          <div className="border-b px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, ruta o fuente…"
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No hay imágenes que coincidan.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filtered.map((item) => {
                  const selected = value === item.url;
                  return (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => {
                        onChange(item.url);
                        setOpen(false);
                        setQ("");
                      }}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border bg-card text-left transition hover:border-[#5b8fd4]/50 hover:shadow-sm",
                        selected && "border-[#5b8fd4] ring-2 ring-[#5b8fd4]/30",
                      )}
                    >
                      <div className="aspect-square bg-muted">
                        <img
                          src={item.url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
                          }}
                        />
                      </div>
                      <div className="space-y-0.5 p-2">
                        <p className="truncate text-xs font-medium">{item.label}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {SOURCE_LABEL[item.source] || item.source}
                        </p>
                      </div>
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#5b8fd4] text-white shadow">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
