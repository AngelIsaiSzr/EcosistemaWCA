import { useMemo, useState } from "react";
import { ChevronDown, ImageIcon, Square, Circle, Squircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ImageUrlInput } from "@/components/media/image-url-input";
import {
  APPEARANCE_PRESETS,
  THEME_PRESET_CATEGORIES,
  WCA_LOGO_URL,
  type IntegrationBackground,
  type IntegrationCornerStyle,
  type IntegrationImagePosition,
  type IntegrationTheme,
} from "@shared/integration-form";

type DesignTab = "temas" | "personalizar";

const PRESET_PREVIEW: Record<
  string,
  { bg: string; input: string; accent: string; glow?: string }
> = {
  aurora: { bg: "#0b1220", input: "rgba(255,255,255,0.1)", accent: "#5b8fd4", glow: "#5b8fd4" },
  midnight: { bg: "#060b16", input: "rgba(255,255,255,0.08)", accent: "#87b1e0", glow: "#3d6eae" },
  mist: { bg: "#121826", input: "rgba(255,255,255,0.12)", accent: "#9bb8d9" },
  horizon: { bg: "linear-gradient(180deg,#1a3a5c 0%,#0b1220 100%)", input: "rgba(255,255,255,0.1)", accent: "#5b8fd4" },
  constellation: { bg: "#070b14", input: "rgba(255,255,255,0.1)", accent: "#87b1e0", glow: "#fff" },
  spotlight: { bg: "#0a0f1a", input: "rgba(255,255,255,0.1)", accent: "#5b8fd4" },
  ripple: { bg: "#0b1220", input: "rgba(255,255,255,0.1)", accent: "#87b1e0", glow: "#5b8fd4" },
  glass: { bg: "#0e1524", input: "rgba(255,255,255,0.14)", accent: "#a8c5e8" },
  duotone: { bg: "#0b1220", input: "rgba(255,255,255,0.1)", accent: "#5b8fd4", glow: "#87b1e0" },
  minimal: { bg: "#0b1220", input: "rgba(255,255,255,0.08)", accent: "#5b8fd4" },
  logo: { bg: "#0b1220", input: "rgba(255,255,255,0.1)", accent: "#87b1e0" },
};

