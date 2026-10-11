/**
 * Plantillas precargadas de correos a directores y planeador de semestre Tec.
 * Estructura Tec: Periodo 1 (5 sem) → Semana Tec #1 → Periodo 2 (5) → Semana Tec #2 → Periodo 3 (5) → Cierre.
 */

export type EmailPresetCategory = "periodo" | "semanaTec" | "cierre" | "custom";

export type EmailPresetKey =
  | "tec1"
  | "tec2"
  | "cierre"
  | "custom"
  | `p${1 | 2 | 3}w${1 | 2 | 3 | 4 | 5}`;

export type EmailPresetContent = {
  label: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
};

export type EmailPresetContext = {
  /** Código del semestre, p. ej. "AD26". Se usa en el cierre. */
  semesterCode?: string;
  /** Nombre libre para correos personalizados. */
  customName?: string;
};

const SIGNATURE_TEXT = "- Dirección de Sede Monterrey\nEcosistema WCA";

const SIGNATURE_HTML = `<p style="color:#64748b;margin-top:25px;">
      - Dirección de Sede Monterrey<br>
      Ecosistema WCA
    </p>`;

function header(title: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin:0 auto;border-collapse:collapse;">
  <tr>
    <td bgcolor="#0B1736" style="background-color:#0B1736;padding:28px;border-radius:16px 16px 0 0;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:20px;font-weight:700;line-height:1.3;color:#FFFFFF;">
        ${title}
      </div>
    </td>
  </tr>
</table>`;
}

/** Envoltura estándar de los correos WCA: encabezado azul marino + tarjeta con el contenido. */
export function wrapEmailHtml(title: string, inner: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#1f2937;line-height:1.6;">
${header(title)}
  <div style="padding:28px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;">
${inner}
  </div>
</div>`;
}

function checklist(items: string[]) {
  const rows = items
    .map((item, i) =>
      i === items.length - 1
        ? `      <div>${item}</div>`
        : `      <div style="margin-bottom:9px;">${item}</div>`,
    )
    .join("\n");
  return `    <div style="background:#f8fafc;padding:16px 20px;border-radius:10px;">
${rows}
    </div>`;
}

function highlight(html: string, accent = false) {
  return accent
    ? `    <div style="background:#eef6ff;border-left:4px solid #4d8fe8;padding:15px 18px;border-radius:8px;margin:20px 0;">
      ${html}
    </div>`
    : `    <div style="background:#eef6ff;padding:15px 18px;border-radius:8px;margin:22px 0;">
      ${html}
    </div>`;
}

const p = (html: string, style?: string) => `    <p${style ? ` style="${style}"` : ""}>${html}</p>`;

function subjectFor(emoji: string, label: string) {
  return `${emoji} Recordatorio directores · ${label} | Ecosistema WCA`;
}

/* ───────────── Semanas de periodo ───────────── */

