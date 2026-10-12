/** Análisis de listas de correos pegadas a mano (envíos masivos). */

export const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** Errores de dedo frecuentes en dominios → dominio correcto. */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.com.mx": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "icloud.co": "icloud.com",
  "icloud.con": "icloud.com",
  "iclod.com": "icloud.com",
  "tec.com.mx": "tec.mx",
  "itesm.com": "tec.mx",
  "tec.mx.com": "tec.mx",
};

export type EmailListAnalysis = {
  /** Correos únicos y con formato válido (en minúsculas). */
  valid: string[];
  /** Repetidos (ya contados una vez en `valid`). */
  duplicates: string[];
  /** Entradas que no parecen correo. */
  invalid: string[];
  /** Válidos pero con dominio sospechoso de error de dedo. */
  suspicious: { email: string; suggestion: string }[];
};

/** Separa por comas, punto y coma, saltos de línea, tabs o espacios. Acepta "Nombre <correo>". */
export function splitEmailInput(raw: string): string[] {
  return raw
    .split(/[\n,;\t ]+/)
    .map((part) => part.trim().replace(/^<|>$/g, "").replace(/^mailto:/i, ""))
    .filter(Boolean);
}

export function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase();
  const fixed = DOMAIN_TYPOS[domain];
  return fixed ? `${email.slice(0, at)}@${fixed}` : null;
}

export function analyzeEmailList(entries: string[]): EmailListAnalysis {
  const seen = new Set<string>();
  const out: EmailListAnalysis = { valid: [], duplicates: [], invalid: [], suspicious: [] };
  for (const entry of entries) {
    const email = entry.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      out.invalid.push(entry.trim());
      continue;
    }
    if (seen.has(email)) {
      out.duplicates.push(email);
      continue;
    }
    seen.add(email);
    out.valid.push(email);
    const suggestion = suggestEmailFix(email);
    if (suggestion) out.suspicious.push({ email, suggestion });
  }
  return out;
}
