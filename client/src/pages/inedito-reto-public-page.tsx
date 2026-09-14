import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useRoute } from "wouter";
import { Loader2, ShieldAlert } from "lucide-react";

type GateState =
  | { kind: "loading" }
  | { kind: "ready"; videoUrl: string; email: string | null; isTest: boolean }
  | { kind: "blocked"; title: string; message: string };

export default function IneditoRetoPublicPage() {
  const [, params] = useRoute("/reto/:token");
  const token = params?.token ? decodeURIComponent(params.token) : "";
  const videoRef = useRef<HTMLVideoElement>(null);
  const completingRef = useRef(false);
  const [gate, setGate] = useState<GateState>({ kind: "loading" });
  const [away, setAway] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!token) {
      setGate({
        kind: "blocked",
        title: "Enlace inválido",
        message: "No se encontró un token de acceso.",
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reto/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setGate({
            kind: "blocked",
            title: "404",
            message: data.message || "Este enlace ya no está disponible.",
          });
          return;
        }
        setGate({
          kind: "ready",
          videoUrl: data.videoUrl,
          email: data.email,
          isTest: !!data.isTest,
        });
        await fetch(`/api/reto/${encodeURIComponent(token)}/open`, { method: "POST" });
      } catch {
        if (!cancelled) {
          setGate({
            kind: "blocked",
            title: "Error de conexión",
            message: "No se pudo validar el enlace. Intenta de nuevo.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const completeAndLock = useCallback(async () => {
    if (!token || completingRef.current) return;
    completingRef.current = true;
    setFinishing(true);
    try {
      await fetch(`/api/reto/${encodeURIComponent(token)}/complete`, { method: "POST" });
    } catch {
      /* igual recargamos: el servidor cerrará en el siguiente intento */
    }
    window.location.reload();
  }, [token]);

  useEffect(() => {
    if (gate.kind !== "ready") return;

    const onVisibility = () => {
      if (document.hidden) {
        setAway(true);
        videoRef.current?.pause();
      }
    };
    const onBlur = () => {
      setAway(true);
      videoRef.current?.pause();
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && ["s", "S", "p", "P", "u", "U"].includes(e.key)) ||
        (e.metaKey && ["s", "S", "p", "P"].includes(e.key))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [gate.kind]);

  if (gate.kind === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#05070c] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (gate.kind === "blocked") {
    return (
      <>
        <Helmet>
          <title>Ecosistema WCA</title>
        </Helmet>
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#05070c] px-6 text-center text-white">
          <ShieldAlert className="mb-4 h-10 w-10 text-red-500" />
          <h1 className="font-heading text-2xl font-bold tracking-tight">{gate.title}</h1>
          <p className="mt-3 max-w-md text-sm text-white/65">{gate.message}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Reto INÉDITO | Ecosistema WCA</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div
        className="fixed inset-0 flex flex-col overflow-y-auto overscroll-y-contain bg-[#05070c] text-white select-none"
        onCopy={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(91,143,212,0.18),transparent_55%)]" />

        <div className="relative z-10 mx-auto my-auto flex w-full max-w-3xl flex-col items-center px-5 py-8">
          <header className="relative mb-6 flex w-full items-center justify-center">
            <p className="text-center text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
              WCA | INÉDITO
            </p>
            {gate.isTest ? (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-amber-200">
                Prueba
              </span>
            ) : null}
          </header>

          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
            <video
              ref={videoRef}
              src={gate.videoUrl}
              className="aspect-video w-full bg-black"
              controls
              controlsList="nodownload noremoteplayback noplaybackrate"
              disablePictureInPicture
              playsInline
              preload="metadata"
              onEnded={() => {
                void completeAndLock();
              }}
              onPause={() => {
                /* permitido */
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3 text-[10px] uppercase tracking-wider text-white/35">
              <span>Clasificado</span>
              <span>{gate.email ? gate.email.slice(0, 3) + "···" : "sesión"}</span>
            </div>

            {away ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 px-6 text-center backdrop-blur-sm">
                <ShieldAlert className="mb-3 h-8 w-8 text-amber-300" />
                <p className="font-heading text-lg font-semibold">No abandones el reto</p>
                <p className="mt-2 max-w-sm text-sm text-white/65">
                  Se detectó que saliste de esta ventana. Las capturas y grabaciones están
                  restringidas. Si estás ocupado puedes pausar y continuar más tarde.
                </p>
                <button
                  type="button"
                  className="pointer-events-auto mt-5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
                  onClick={() => {
                    setAway(false);
                    videoRef.current?.pause();
                  }}
                >
                  Continuar
                </button>
              </div>
            ) : null}

            {finishing ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 text-center">
                <Loader2 className="mb-3 h-7 w-7 animate-spin text-white/70" />
                <p className="font-heading text-lg font-semibold">Visualización completada</p>
                <p className="mt-2 text-sm text-white/60">Cerrando acceso…</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