function periodWeek(period: number, week: number): EmailPresetContent {
  const P = `Periodo ${period}`;
  const label = `${P} · Semana ${week}`;

  switch (week) {
    case 1: {
      const intro =
        period === 1
          ? "Arrancamos el semestre, esta es una buena semana para tomar ritmo, ordenar prioridades y asegurarnos de que cada integrante de tu Dirección tenga claro qué está haciendo y hacia dónde vamos."
          : "Después de Semana Tec, esta es una buena semana para volver a tomar ritmo, ordenar prioridades y asegurarnos de que cada integrante de tu Dirección tenga claro qué está haciendo y hacia dónde vamos.";
      return {
        label,
        subject: subjectFor("🚀", label),
        bodyText: `Hola 👋

Arrancamos ${P}. 🚀

${intro}

Para iniciar bien el periodo:

📩 Revisa tu correo de WCA.
💬 Revisa si Ana o Angel te enviaron algún mensaje por WhatsApp.
👥 Haz un check rápido con tu equipo y sus actividades.
🎯 Define las prioridades principales de tu Dirección para esta semana.
🚨 Si existe algún bloqueo o pendiente que dependa de otra Dirección, comunícalo cuanto antes.

No necesitamos hacer todo al mismo tiempo; necesitamos tener claro qué es lo importante ahora.

Que tengamos un excelente inicio de periodo. 💙

${SIGNATURE_TEXT}`,
        bodyHtml: wrapEmailHtml(
          `🚀 ${label}`,
          [
            p("Hola 👋"),
            p(`Arrancamos <strong>${P}</strong>. 🚀`),
            p(intro),
            p("<strong>Para iniciar bien el periodo:</strong>"),
            checklist([
              "📩 Revisa tu correo de WCA.",
              "💬 Revisa si Ana o Angel te enviaron algún mensaje por WhatsApp.",
              "👥 Haz un check rápido con tu equipo y sus actividades.",
              "🎯 Define las prioridades principales de tu Dirección para esta semana.",
              "🚨 Comunica cuanto antes cualquier bloqueo que dependa de otra Dirección.",
            ]),
            highlight("💡 No necesitamos hacer todo al mismo tiempo, necesitamos tener claro <strong>qué es lo importante ahora</strong>."),
            p("Que tengamos un excelente inicio de periodo. 💙"),
            SIGNATURE_HTML,
          ].join("\n\n"),
        ),
      };
    }
    case 2:
      return {
        label,
        subject: subjectFor("📌", label),
        bodyText: `Hola 👋

Entramos a la Semana 2 de ${P}. 📌

El periodo ya tomó ritmo y este es un buen momento para revisar que los pendientes no solamente estén asignados, sino que realmente estén avanzando.

Esta semana recuerda:

📩 Revisar tu correo de WCA.
💬 Revisar mensajes de Ana o Angel en WhatsApp.
👥 Dar seguimiento a tu equipo y preguntar si necesitan apoyo.
✅ Confirmar avances de las actividades prioritarias de tu Dirección.
🧩 Identificar pendientes que requieran colaboración con otra área.

Un buen seguimiento no significa estar detrás de todos, significa evitar que alguien se quede atorado sin decirlo.

Gracias por mantener a tu Dirección en movimiento. 🙌

${SIGNATURE_TEXT}`,
        bodyHtml: wrapEmailHtml(
          `📌 ${label}`,
          [
            p("Hola 👋"),
            p(`Entramos a la <strong>Semana 2 de ${P}</strong>.`),
            p("El periodo ya tomó ritmo y este es un buen momento para revisar que los pendientes no solamente estén asignados, sino que realmente estén avanzando."),
            checklist([
              "📩 Revisar tu correo de WCA.",
              "💬 Revisar mensajes de Ana o Angel en WhatsApp.",
              "👥 Dar seguimiento a tu equipo y preguntar si necesitan apoyo.",
              "✅ Confirmar avances de las actividades prioritarias de tu Dirección.",
              "🧩 Identificar pendientes que requieran colaboración con otra área.",
            ]),
            highlight("Un buen seguimiento no significa estar detrás de todos, significa <strong>evitar que alguien se quede atorado sin decirlo</strong>."),
            p("Gracias por mantener a tu Dirección en movimiento. 🙌"),
            SIGNATURE_HTML,
          ].join("\n\n"),
        ),
      };
    case 3:
      return {
        label,
        subject: subjectFor("🔎", label),
        bodyText: `Hola 👋

Estamos llegando a la mitad de ${P}. 🔎

Esta semana vale la pena detenernos unos minutos a revisar no solamente lo que hemos hecho, sino aquello que se está quedando atrás.

Recuerda:

📩 Revisar tu correo de WCA.
💬 Revisar mensajes de Ana o Angel por WhatsApp.
👥 Revisar avances y pendientes de tu equipo.
🔎 Detectar actividades detenidas, retrasadas o sin responsable claro.
🤝 Pedir apoyo si algún objetivo necesita colaboración entre Direcciones.

Si algo no está funcionando, este es el momento de ajustarlo, no tenemos que esperar al cierre para corregir el rumbo.

Gracias por tu liderazgo y por cuidar también el proceso de tu equipo. 💙

${SIGNATURE_TEXT}`,
        bodyHtml: wrapEmailHtml(
          `🔎 ${label}`,
          [
            p("Hola 👋"),
            p(`Estamos llegando a la mitad de <strong>${P}</strong>.`),
            p("Esta semana vale la pena detenernos unos minutos a revisar no solamente lo que hemos hecho, sino aquello que se está quedando atrás."),
            checklist([
              "📩 Revisar tu correo de WCA.",
              "💬 Revisar mensajes de Ana o Angel por WhatsApp.",
              "👥 Revisar avances y pendientes de tu equipo.",
              "🔎 Detectar actividades detenidas, retrasadas o sin responsable claro.",
              "🤝 Pedir apoyo cuando sea necesaria la colaboración entre Direcciones.",
            ]),
            highlight("Si algo no está funcionando, <strong>este es el momento de ajustarlo</strong>, no tenemos que esperar al cierre para corregir el rumbo."),
            p("Gracias por tu liderazgo y por cuidar también el proceso de tu equipo. 💙"),
            SIGNATURE_HTML,
          ].join("\n\n"),
        ),
      };
    case 4:
      return {
        label,
        subject: subjectFor("🎯", label),
        bodyText: `Hola 👋

Entramos a la Semana 4 de ${P}. 🎯

Ya estamos acercándonos al cierre del periodo, así que esta semana conviene concentrarnos en terminar bien antes que comenzar demasiadas cosas nuevas.

Por favor:

📩 Revisa tu correo de WCA.
💬 Revisa si Ana o Angel te enviaron algún mensaje.
👥 Da seguimiento a tu equipo y a sus compromisos actuales.
🎯 Prioriza los entregables que realmente deben quedar listos este periodo.
🗂️ Asegúrate de que documentos, avances y materiales importantes estén organizados.

La meta no es llegar al final con más pendientes abiertos, sino con trabajo que podamos mostrar, utilizar y continuar.

¡Último impulso antes de la semana final! 🚀

${SIGNATURE_TEXT}`,
        bodyHtml: wrapEmailHtml(
          `🎯 ${label}`,
          [
            p("Hola 👋"),
            p(`Entramos a la <strong>Semana 4 de ${P}</strong>.`),
            p("Ya estamos acercándonos al cierre del periodo, así que esta semana conviene concentrarnos en <strong>terminar bien</strong> antes que comenzar demasiadas cosas nuevas."),
            checklist([
              "📩 Revisa tu correo de WCA.",
              "💬 Revisa si Ana o Angel te enviaron algún mensaje.",
              "👥 Da seguimiento a tu equipo y a sus compromisos actuales.",
              "🎯 Prioriza los entregables que realmente deben quedar listos este periodo.",
              "🗂️ Mantén organizados documentos, avances y materiales importantes.",
            ]),
            highlight("La meta no es llegar al final con más pendientes abiertos, sino con <strong>trabajo que podamos mostrar, utilizar y continuar</strong>."),
            p("¡Último impulso antes de la semana final! 🚀"),
            SIGNATURE_HTML,
          ].join("\n\n"),
        ),
      };
    default:
      return {
        label,
        subject: subjectFor("💙", label),
        bodyText: `Hola 👋

Llegamos a la última semana de ${P}. 💙

Sabemos que para muchos esta es una de las semanas más pesadas del periodo: exámenes, proyectos finales, entregas y cierres académicos. Así que antes que cualquier otra cosa, mucho éxito esta semana. 🍀

En WCA también queremos cuidar la forma en que trabajamos. Tu responsabilidad académica es importante y no esperamos que una semana de exámenes funcione como una semana normal.

Esta semana enfócate únicamente en lo esencial:

📩 Revisa tu correo de WCA por si existe algo importante.
💬 Revisa si Ana o Angel te enviaron algún mensaje urgente.
👥 Asegúrate de que tu equipo sepa qué queda pendiente.
✅ Cierra únicamente los compromisos prioritarios del periodo.
🗣️ Si necesitas mover una actividad o reducir carga, comunícalo con confianza.

No queremos construir un Ecosistema que hable de bienestar mientras ignora el bienestar de su propio equipo.

Haz lo que puedas hacer bien, comunica lo que necesites y concéntrate también en cerrar fuerte académicamente.

¡Muchísimo éxito en tus exámenes y entregas! 🍀📚

${SIGNATURE_TEXT}`,
        bodyHtml: wrapEmailHtml(
          `💙 ${label}`,
          [
            p("Hola 👋"),
            p(`Llegamos a la última semana de <strong>${P}</strong>.`),
            highlight("🍀 Sabemos que para muchos esta es una de las semanas más pesadas del periodo: exámenes, proyectos finales, entregas y cierres académicos. <strong>Mucho éxito esta semana.</strong>", true),
            p("En WCA también queremos cuidar la forma en que trabajamos. Tu responsabilidad académica es importante y no esperamos que una semana de exámenes funcione como una semana normal."),
            p("<strong>Esta semana enfócate únicamente en lo esencial:</strong>"),
            checklist([
              "📩 Revisa tu correo de WCA por si existe algo importante.",
              "💬 Revisa si Ana o Angel te enviaron algún mensaje urgente.",
              "👥 Asegúrate de que tu equipo sepa qué queda pendiente.",
              "✅ Cierra únicamente los compromisos prioritarios.",
              "🗣️ Si necesitas mover una actividad o reducir carga, comunícalo con confianza.",
            ]),
            p("No queremos construir un Ecosistema que hable de bienestar mientras ignora el bienestar de su propio equipo.", "font-weight:700;margin-top:22px;"),
            p("Haz lo que puedas hacer bien, comunica lo que necesites y concéntrate también en cerrar fuerte académicamente."),
            p("<strong>¡Muchísimo éxito en tus exámenes y entregas! 🍀📚</strong>"),
            SIGNATURE_HTML,
          ].join("\n\n"),
        ),
      };
  }
}

