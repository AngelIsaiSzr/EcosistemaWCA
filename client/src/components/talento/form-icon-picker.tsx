import { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Code,
  Coffee,
  FileText,
  Flag,
  Gift,
  Globe2,
  GraduationCap,
  Handshake,
  Heart,
  HeartHandshake,
  Image,
  Laptop,
  Leaf,
  Lightbulb,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Mic,
  Music,
  Palette,
  PartyPopper,
  Puzzle,
  Rocket,
  ShieldCheck,
  Smartphone,
  Smile,
  Sparkles,
  Star,
  Sun,
  Target,
  ThumbsUp,
  Ticket,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type IconOption = { id: string; label: string; Icon: LucideIcon };

export const FORM_ICON_OPTIONS: IconOption[] = [
  { id: "globe", label: "Mundo", Icon: Globe2 },
  { id: "file-text", label: "Documento", Icon: FileText },
  { id: "clipboard-list", label: "Lista", Icon: ClipboardList },
  { id: "clipboard-check", label: "Revisión", Icon: ClipboardCheck },
  { id: "users", label: "Equipo", Icon: Users },
  { id: "user-plus", label: "Reclutamiento", Icon: UserPlus },
  { id: "user-check", label: "Registro", Icon: UserCheck },
  { id: "handshake", label: "Alianza", Icon: Handshake },
  { id: "heart-handshake", label: "Bienestar", Icon: HeartHandshake },
  { id: "heart", label: "Corazón", Icon: Heart },
  { id: "smile", label: "Sonrisa", Icon: Smile },
  { id: "thumbs-up", label: "Me gusta", Icon: ThumbsUp },
  { id: "briefcase", label: "Trabajo", Icon: Briefcase },
  { id: "building", label: "Empresa", Icon: Building2 },
  { id: "graduation-cap", label: "Educación", Icon: GraduationCap },
  { id: "book-open", label: "Libro", Icon: BookOpen },
  { id: "brain", label: "Ideas", Icon: Brain },
  { id: "lightbulb", label: "Foco", Icon: Lightbulb },
  { id: "puzzle", label: "Rompecabezas", Icon: Puzzle },
  { id: "code", label: "Código", Icon: Code },
  { id: "laptop", label: "Laptop", Icon: Laptop },
  { id: "smartphone", label: "Celular", Icon: Smartphone },
  { id: "calendar", label: "Calendario", Icon: Calendar },
  { id: "calendar-check", label: "Evento", Icon: CalendarCheck },
  { id: "ticket", label: "Boleto", Icon: Ticket },
  { id: "party", label: "Fiesta", Icon: PartyPopper },
  { id: "gift", label: "Regalo", Icon: Gift },
  { id: "coffee", label: "Café", Icon: Coffee },
  { id: "trophy", label: "Trofeo", Icon: Trophy },
  { id: "award", label: "Premio", Icon: Award },
  { id: "star", label: "Estrella", Icon: Star },
  { id: "sparkles", label: "Brillos", Icon: Sparkles },
  { id: "rocket", label: "Cohete", Icon: Rocket },
  { id: "target", label: "Objetivo", Icon: Target },
  { id: "flag", label: "Bandera", Icon: Flag },
  { id: "zap", label: "Rayo", Icon: Zap },
  { id: "megaphone", label: "Anuncio", Icon: Megaphone },
  { id: "mail", label: "Correo", Icon: Mail },
  { id: "message", label: "Mensaje", Icon: MessageSquare },
  { id: "help", label: "Ayuda", Icon: CircleHelp },
  { id: "shield-check", label: "Seguridad", Icon: ShieldCheck },
  { id: "map-pin", label: "Ubicación", Icon: MapPin },
  { id: "camera", label: "Cámara", Icon: Camera },
  { id: "image", label: "Imagen", Icon: Image },
  { id: "video", label: "Video", Icon: Video },
  { id: "mic", label: "Micrófono", Icon: Mic },
  { id: "music", label: "Música", Icon: Music },
  { id: "palette", label: "Diseño", Icon: Palette },
  { id: "leaf", label: "Naturaleza", Icon: Leaf },
  { id: "sun", label: "Sol", Icon: Sun },
];

export function getFormIcon(id: string | null | undefined): LucideIcon {
  return FORM_ICON_OPTIONS.find((o) => o.id === id)?.Icon ?? Globe2;
}

export function FormIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Current = getFormIcon(value);
  const selected = value || "globe";

  const options = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!q) return FORM_ICON_OPTIONS;
    return FORM_ICON_OPTIONS.filter((o) =>
      o.label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q),
    );
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title="Cambiar icono"
          onClick={(e) => e.stopPropagation()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5b8fd4]/15 ring-1 ring-[#5b8fd4]/25 transition hover:bg-[#5b8fd4]/25 hover:ring-[#5b8fd4]/50 disabled:opacity-60"
        >
          <Current className="h-5 w-5 text-[#5b8fd4]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[19rem] p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar icono…"
          className="mb-3 h-9"
        />
        {options.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          <div className="grid max-h-60 grid-cols-7 gap-1 overflow-y-auto pr-1">
            {options.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-muted",
                  selected === id && "bg-[#5b8fd4]/20 text-[#5b8fd4] ring-1 ring-[#5b8fd4]/50",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
