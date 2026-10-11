export type Theme = "dark" | "light";

const KEY = "theme";
const ROOT_DOMAIN = "ecosistemawca.com";

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/** Dominio de la cookie para que el tema se comparta con los subdominios (ej. organigrama.). */
function cookieDomain(): string | null {
  const host = window.location.hostname.toLowerCase();
  if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) return `.${ROOT_DOMAIN}`;
  return null;
}

function readCookie(): Theme | null {
  const match = document.cookie.match(/(?:^|;\s*)theme=(dark|light)(?:;|$)/);
  return match ? (match[1] as Theme) : null;
}

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const fromCookie = readCookie();
  if (fromCookie) return fromCookie;
  try {
    const fromStorage = localStorage.getItem(KEY);
    return isTheme(fromStorage) ? fromStorage : null;
  } catch {
    return null;
  }
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  const domain = cookieDomain();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${KEY}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${
    domain ? `; Domain=${domain}` : ""
  }${secure}`;
}