/* ───────────── Semanas Tec ───────────── */

function semanaTec1(): EmailPresetContent {
  const label = "Semana Tec #1";
  return {
    label,
    subject: subjectFor("🌐", label),
    bodyText: `Hola 👋

¡Llegamos a nuestra primera Semana Tec del semestre! 💙

Esta semana cambia un poco el ritmo habitual, así que además de mantener al día lo esencial de tu Dirección, queremos aprovecharla para reconectar como equipo. Nos emociona especialmente encontrarnos en WCA | Conecta #1, nuestro espacio para convivir, conocernos mejor y fortalecer la comunidad que estamos construyendo.

Antes de continuar con tu semana, recuerda:

📩 Revisar constantemente tu correo de WCA (el que creaste al inicio).
💬 Revisar si Ana o Angel te enviaron algún mensaje por WhatsApp.
👥 Revisar a tu equipo, sus actividades y pendientes actuales.
🚨 Comunicar cualquier bloqueo, cambio o situación que necesitemos conocer.

No todo en WCA es avanzar tareas, también necesitamos construir equipo.

Nos vemos en WCA | Conecta #1. ✨

Gracias por seguir construyendo esto con nosotros.

${SIGNATURE_TEXT}`,
    bodyHtml: wrapEmailHtml(
      "🌐 Semana Tec #1",
      [
        p("Hola 👋"),
        p("¡Llegamos a nuestra primera <strong>Semana Tec</strong> del semestre! 💙"),
        p("Esta semana cambia un poco el ritmo habitual, así que además de mantener al día lo esencial de tu Dirección, queremos aprovecharla para <strong>reconectar como equipo</strong>."),
        highlight("✨ Nos emociona especialmente encontrarnos en <strong>WCA | Conecta #1</strong>, nuestro espacio para convivir, conocernos mejor y fortalecer la comunidad que estamos construyendo.", true),
        p("<strong>Antes de continuar con tu semana, recuerda:</strong>"),
        checklist([
          "📩 Revisar constantemente tu correo de WCA (el que creaste al inicio).",
          "💬 Revisar si Ana o Angel te enviaron algún mensaje por WhatsApp.",
          "👥 Revisar a tu equipo, sus actividades y pendientes actuales.",
          "🚨 Comunicar cualquier bloqueo, cambio o situación que necesitemos conocer.",
        ]),
        p("No todo en WCA es avanzar tareas, también necesitamos construir equipo.", "margin-top:22px;"),
        p("<strong>Nos vemos en WCA | Conecta #1. ✨</strong>"),
        p("Gracias por seguir construyendo esto con nosotros."),
        SIGNATURE_HTML,
      ].join("\n\n"),
    ),
  };
}

