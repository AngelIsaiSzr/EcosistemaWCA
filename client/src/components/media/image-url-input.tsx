import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Search, Check, Upload } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

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
  subida: "Subidas",
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.url.toLowerCase().includes(needle) ||
        (SOURCE_LABEL[item.source] || item.source).toLowerCase().includes(needle),
    );
  }, [data?.items, q]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/media/library/upload", {
        method: "POST",
        body,
        credentials: "include",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "No se pudo subir la imagen");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/media/library"] });
      onChange(String(payload.url));
      setOpen(false);
      setQ("");
      toast({ title: "Imagen subida" });
    } catch (error) {
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0 space-y-1.5">
                <DialogTitle>Biblioteca de imágenes</DialogTitle>
                <DialogDescription>
                  Elige una imagen ya usada en la plataforma (Equipo, media, tarjetas, organigrama…).
                </DialogDescription>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Subiendo…" : "Subir"}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
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
