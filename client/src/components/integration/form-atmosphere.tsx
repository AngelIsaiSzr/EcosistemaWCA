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
          <Glow className="form-anim-drift left-[42%] top-[38%] h-80 w-80 bg-[#5b8fd4]/12" />
          <div
            className="form-stars-far absolute inset-0"
            style={{
              backgroundImage: [
                "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.7), transparent)",
                "radial-gradient(1px 1px at 28% 8%, rgba(135,177,224,0.55), transparent)",
                "radial-gradient(1.5px 1.5px at 47% 24%, rgba(255,255,255,0.8), transparent)",
                "radial-gradient(1px 1px at 71% 14%, rgba(135,177,224,0.5), transparent)",
                "radial-gradient(1px 1px at 88% 30%, rgba(255,255,255,0.45), transparent)",
                "radial-gradient(1px 1px at 18% 54%, rgba(135,177,224,0.4), transparent)",
                "radial-gradient(1.5px 1.5px at 63% 49%, rgba(255,255,255,0.7), transparent)",
                "radial-gradient(1px 1px at 91% 62%, rgba(135,177,224,0.45), transparent)",
                "radial-gradient(1px 1px at 8% 82%, rgba(255,255,255,0.4), transparent)",
                "radial-gradient(1px 1px at 79% 86%, rgba(135,177,224,0.5), transparent)",
                "radial-gradient(1px 1px at 40% 6%, rgba(255,255,255,0.5), transparent)",
                "radial-gradient(1px 1px at 58% 33%, rgba(135,177,224,0.45), transparent)",
                "radial-gradient(1px 1px at 76% 21%, rgba(255,255,255,0.55), transparent)",
                "radial-gradient(1px 1px at 5% 41%, rgba(135,177,224,0.4), transparent)",
                "radial-gradient(1px 1px at 33% 47%, rgba(255,255,255,0.5), transparent)",
                "radial-gradient(1px 1px at 95% 49%, rgba(135,177,224,0.45), transparent)",
                "radial-gradient(1px 1px at 42% 71%, rgba(255,255,255,0.4), transparent)",
                "radial-gradient(1px 1px at 66% 93%, rgba(135,177,224,0.5), transparent)",
              ].join(","),
              backgroundRepeat: "no-repeat",
            }}
          />
          <div
            className="form-stars-near absolute inset-0"
            style={{
              backgroundImage: [
                "radial-gradient(2px 2px at 22% 34%, rgba(255,255,255,0.85), transparent)",
                "radial-gradient(1.5px 1.5px at 56% 16%, rgba(135,177,224,0.8), transparent)",
                "radial-gradient(2px 2px at 84% 44%, rgba(255,255,255,0.7), transparent)",
                "radial-gradient(1.5px 1.5px at 14% 72%, rgba(135,177,224,0.65), transparent)",
                "radial-gradient(2.5px 2.5px at 49% 61%, rgba(255,255,255,0.9), transparent)",
                "radial-gradient(1.5px 1.5px at 74% 74%, rgba(135,177,224,0.6), transparent)",
                "radial-gradient(2px 2px at 36% 90%, rgba(255,255,255,0.55), transparent)",
                "radial-gradient(1.5px 1.5px at 9% 12%, rgba(135,177,224,0.7), transparent)",
                "radial-gradient(2px 2px at 68% 7%, rgba(255,255,255,0.75), transparent)",
                "radial-gradient(1.5px 1.5px at 96% 78%, rgba(135,177,224,0.65), transparent)",
                "radial-gradient(2px 2px at 25% 64%, rgba(255,255,255,0.7), transparent)",
                "radial-gradient(1.5px 1.5px at 51% 39%, rgba(135,177,224,0.75), transparent)",
              ].join(","),
              backgroundRepeat: "no-repeat",
            }}
          />
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
          <div className="absolute left-1/2 top-1/2 h-[18vmin] w-[18vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#87b1e0]/10 blur-2xl" />
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="form-wave-ring border"
              style={{
                animationDelay: `${index * 3}s`,
                borderColor: "rgba(135,177,224,0.35)",
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