function semanaTec2(): EmailPresetContent {
  const label = "Semana Tec #2";
  return {
    label,
    subject: subjectFor("✨", label),
    bodyText: `Hola 👋

Terminamos Periodo 2 y llegamos a nuestra segunda Semana Tec. ✨

Después de semanas intensas, esta también es una oportunidad para cambiar de ritmo, reconectar y reconocer todo lo que hemos avanzado como equipo.

Y sí: vuelve WCA | Conecta. 💙

Nos emociona tener WCA | Conecta #2 como un espacio para salir un momento de pendientes, convivir y seguir construyendo una comunidad donde las personas sean tan importantes como los proyectos.

Esta semana recuerda:

📩 Revisar tu correo de WCA.
💬 Revisar mensajes de Ana o Angel.
👥 Mantener al tanto a tu equipo únicamente de lo necesario.
🧹 Cerrar o acomodar pendientes que hayan quedado de Periodo 2.
💙 Darte también espacio para convivir, descansar y recargar energía.

Gracias por todo lo que has aportado hasta aquí.

Nos vemos en WCA | Conecta #2. 🙌

${SIGNATURE_TEXT}`,
    bodyHtml: wrapEmailHtml(
      "✨ Semana Tec #2",
      [
        p("Hola 👋"),
        p("Terminamos Periodo 2 y llegamos a nuestra segunda <strong>Semana Tec</strong>. ✨"),
        p("Después de semanas intensas, esta también es una oportunidad para cambiar de ritmo, reconectar y reconocer todo lo que hemos avanzado como equipo."),
        highlight("💙 Nos emociona tener <strong>WCA | Conecta #2</strong> como un espacio para salir un momento de pendientes, convivir y seguir construyendo comunidad.", true),
        checklist([
          "📩 Revisar tu correo de WCA.",
          "💬 Revisar mensajes de Ana o Angel.",
          "👥 Mantener al tanto a tu equipo únicamente de lo necesario.",
          "🧹 Cerrar o acomodar pendientes que hayan quedado de Periodo 2.",
          "💙 Darte también espacio para convivir, descansar y recargar energía.",
        ]),
        p("Gracias por todo lo que has aportado hasta aquí.", "margin-top:22px;"),
        p("<strong>Nos vemos en WCA | Conecta #2. 🙌</strong>"),
        SIGNATURE_HTML,
      ].join("\n\n"),
    ),
  };
}

