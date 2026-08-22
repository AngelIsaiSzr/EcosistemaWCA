import { WCA_LOGO_URL, type IntegrationFormDefinition } from "@shared/integration-form";
import { WcaLogo } from "@/components/integration/wca-logo";

export function FormAtmosphere({ definition }: { definition: IntegrationFormDefinition }) {
  const background = definition.theme?.background ?? "aurora";
  const customImage = definition.theme?.backgroundImage?.trim() || WCA_LOGO_URL;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[#0b1220]" />
      {(background === "aurora" || background === "custom") && (
        <>
          <div className="pointer-events-none absolute -left-24 top-[-10%] h-[55vh] w-[55vh] rounded-full bg-[#5b8fd4]/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-[-8%] h-[50vh] w-[50vh] rounded-full bg-[#87b1e0]/20 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-[#3d6eae]/15 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </>
      )}
      {background === "aurora" && (
        <WcaLogo
          decorative
          className="pointer-events-none absolute left-1/2 top-[42%] h-[min(28vw,220px)] w-[min(28vw,220px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08]"
        />
      )}
      {background === "logo" && (
        <WcaLogo
          decorative
          className="pointer-events-none absolute left-1/2 top-[42%] h-[min(42vw,340px)] w-[min(42vw,340px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.09]"
        />
      )}
      {background === "custom" && (
        <img
          src={customImage}
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(70vw,560px)] w-[min(70vw,560px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.14]"
        />
      )}
    </>
  );
}
