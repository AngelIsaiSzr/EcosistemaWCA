import { WCA_LOGO_URL, type IntegrationFormDefinition } from "@shared/integration-form";
import { WcaLogo } from "@/components/integration/wca-logo";
import { cn } from "@/lib/utils";

export function FormAtmosphere({
  definition,
  contained,
}: {
  definition: IntegrationFormDefinition;
  contained?: boolean;
}) {
  const theme = definition.theme;
  const preset = theme?.background ?? "aurora";
  const customImage = theme?.backgroundImage?.trim() || "";
  const showImage = Boolean(customImage) || preset === "custom";
  const imageSrc = customImage || WCA_LOGO_URL;
  const opacity = Math.min(100, Math.max(0, theme?.imageOpacity ?? (preset === "custom" ? 28 : 14))) / 100;
  const overlay = Math.min(80, Math.max(0, theme?.overlayOpacity ?? (showImage ? 32 : 0))) / 100;
  const fit = theme?.imageFit ?? "cover";
  const position = theme?.imagePosition ?? "center";
  const attachment = contained ? "scroll" : (theme?.imageAttachment ?? "fixed");
  const repeat = theme?.imageRepeat ?? "no-repeat";
  const baseColor = theme?.backgroundColor?.trim() || "#0b1220";
  const layer = contained ? "absolute" : "fixed";

  return (
    <div className={cn("pointer-events-none inset-0 overflow-hidden transition-all duration-700 ease-out", layer)}>
      <div className="absolute inset-0 transition-colors duration-700" style={{ backgroundColor: baseColor }} />

      {preset === "aurora" && (
        <>
          <Glow className="form-anim-float -left-24 top-[-10%] h-[55vh] w-[55vh] bg-[#5b8fd4]/25" />
          <Glow className="form-anim-drift -right-16 bottom-[-8%] h-[50vh] w-[50vh] bg-[#87b1e0]/20" />
          <Glow className="form-anim-twinkle left-1/3 top-1/3 h-64 w-64 bg-[#3d6eae]/15" />
          <Grid />
          <WcaLogo
            decorative
            className="absolute left-1/2 top-1/2 h-[min(28vw,220px)] w-[min(28vw,220px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08] transition-all duration-700"
          />
        </>
      )}

      {preset === "logo" && (
        <WcaLogo
          decorative
          className="absolute left-1/2 top-1/2 h-[min(42vw,340px)] w-[min(42vw,340px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.09] transition-all duration-700"
        />
      )}

      {preset === "midnight" && (
        <>
          <div
            className="absolute inset-0 opacity-80"
            style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${baseColor}, #132a4a)` }}
          />
          <Glow className="form-anim-pulse bottom-[-20%] left-1/2 h-[70vh] w-[90vw] bg-[#3d6eae]/30" />
          <Grid opacity={0.08} />
        </>
      )}

      {preset === "mist" && (
        <>
          <Glow className="form-anim-float left-[-10%] top-[10%] h-[60vh] w-[60vh] bg-white/10" />
          <Glow className="form-anim-drift right-[-15%] top-[30%] h-[55vh] w-[55vh] bg-[#87b1e0]/20" />
          <div className="absolute inset-0 opacity-40" style={{ backgroundColor: baseColor }} />
        </>
      )}

      {preset === "horizon" && (
        <div
          className="absolute inset-0 opacity-90"
          style={{ backgroundImage: `linear-gradient(to bottom, #1a3a66, ${baseColor}, #070b14)` }}
        />
      )}

      {preset === "constellation" && (
        <>
          <div
            className="form-anim-stars absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(135,177,224,0.7) 1px, transparent 1.6px), radial-gradient(circle, rgba(91,143,212,0.45) 1px, transparent 1.6px), radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1.4px)",
              backgroundSize: "42px 42px, 68px 68px, 28px 28px",
            }}
          />
          <div className="form-anim-twinkle absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(135,177,224,0.18),transparent_45%)]" />
          <Glow className="form-anim-drift left-[38%] top-1/4 h-72 w-72 bg-[#5b8fd4]/20" />
        </>
      )}

      {preset === "spotlight" && (
        <>
          <div className="form-anim-pulse absolute left-1/2 top-[-20%] h-[70vh] w-[80vw] rounded-full bg-[#87b1e0]/25 blur-[90px]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ backgroundImage: `linear-gradient(to top, ${baseColor}, transparent)` }} />
        </>
      )}

      {preset === "ripple" && (
        <div className="absolute inset-0 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="form-wave-ring border-[1.5px]"
              style={{
                animationDelay: `${index * 1}s`,
                borderColor: index % 2 === 0 ? "rgba(135,177,224,0.45)" : "rgba(91,143,212,0.32)",
              }}
            />
          ))}
        </div>
      )}

      {preset === "glass" && (
        <>
          <Glow className="form-anim-float right-[-10%] top-[-10%] h-[50vh] w-[50vh] bg-[#87b1e0]/25" />
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `radial-gradient(ellipse at center, transparent 30%, ${baseColor} 80%)` }}
          />
        </>
      )}

      {preset === "duotone" && (
        <>
          <Glow className="form-anim-drift -left-20 top-0 h-[70vh] w-[70vh] bg-[#5b8fd4]/35" />
          <Glow className="form-anim-float -right-10 bottom-0 h-[65vh] w-[65vh] bg-[#87b1e0]/25" />
        </>
      )}

      {showImage && (
        <div
          className="absolute inset-0 transition-all duration-700 ease-out"
          style={{
            backgroundImage: `url("${imageSrc}")`,
            backgroundSize: fit === "auto" ? "auto" : fit,
            backgroundPosition: position,
            backgroundAttachment: attachment,
            backgroundRepeat: repeat,
            opacity,
          }}
        />
      )}

      <div className="absolute inset-0 transition-opacity duration-700" style={{ backgroundColor: baseColor, opacity: overlay }} />
    </div>
  );
}

function Glow({ className }: { className: string }) {
  return <div className={cn("absolute rounded-full blur-3xl transition-all duration-700", className)} />;
}

function Grid({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  );
}