/* ───────────── Cierre ───────────── */

function cierre(code: string): EmailPresetContent {
  const sem = code.trim() || "del semestre";
  const label = code.trim() ? `Cierre de semestre ${code.trim()}` : "Cierre de semestre";
  const named = code.trim() ? `semestre ${code.trim()}` : "semestre";
  return {
    label,
    subject: `🏁 ${label} · Directores | Ecosistema WCA`,
    bodyText: `Hola 👋

Llegamos al cierre del ${named}. 🏁

Este es nuestro último recordatorio directivo del semestre y, más que pedirte comenzar algo nuevo, queremos asegurarnos de cerrar correctamente todo lo que construimos durante estos meses.

Antes de cerrar:

📩 Revisa por última vez tu correo de WCA y mensajes pendientes.
👥 Haz un último check con tu equipo.
✅ Identifica qué actividades quedaron terminadas y cuáles continuarán después.
🗂️ Asegúrate de que documentos, archivos y materiales importantes estén guardados correctamente.
📝 Deja claridad sobre cualquier pendiente que deba retomarse el próximo semestre.
💙 Reconoce y agradece el trabajo de las personas de tu Dirección.

No todo lo que empezamos tenía que terminar este semestre. Lo importante es que aquello que continúe tenga contexto, responsables y un siguiente paso claro.

Gracias por tu tiempo, tus ideas y el trabajo que aportaste al Ecosistema WCA durante ${sem}.

Detrás de cada proyecto, actividad y resultado hubo personas decidiendo construir algo juntas. Y eso también merece reconocerse.

Que tengas un excelente cierre de semestre y un descanso muy merecido. ✨

Nos vemos en lo que sigue.

${SIGNATURE_TEXT}`,
    bodyHtml: wrapEmailHtml(
      "🏁 Cierre de semestre",
      [
        p("Hola 👋"),
        p(`Llegamos al <strong>cierre del ${named}</strong>.`),
        p("Este es nuestro último recordatorio directivo del semestre y, más que pedirte comenzar algo nuevo, queremos asegurarnos de cerrar correctamente todo lo que construimos durante estos meses."),
        p("<strong>Antes de cerrar:</strong>"),
        checklist([
          "📩 Revisa por última vez tu correo de WCA y mensajes pendientes.",
          "👥 Haz un último check con tu equipo.",
          "✅ Identifica qué actividades terminaron y cuáles continuarán.",
          "🗂️ Verifica que documentos y materiales importantes estén guardados.",
          "📝 Deja claridad sobre los pendientes del siguiente semestre.",
          "💙 Reconoce y agradece el trabajo de las personas de tu Dirección.",
        ]),
        highlight("No todo lo que empezamos tenía que terminar este semestre. Lo importante es que aquello que continúe tenga <strong>contexto, responsables y un siguiente paso claro</strong>."),
        p(`Gracias por tu tiempo, tus ideas y el trabajo que aportaste al Ecosistema WCA durante ${sem}.`),
        p("Detrás de cada proyecto, actividad y resultado hubo personas decidiendo construir algo juntas. Y eso también merece reconocerse."),
        p("<strong>Que tengas un excelente cierre de semestre y un descanso muy merecido. ✨</strong>"),
        p("Nos vemos en lo que sigue."),
        SIGNATURE_HTML,
      ].join("\n\n"),
    ),
  };
}

