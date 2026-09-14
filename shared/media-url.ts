/**
 * Mapa de URLs ImgBB → archivos locales en /media (mismo origen = mucho más rápido).
 * Las imágenes de BD que aún apunten a i.ibb.co pasan por /api/media/proxy.
 */
const IBB_TO_LOCAL: Record<string, string> = {
  "https://i.ibb.co/qMLJGWf3/hero-a2wdq6.webp": "/media/hero-a2wdq6.webp",
  "https://i.ibb.co/PvX8XW8K/portraits1-n976eu.png": "/media/portraits1-n976eu.png",
  "https://i.ibb.co/G4wxX952/portraits2-wzwuuv.png": "/media/portraits2-wzwuuv.png",
  "https://i.ibb.co/SDnRydwd/portraits3-itzkds.png": "/media/portraits3-itzkds.png",
  "https://i.ibb.co/bjt2h1Tz/about3-yw5df.png": "/media/about3-yw5df.webp",
  "https://i.ibb.co/xbFQPY1/about1-cy3qzm.jpg": "/media/about1-cy3qzm.jpg",
  "https://i.ibb.co/rKPSpHYq/about2-rxuu0v.jpg": "/media/about2-rxuu0v.jpg",
  "https://i.ibb.co/BSjjCWc/back1-sngqjn.jpg": "/media/back1-sngqjn.jpg",
  "https://i.ibb.co/PzfH85zX/playera1-uq6j7s.png": "/media/playera1-uq6j7s.png",
  "https://i.ibb.co/mrVmvk53/playera2-a8n9kq.png": "/media/playera2-a8n9kq.png",
  "https://i.ibb.co/C38QsZtt/playera3-jvwcbg.png": "/media/playera3-jvwcbg.png",
  "https://i.ibb.co/d0N3qdFH/hoodie1-ysuzwc.png": "/media/hoodie1-ysuzwc.png",
  "https://i.ibb.co/rKszt1Cc/hoodie2-nlrpx1.png": "/media/hoodie2-nlrpx1.png",
  "https://i.ibb.co/JjmxW289/hoodie3-hemyoj.png": "/media/hoodie3-hemyoj.png",
  "https://i.ibb.co/8Lpz1QrK/team1-ct12l5.png": "/media/team1-ct12l5.webp",
  "https://i.ibb.co/qYF6rpKm/team3-ongwvm.jpg": "/media/team3-ongwvm.jpg",
  "https://i.ibb.co/WNDnTTK6/team4-euog8t.jpg": "/media/team4-euog8t.jpg",
  "https://i.ibb.co/DH3TZKPG/logo1-vvirpf.png": "/media/logo1-vvirpf.png",
  "https://i.ibb.co/9mjvc9Fj/logo2-wqdznp.png": "/media/logo2-wqdznp.png",
  "https://i.ibb.co/PZ2CTGm2/logo3-s02rgy.png": "/media/logo3-s02rgy.png",
  "https://i.ibb.co/RGrQC93M/logo4-ilfyy0.png": "/media/logo4-ilfyy0.png",
  "https://i.ibb.co/G4FbZGLy/logo5-xq2wnf.png": "/media/logo5-xq2wnf.png",
  "https://i.ibb.co/MJPggHQ/logo6-iT3Wnt.png": "/media/logo6-iT3Wnt.png",
  "https://i.ibb.co/fYTRxP2G/logo7-o8Mj5c.png": "/media/logo7-o8Mj5c.png",
  "https://i.ibb.co/XfdjR9bk/logo8-z6C9yx.png": "/media/logo8-z6C9yx.png",
  "https://i.ibb.co/SwVW4MW3/logo11-b3kTz6.png": "/media/logo11-b3kTz6.png",
};

const ALLOWED_PROXY_HOSTS = new Set([
  "i.ibb.co",
  "ibb.co",
  "raw.githubusercontent.com",
  "files.catbox.moe",
]);

/** Reescribe ImgBB conocidos a /media local; el resto de hosts lentos van al proxy. */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // data: / blob: / rutas locales
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./")
  ) {
    return trimmed;
  }

  const local = IBB_TO_LOCAL[trimmed];
  if (local) return local;

  try {
    const parsed = new URL(trimmed);
    if (ALLOWED_PROXY_HOSTS.has(parsed.hostname)) {
      return `/api/media/proxy?u=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function isAllowedProxyUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_PROXY_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}