export function FormBuilderDesign({
  theme,
  onChange,
}: {
  theme?: IntegrationTheme;
  onChange: (patch: Partial<IntegrationTheme>) => void;
}) {
  const [tab, setTab] = useState<DesignTab>("temas");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const active = theme?.background;

  const imagePath = theme?.backgroundImage?.trim() ?? "";
  const imageFieldValue =
    !imagePath || imagePath === "/logo-wca.png" || imagePath === WCA_LOGO_URL ? "" : imagePath;

  const customizeOn = Boolean(theme?.customizeEnabled);

  const presetMeta = useMemo(() => {
    const map = new Map(APPEARANCE_PRESETS.map((p) => [p.id, p]));
    return map;
  }, []);

  const setCustomize = (enabled: boolean) => {
    if (enabled) {
      const patch: Partial<IntegrationTheme> = { customizeEnabled: true };
      if (!theme?.backgroundColor?.trim()) {
        patch.backgroundColor = "#0b1220";
      }
      onChange(patch);
      return;
    }
    onChange({ customizeEnabled: false });
  };

  const setImage = (backgroundImage: string) => {
    const next = backgroundImage.trim();
    const patch: Partial<IntegrationTheme> = {
      backgroundImage: next,
      customizeEnabled: true,
    };
    if (next && theme?.background !== "custom") {
      patch.background = "custom";
      if (theme?.imageOpacity == null) patch.imageOpacity = 28;
    }
    onChange(patch);
  };

  const selectTheme = (id: IntegrationBackground) => {
    if (active === id) {
      onChange({ background: undefined });
      return;
    }
    onChange({ background: id });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b px-1">
        {(
          [
            ["temas", "Temas"],
            ["personalizar", "Personalizar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 px-2 py-2.5 text-sm font-medium transition",
              tab === id
                ? "border-b-2 border-[#5b8fd4] text-[#5b8fd4]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-3">
        {tab === "temas" && (
          <div className="space-y-3">
            {THEME_PRESET_CATEGORIES.map((category) => {
              const isCollapsed = collapsed[category.id];
              return (
                <div key={category.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [category.id]: !prev[category.id] }))
                    }
                    className="mb-2 flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    <span>{category.title}</span>
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition", isCollapsed && "-rotate-90")}
                    />
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-2 gap-2">
                      {category.presets.map((id) => {
                        const meta = presetMeta.get(id);
                        if (!meta) return null;
                        return (
                          <ThemeCard
                            key={id}
                            id={id}
                            label={meta.label}
                            selected={active === id}
                            onSelect={() => selectTheme(id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "personalizar" && (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Personalización activa</p>
                <p className="text-[11px] text-muted-foreground">
                  Colores, imagen y esquinas del formulario.
                </p>
              </div>
              <Switch checked={customizeOn} onCheckedChange={setCustomize} />
            </label>

            <div className={cn("space-y-4", !customizeOn && "pointer-events-none opacity-45")}>
              <div>
                <Label className="text-xs text-muted-foreground">Color de fondo</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Color de fondo"
                    className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(theme?.backgroundColor ?? "")
                        ? theme!.backgroundColor!
                        : "#0b1220"
                    }
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  />
                  <Input
                    className="h-9 min-w-0 flex-1"
                    value={theme?.backgroundColor ?? "#0b1220"}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    placeholder="#0b1220"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Velo oscuro ({theme?.overlayOpacity ?? 0}%)
                </Label>
                <Slider
                  className="mt-3"
                  min={0}
                  max={100}
                  step={1}
                  value={[theme?.overlayOpacity ?? 0]}
                  onValueChange={([v]) => onChange({ overlayOpacity: v ?? 0 })}
                />
              </div>

              <div className="space-y-3 rounded-xl border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Imagen de fondo
                </p>
                <div className="flex items-start gap-2">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {imageFieldValue ? (
                      <img src={imageFieldValue} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <ImageUrlInput value={imageFieldValue} onChange={setImage} />
                    {imageFieldValue && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive"
                        onClick={() => onChange({ backgroundImage: "" })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar imagen
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 rounded-lg border p-1">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                      (theme?.imageFit ?? "cover") === "cover" &&
                        (theme?.imageRepeat ?? "no-repeat") === "no-repeat"
                        ? "bg-[#5b8fd4]/20 text-[#5b8fd4]"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => onChange({ imageFit: "cover", imageRepeat: "no-repeat" })}
                  >
                    Cubrir
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                      theme?.imageRepeat === "repeat"
                        ? "bg-[#5b8fd4]/20 text-[#5b8fd4]"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => onChange({ imageFit: "auto", imageRepeat: "repeat" })}
                  >
                    Repetir
                  </button>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Brillo ({theme?.imageOpacity ?? 28}%)
                  </Label>
                  <Slider
                    className="mt-3"
                    min={0}
                    max={100}
                    step={1}
                    value={[theme?.imageOpacity ?? 28]}
                    onValueChange={([v]) => onChange({ imageOpacity: v ?? 0 })}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Posición</Label>
                  <Select
                    value={theme?.imagePosition ?? "center"}
                    onValueChange={(imagePosition) =>
                      onChange({ imagePosition: imagePosition as IntegrationImagePosition })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="top">Arriba</SelectItem>
                      <SelectItem value="bottom">Abajo</SelectItem>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="right">Derecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Esquinas</Label>
                <div className="mt-1.5 flex gap-1 rounded-lg border p-1">
                  {(
                    [
                      ["sharp", Square, "Rectas"],
                      ["rounded", Squircle, "Redondeadas"],
                      ["pill", Circle, "Píldora"],
                    ] as const
                  ).map(([id, Icon, label]) => {
                    const selected = (theme?.cornerStyle ?? "rounded") === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        title={label}
                        onClick={() => onChange({ cornerStyle: id as IntegrationCornerStyle })}
                        className={cn(
                          "flex flex-1 items-center justify-center rounded-md py-2 transition",
                          selected
                            ? "bg-[#5b8fd4]/20 text-[#5b8fd4]"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeCard({
  id,
  label,
  selected,
  onSelect,
}: {
  id: IntegrationBackground;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = PRESET_PREVIEW[id] ?? PRESET_PREVIEW.aurora;
  const bgStyle = preview.bg.startsWith("linear")
    ? { backgroundImage: preview.bg }
    : { backgroundColor: preview.bg };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-xl border text-left transition",
        selected ? "border-[#5b8fd4] ring-1 ring-[#5b8fd4]/40" : "hover:border-[#5b8fd4]/40",
      )}
    >
      <div className="relative h-[88px] p-2" style={bgStyle}>
        {preview.glow && (
          <span
            className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-40 blur-xl"
            style={{ backgroundColor: preview.glow }}
          />
        )}
        <p className="relative z-[1] text-[10px] font-semibold text-white/90">{label}</p>
        <div
          className="relative z-[1] mt-3 h-7 rounded-md border border-white/15 px-2 text-[10px] leading-7 text-white/50"
          style={{ backgroundColor: preview.input }}
        >
          theme
        </div>
        <span
          className="absolute bottom-2 left-2 h-2.5 w-6 rounded-sm"
          style={{ backgroundColor: preview.accent }}
        />
      </div>
    </button>
  );
}