/* ───────────── Personalizado ───────────── */

function custom(name: string): EmailPresetContent {
  const label = name.trim() || "Correo personalizado";
  return {
    label,
    subject: `✉️ ${label} | Ecosistema WCA`,
    bodyText: `Hola 👋

Escribe aquí tu mensaje.

${SIGNATURE_TEXT}`,
    bodyHtml: wrapEmailHtml(
      `✉️ ${label}`,
      [p("Hola 👋"), p("Escribe aquí tu mensaje."), SIGNATURE_HTML].join("\n\n"),
    ),
  };
}

/* ───────────── API pública ───────────── */

export function buildEmailPreset(key: EmailPresetKey, ctx: EmailPresetContext = {}): EmailPresetContent {
  if (key === "tec1") return semanaTec1();
  if (key === "tec2") return semanaTec2();
  if (key === "cierre") return cierre(ctx.semesterCode ?? "");
  if (key === "custom") return custom(ctx.customName ?? "");
  const match = /^p([123])w([1-5])$/.exec(key);
  if (match) return periodWeek(Number(match[1]), Number(match[2]));
  return custom(ctx.customName ?? "");
}

export type EmailPresetOption = {
  key: EmailPresetKey;
  label: string;
  emoji: string;
  category: EmailPresetCategory;
};

const WEEK_EMOJI = ["🚀", "📌", "🔎", "🎯", "💙"];

