import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { SITE_URL } from "@/utils/titles";
import { IneditoLandingView, LANDING_PREVIEW_MSG, landingFontsHref } from "@/components/inedito/landing-view";
import {
  DEFAULT_LANDING_CONTENT,
  normalizeLandingContent,
  type IneditoLandingContent,
} from "@shared/inedito-landing";

function isEditorPreview() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("editor") === "1" && window.parent !== window;
}

function preloadImages(content: IneditoLandingContent) {
  const first = content.sections.find((s) => s.enabled);
  const srcs = [content.nav.logo, first?.style.bgImage, first?.image, first?.logo].filter(Boolean) as string[];
  for (const src of srcs) {
    const img = new Image();
    img.src = src;
    void img.decode?.().catch(() => undefined);
  }
}

export default function IneditoLandingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canPreview = user?.role === "admin" || user?.role === "talento";
  const editorMode = useMemo(isEditorPreview, []) && canPreview;
  const [draft, setDraft] = useState<IneditoLandingContent | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const landingQuery = useQuery<{ isEnabled: boolean; content?: unknown }>({
    queryKey: ["/api/inedito/landing"],
    queryFn: async () => {
      const res = await fetch("/api/inedito/landing", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar el estado");
      return res.json();
    },
  });

  const saved = useMemo(
    () => (landingQuery.data?.content ? normalizeLandingContent(landingQuery.data.content) : DEFAULT_LANDING_CONTENT),
    [landingQuery.data?.content],
  );
  const content = (editorMode && draft) || saved;

  useEffect(() => {
    if (!editorMode) preloadImages(saved);
  }, [editorMode, saved]);

  useEffect(() => {
    if (!editorMode) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as { type?: string; content?: unknown; id?: string | null };
      if (data?.type === LANDING_PREVIEW_MSG.content) {
        setDraft(normalizeLandingContent(data.content));
      } else if (data?.type === LANDING_PREVIEW_MSG.selected) {
        setSelectedId(data.id ?? null);
      } else if (data?.type === LANDING_PREVIEW_MSG.scrollTo && data.id) {
        document
          .querySelector(`[data-section-id="${CSS.escape(data.id)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: LANDING_PREVIEW_MSG.ready }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [editorMode]);

  const isEnabled = landingQuery.data?.isEnabled ?? true;
  const accessPending = authLoading || landingQuery.isLoading;

  if (accessPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (!isEnabled && !canPreview) {
    return <NotFound />;
  }

  const seoImage = content.seo.image ? `${content.seo.image.startsWith("http") ? "" : SITE_URL}${content.seo.image}` : undefined;

  return (
    <>
      <Helmet>
        <title>{content.seo.title}</title>
        <meta name="description" content={content.seo.description} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/inedito`} />
        <meta property="og:title" content={content.seo.title} />
        <meta property="og:description" content={content.seo.description} />
        {seoImage ? <meta property="og:image" content={seoImage} /> : null}
        <meta property="og:url" content={`${SITE_URL}/inedito`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={landingFontsHref(content)} rel="stylesheet" />
      </Helmet>

      <IneditoLandingView
        content={content}
        editor={
          editorMode
            ? {
                selectedId,
                onSelect: (id) => {
                  setSelectedId(id);
                  window.parent.postMessage({ type: LANDING_PREVIEW_MSG.select, id }, window.location.origin);
                },
              }
            : undefined
        }
        banner={
          !isEnabled && canPreview && !editorMode ? (
            <div className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-amber-950">
              Vista previa · la landing está desactivada para el público.{" "}
              {user?.role === "talento" ? (
                <Link href="/talento/inedito/landing" className="underline underline-offset-2">
                  Activar en Talento
                </Link>
              ) : (
                <span>Actívala desde una cuenta Talento.</span>
              )}
            </div>
          ) : undefined
        }
      />
    </>
  );
}
