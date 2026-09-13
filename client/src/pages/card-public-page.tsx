import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { PresentationCard } from "@shared/schema";
import { CardPreview } from "@/components/cards/card-preview";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import NotFound from "@/pages/not-found";
import { SITE_URL } from "@/utils/titles";
import { isReservedCardSlug, normalizeCardSlug } from "@shared/card-directions";

export default function CardPublicPage({
  params,
}: {
  params?: Record<string | number, string | undefined>;
}) {
  const rawSlug = params?.slug || "";
  const slug = normalizeCardSlug(rawSlug);

  const enabled = !!slug && !isReservedCardSlug(slug);

  const { data, isLoading, isError } = useQuery<PresentationCard>({
    queryKey: ["/api/cards/by-slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/cards/by-slug/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled,
    retry: false,
  });

  if (!enabled) return <NotFound />;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220]">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (isError || !data) return <NotFound />;

  const description =
    data.bio?.slice(0, 160) ||
    `${data.name} · ${data.roleTitle} · Ecosistema WCA`;

  return (
    <>
      <Helmet>
        <title>{`${data.name} | Ecosistema WCA`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/${data.slug}`} />
        <meta property="og:title" content={`${data.name} | Ecosistema WCA`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/${data.slug}`} />
        {data.image ? <meta property="og:image" content={data.image} /> : null}
      </Helmet>
      <CardPreview card={data} />
    </>
  );
}