export const EMAIL_PRESET_OPTIONS: EmailPresetOption[] = [
  ...[1, 2, 3].flatMap((period) =>
    [1, 2, 3, 4, 5].map((week) => ({
      key: `p${period}w${week}` as EmailPresetKey,
      label: `Periodo ${period} · Semana ${week}`,
      emoji: WEEK_EMOJI[week - 1],
      category: "periodo" as const,
    })),
  ),
  { key: "tec1", label: "Semana Tec #1", emoji: "🌐", category: "semanaTec" },
  { key: "tec2", label: "Semana Tec #2", emoji: "✨", category: "semanaTec" },
  { key: "cierre", label: "Cierre de semestre", emoji: "🏁", category: "cierre" },
  { key: "custom", label: "Correo personalizado", emoji: "✉️", category: "custom" },
];

export function presetEmoji(key: string | null | undefined): string {
  return EMAIL_PRESET_OPTIONS.find((o) => o.key === key)?.emoji ?? "✉️";
}

/* ───────────── Planeador de semestre ───────────── */

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Lunes de la semana de una fecha (para alinear el inicio de clases). */
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDaysIso(iso, offset);
}

export type SemesterPlanItem = {
  presetKey: EmailPresetKey;
  label: string;
  sendDate: string;
  /** Semana del semestre (1–18). */
  week: number;
  phase: "Periodo 1" | "Semana Tec #1" | "Periodo 2" | "Semana Tec #2" | "Periodo 3" | "Cierre";
};

/**
 * Semana 1–5 Periodo 1 · 6 Semana Tec #1 · 7–11 Periodo 2 · 12 Semana Tec #2 · 13–17 Periodo 3 · 18 Cierre.
 * Cada correo cae en el lunes de su semana.
 */
export function buildSemesterPlan(classStart: string, semesterCode = ""): SemesterPlanItem[] {
  const start = mondayOf(classStart);
  const items: SemesterPlanItem[] = [];
  const push = (week: number, presetKey: EmailPresetKey, phase: SemesterPlanItem["phase"]) => {
    items.push({
      presetKey,
      phase,
      week,
      label: buildEmailPreset(presetKey, { semesterCode }).label,
      sendDate: addDaysIso(start, (week - 1) * 7),
    });
  };
  for (let w = 1; w <= 5; w++) push(w, `p1w${w}` as EmailPresetKey, "Periodo 1");
  push(6, "tec1", "Semana Tec #1");
  for (let w = 1; w <= 5; w++) push(6 + w, `p2w${w}` as EmailPresetKey, "Periodo 2");
  push(12, "tec2", "Semana Tec #2");
  for (let w = 1; w <= 5; w++) push(12 + w, `p3w${w}` as EmailPresetKey, "Periodo 3");
  push(18, "cierre", "Cierre");
  return items;
}

/** Convierte el HTML del correo a texto plano legible (para la versión sin formato). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Bloques listos para insertar en el editor HTML. */
export const EMAIL_HTML_SNIPPETS: Array<{ id: string; label: string; html: string }> = [
  { id: "p", label: "Párrafo", html: p("Escribe aquí tu texto.") },
  { id: "bold", label: "Texto en negritas", html: p("<strong>Texto destacado</strong>") },
  { id: "box", label: "Caja destacada", html: highlight("💡 Mensaje importante para el equipo.", true) },
  { id: "note", label: "Nota azul", html: highlight("Recordatorio con <strong>énfasis</strong>.") },
  {
    id: "list",
    label: "Lista de pendientes",
    html: checklist(["📩 Revisa tu correo de WCA.", "👥 Revisa a tu equipo.", "🚨 Comunica cualquier bloqueo."]),
  },
  {
    id: "button",
    label: "Botón con enlace",
    html: `    <p style="margin:22px 0;"><a href="https://ecosistemawca.com" style="display:inline-block;background:#4d8fe8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">Abrir enlace</a></p>`,
  },
  { id: "signature", label: "Firma", html: SIGNATURE_HTML },
];
