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
  const opacity = Math.min(100, Math.max(4, theme?.imageOpacity ?? (preset === "custom" ? 28 : 14))) / 100;
  const overlay = Math.min(80, Math.max(0, theme?.overlayOpacity ?? (showImage ? 32 : 0))) / 100;
  const fit = theme?.imageFit ?? "cover";
  const position = theme?.imagePosition ?? "center";
  const attachment = contained ? "scroll" : (theme?.imageAttachment ?? "fixed");
  const repeat = theme?.imageRepeat ?? "no-repeat";
  const layer = contained ? "absolute" : "fixed";

  return (
    <div className={cn("pointer-events-none inset-0 overflow-hidden transition-all duration-700 ease-out", layer)}>
      <div className="absolute inset-0 bg-[#0b1220] transition-colors duration-700" />

      {preset === "aurora" && (
        <>
          <Glow className="wca-drift -left-24 top-[-10%] h-[55vh] w-[55vh] bg-[#5b8fd4]/25" />
          <Glow className="wca-drift -right-16 bottom-[-8%] h-[50vh] w-[50vh] bg-[#87b1e0]/20 [animation-delay:-4s]" />
          <Glow className="left-1/3 top-1/3 h-64 w-64 bg-[#3d6eae]/15" />
          <Grid />
          <WcaLogo
            decorative
            className="absolute left-1/2 top-[42%] h-[min(28vw,220px)] w-[min(28vw,220px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08] transition-all duration-700"
          />
        </>
      )}

      {preset === "logo" && (
        <WcaLogo
          decorative
          className="absolute left-1/2 top-[42%] h-[min(42vw,340px)] w-[min(42vw,340px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.09] transition-all duration-700"
        />
      )}

      {preset === "midnight" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#071018] via-[#0b1220] to-[#132a4a]" />
          <Glow className="bottom-[-20%] left-1/2 h-[70vh] w-[90vw] -translate-x-1/2 bg-[#3d6eae]/30" />
          <Grid opacity={0.08} />
        </>
      )}

      {preset === "mist" && (
        <>
          <Glow className="wca-drift left-[-10%] top-[10%] h-[60vh] w-[60vh] bg-white/10" />
          <Glow className="wca-drift right-[-15%] top-[30%] h-[55vh] w-[55vh] bg-[#87b1e0]/20 [animation-delay:-6s]" />
          <div className="absolute inset-0 bg-[#0b1220]/30" />
        </>
      )}

      {preset === "horizon" && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3a66] via-[#0d1b33] to-[#070b14]" />
      )}

      {preset === "constellation" && (
        <>
          <div
            className="wca-stars absolute inset-0 opacity-70"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(135,177,224,0.7) 1px, transparent 1.5px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div
            className="wca-stars-slow wca-twinkle absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1.6px)",
              backgroundSize: "64px 64px",
              backgroundPosition: "18px 10px",
            }}
          />
          <Glow className="left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 bg-[#5b8fd4]/20" />
        </>
      )}

      {preset === "spotlight" && (
        <>
          <div className="wca-pulse-glow absolute left-1/2 top-[-20%] h-[70vh] w-[80vw] rounded-full bg-[#87b1e0]/25 blur-[90px]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b1220] to-transparent" />
        </>
      )}

      {preset === "ripple" && (
        <>
          <div className="wca-ripple absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] rounded-full border border-[#87b1e0]/35" />
          <div className="wca-ripple absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] rounded-full border border-[#5b8fd4]/30 [animation-delay:-2.1s]" />
          <div className="wca-ripple absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] rounded-full border border-white/20 [animation-delay:-4.2s]" />
        </>
      )}

      {preset === "glass" && (
        <>
          <Glow className="right-[-10%] top-[-10%] h-[50vh] w-[50vh] bg-[#87b1e0]/25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0b1220_80%)]" />
        </>
      )}

      {preset === "duotone" && (
        <>
          <Glow className="-left-20 top-0 h-[70vh] w-[70vh] bg-[#5b8fd4]/35" />
          <Glow className="-right-10 bottom-0 h-[65vh] w-[65vh] bg-[#87b1e0]/25" />
        </>
      )}

      {preset === "minimal" && <div className="absolute inset-0 bg-[#0c1424]" />}

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

      <div className="absolute inset-0 bg-[#0b1220] transition-opacity duration-700" style={{ opacity: overlay }} />
    </div>
  );
}

function Glow({ className }: { className: string }) {
  return <div className={cn("absolute rounded-full blur-3xl", className)} />;
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
