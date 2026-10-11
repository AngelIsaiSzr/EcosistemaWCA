import { z } from "zod";

/**
 * Textos editables del sitio. Los valores predeterminados viven aquí; la base de datos solo
 * guarda las secciones que el admin personaliza (si se restaura, se borra la fila).
 *
 * Los campos de texto enriquecido aceptan etiquetas de color: [blue]texto[/blue]
 * (blue, yellow, red, cyan, purple, green), [b]negrita[/b], [i]cursiva[/i] y saltos de línea.
 */

export const SITE_COLORS = ["blue", "yellow", "red", "cyan", "purple", "green"] as const;
export type SiteColor = (typeof SITE_COLORS)[number];

const color = z.enum(SITE_COLORS);
const str = (max = 400) => z.string().trim().max(max);
const longStr = (max = 3000) => z.string().trim().max(max);
const link = z.object({ label: str(60), href: str(300) });

const heroSchema = z.object({
  title: str(200).min(1, "El título es obligatorio"),
  subtitle: longStr(600),
  primaryButton: link,
  secondaryButton: link,
  studentsTitle: str(60),
  studentsSubtitle: str(80),
  ratingTitle: str(60),
  ratingSubtitle: str(80),
  codeMission: str(160),
});

const featuresSchema = z.object({
  title: str(160).min(1, "El título es obligatorio"),
  subtitle: longStr(400),
  items: z
    .array(z.object({ icon: str(60), title: str(80).min(1, "Cada tarjeta necesita título"), description: longStr(400), color }))
    .max(12),
});

const sdg = z.object({ number: str(4), label: str(80), color });

const missionSchema = z.object({
  title: str(120).min(1, "El título es obligatorio"),
  text: longStr(1200),
  sdgTitle: str(120),
  sdgs: z.array(sdg).max(17),
  commitmentTitle: str(120),
  commitmentText: longStr(1200),
  linkLabel: str(80),
});

const ctaSchema = z.object({
  title: str(200).min(1, "El título es obligatorio"),
  text: longStr(600),
  primaryButton: link,
  secondaryButton: link,
});

const contactSchema = z.object({
  pageTitle: str(80).min(1, "El título es obligatorio"),
  pageSubtitle: str(300),
  formTitle: str(120),
  formText: longStr(800),
  location: str(160),
  email: str(160),
  phone: str(60),
  facebook: str(300),
  x: str(300),
  instagram: str(300),
  linkedin: str(300),
  youtube: str(300),
});

const aboutIntroSchema = z.object({
  heroTitle: str(80).min(1, "El título es obligatorio"),
  heroSubtitle: str(400),
  missionTitle: str(120),
  missionText: longStr(2000),
  methodologyTitle: str(120),
  methodologyText: longStr(2000),
  sdgIntro: str(200),
});

const aboutHistorySchema = z.object({
  title: str(120).min(1, "El título es obligatorio"),
  paragraphs: z.array(longStr(1500)).max(6),
  valuesTitle: str(120),
  values: z.array(z.object({ icon: str(60), title: str(80), description: longStr(500), color })).max(8),
});

const aboutDivisionsSchema = z.object({
  title: str(120).min(1, "El título es obligatorio"),
  subtitle: str(400),
  items: z
    .array(z.object({ icon: str(60), name: str(60), tagline: str(80), description: longStr(500), color }))
    .max(8),
  quote: str(200),
});

const aboutImpactSchema = z.object({
  title: str(120).min(1, "El título es obligatorio"),
  text: longStr(800),
  stats: z.array(z.object({ value: str(12), label: str(60), description: longStr(400), color })).max(6),
});

const footerSchema = z.object({
  description: longStr(600),
  copyright: str(160),
  resources: z.array(link).max(10),
});

export const SITE_CONTENT_SCHEMAS = {
  hero: heroSchema,
  features: featuresSchema,
  mission: missionSchema,
  cta: ctaSchema,
  contact: contactSchema,
  aboutIntro: aboutIntroSchema,
  aboutHistory: aboutHistorySchema,
  aboutDivisions: aboutDivisionsSchema,
  aboutImpact: aboutImpactSchema,
  footer: footerSchema,
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_SCHEMAS;
export type SiteContent = { [K in SiteContentKey]: z.infer<(typeof SITE_CONTENT_SCHEMAS)[K]> };

export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_SCHEMAS) as SiteContentKey[];

export function isSiteContentKey(value: string): value is SiteContentKey {
  return value in SITE_CONTENT_SCHEMAS;
}

export const SITE_CONTENT_DEFAULTS: SiteContent = {
  hero: {
    title: "Aprende, [blue]Crea[/blue] y\n[yellow]Transforma[/yellow] tu [red]FUTURO[/red]",
    subtitle:
      "World Community Academy es la Primera Academia Tecnológica, Multidisciplinaria y Colaborativa que ofrece Programas de Especialización y Rutas de Transformación para todas las personas.",
    primaryButton: { label: "Explorar Programas", href: "/programs" },
    secondaryButton: { label: "Conocer más", href: "/about" },
    studentsTitle: "+130 estudiantes",
    studentsSubtitle: "se han unido a la comunidad",
    ratingTitle: "4.8/5 valoración",
    ratingSubtitle: "basada en 100 reseñas",
    codeMission: "Reinventar la educación para que todos puedan construir el futuro",
  },
  features: {
    title: "¿Por qué elegir al Ecosistema WCA?",
    subtitle:
      "Somos la Primera Academia Tecnológica, Multidisciplinaria y Colaborativa que Revoluciona la Educación del Siglo XXI",
    items: [
      {
        icon: "fas fa-laptop-code",
        title: "Academia Multidisciplinaria",
        description:
          "Programas de computación, historia, literatura, idiomas, matemáticas, arte y más, todos con tecnología como eje transversal.",
        color: "red",
      },
      {
        icon: "fas fa-hands-helping",
        title: "Colaborativa y Descentralizada",
        description:
          "Abrimos nuestras puertas a otros proyectos educativos y con impacto social para construir juntos una comunidad educativa diversa.",
        color: "blue",
      },
      {
        icon: "fas fa-graduation-cap",
        title: "Metodología de Aprendizaje",
        description:
          "Aprende jugando toda la vida con nuestra metodología educativa, integrando ODS y proyectos que resuelven problemas reales.",
        color: "yellow",
      },
      {
        icon: "fas fa-vr-cardboard",
        title: "Tecnología Avanzada",
        description:
          "Desde presentaciones y diapositivas hasta Realidad Virtual, Realidad Aumentada e Inteligencia Artificial en cada programa.",
        color: "blue",
      },
      {
        icon: "fas fa-globe-americas",
        title: "Impacto Global",
        description:
          "Más de 130 estudiantes de 9 países en Latinoamérica y España, formando agentes de cambio para el desarrollo sostenible.",
        color: "yellow",
      },
      {
        icon: "fas fa-certificate",
        title: "Certificaciones Conjuntas",
        description:
          "Certificaciones avaladas por el Ecosistema WCA y los proyectos que imparten cada programa, reconocimiento de calidad internacional.",
        color: "red",
      },
    ],
  },
  mission: {
    title: "Nuestra Misión",
    text:
      "En el [blue]Ecosistema WCA[/blue], nuestra misión es combatir el analfabetismo digital y democratizar el acceso a la educación tecnológica y multidisciplinaria, formando agentes de cambio que impulsen el desarrollo sostenible y generen impacto tangible en la sociedad.",
    sdgTitle: "Objetivos de Desarrollo Sostenible",
    sdgs: [
      { number: "4", label: "Educación de Calidad", color: "blue" },
      { number: "8", label: "Trabajo Decente", color: "red" },
      { number: "9", label: "Industria, Innovación e Infraestructura", color: "purple" },
      { number: "10", label: "Reducción de Desigualdades", color: "yellow" },
      { number: "17", label: "Alianzas para los Objetivos", color: "green" },
    ],
    commitmentTitle: "Nuestro Compromiso",
    commitmentText:
      "Nos comprometemos a ofrecer educación tecnológica actualizada, práctica y de alta calidad, desarrollada por expertos en la industria. Creemos en el aprendizaje colaborativo por lo que creamos una comunidad diversa donde personas de distintos contextos crecen juntas.",
    linkLabel: "Conoce más sobre nosotros",
  },
  cta: {
    title: "¿Listo para ser parte de la revolución educativa?",
    text:
      "Únete a más de 130 estudiantes que ya están transformando su futuro profesional con nuestros programas de especialización.",
    primaryButton: { label: "Explorar Programas", href: "/programs" },
    secondaryButton: { label: "Únete a la Revolución", href: "/contact" },
  },
  contact: {
    pageTitle: "Contacto",
    pageSubtitle: "¿Tienes alguna pregunta o sugerencia? Estamos aquí para ayudarte.",
    formTitle: "Envíanos un mensaje",
    formText:
      "Si tienes alguna pregunta, sugerencia o simplemente quieres saludarnos, completa el formulario y te responderemos lo antes posible. ¡Estamos ansiosos por escucharte!",
    location: "Monterrey, Nuevo León, MX",
    email: "info@ecosistemawca.com",
    phone: "+52 784 110 0108",
    facebook: "https://facebook.com/ecosistemawca",
    x: "",
    instagram: "https://instagram.com/ecosistemawca",
    linkedin: "https://linkedin.com/in/ecosistemawca",
    youtube: "https://youtube.com/@ecosistemawca",
  },
  aboutIntro: {
    heroTitle: "Conócenos",
    heroSubtitle:
      "Somos una academia comprometida con la educación tecnológica inclusiva y accesible para todas las personas.",
    missionTitle: "Nuestra Misión",
    missionText:
      "En el [blue]Ecosistema WCA[/blue] (World Community Academy), creemos que la educación tecnológica de calidad debe ser accesible para todos. Nuestra misión es combatir el analfabetismo digital y democratizar el acceso a la educación tecnológica, formando agentes de cambio capaces de generar impacto sostenible. A través de nuestros Programas de Especialización y Rutas de Transformación, integramos tecnología, proyectos y retos reales que conectan el aprendizaje con la resolución de problemas del mundo actual.",
    methodologyTitle: "Metodología Play&Impact Learning",
    methodologyText:
      "Nuestra metodología [cyan]Play&Impact Learning[/cyan] es el corazón pedagógico de [i]World Community Academy[/i] y de todo el [i]Ecosistema WCA[/i]. Nace de la convicción de que el aprendizaje no debe ser un proceso rígido, lineal ni limitado a la simple transmisión de información, sino una experiencia viva, lúdica, emocional y transformadora que una el conocimiento con la acción, donde aprender es crear y crear es generar impacto.",
    sdgIntro: "Nos alineamos con los siguientes ODS de la Agenda 2030 de la ONU:",
  },
  aboutHistory: {
    title: "Nuestra Historia",
    paragraphs: [
      "Nuestra academia nació en 2022. Comenzó como un pequeño grupo de estudio con el nombre de Web Code Academy, y surgió como una respuesta a la creciente necesidad de educación tecnológica accesible. Fundada por Angel Salazar, quien experimentó de primera mano las barreras de acceso a la educación en tecnología.",
      "En 2026, cambió su nombre a World Community Academy y se convirtió en el Primer Ecosistema de Aprendizaje TecnoHumano del Mundo ofreciendo Programas de Especialización TechHuman y Rutas de Transformación TechHuman, que permiten a nuestros estudiantes desarrollar habilidades relevantes para el mercado laboral actual.",
    ],
    valuesTitle: "Nuestros Valores",
    values: [
      {
        icon: "fas fa-star",
        title: "Multidisciplinariedad",
        description:
          "Integramos múltiples áreas del conocimiento usando la tecnología como eje central del aprendizaje, desde computación hasta historia, literatura, idiomas, matemáticas y arte.",
        color: "red",
      },
      {
        icon: "fas fa-hands-helping",
        title: "Colaboración",
        description:
          "Abrimos nuestras puertas a otros proyectos educativos y con impacto social para construir juntos una comunidad educativa descentralizada y diversa.",
        color: "blue",
      },
      {
        icon: "fas fa-lightbulb",
        title: "Innovación Educativa",
        description:
          'Implementamos y desarrollamos nuestra metodología "Play&Impact Learning", integrando ODS, proyectos y retos que resuelven problemas reales del mundo.',
        color: "yellow",
      },
    ],
  },
  aboutDivisions: {
    title: "Divisiones del Ecosistema WCA",
    subtitle:
      "Cuatro pilares que conectan educación, colaboración, innovación e impacto para transformar personas y organizaciones.",
    items: [
      {
        icon: "fas fa-graduation-cap",
        name: "WCA | Learn",
        tagline: "Educación abierta para todos",
        description:
          "Programas de Especialización TechHuman gratuitos, con la metodología Play&Impact Learning y contenido alineado a problemas reales.",
        color: "blue",
      },
      {
        icon: "fas fa-handshake",
        name: "WCA | Network",
        tagline: "Capacitación corporativa",
        description:
          "Rutas de Transformación TechHuman para empresas e instituciones, a través del modelo TechHuman Business Learning con enfoque humano y sostenible.",
        color: "red",
      },
      {
        icon: "fas fa-rocket",
        name: "WCA | Labs",
        tagline: "Incubadora de innovación",
        description:
          "Espacio para la incubación de ideas, proyectos y soluciones tecnológicas de nuestros estudiantes con innovación e impacto social.",
        color: "yellow",
      },
      {
        icon: "fas fa-globe-americas",
        name: "WCA | Impact",
        tagline: "Resultados de transformación",
        description:
          "Métricas, casos de éxito y evidencia del cambio en personas y comunidades, alineados a ODS y al propósito de impacto con sentido.",
        color: "green",
      },
    ],
    quote: "Aprender haciendo, crear transformando e impactar con propósito.",
  },
  aboutImpact: {
    title: "Nuestro Impacto Global",
    text:
      "Estamos orgullosos de los logros alcanzados hasta ahora, pero sabemos que nuestro trabajo apenas está comenzando. Este es solo el comienzo de algo mucho más grande.",
    stats: [
      {
        value: "+130",
        label: "Estudiantes",
        description:
          "Personas de 9 países en Latinoamérica y España que han accedido a educación tecnológica de calidad.",
        color: "red",
      },
      {
        value: "3",
        label: "Sedes",
        description:
          "Contamos con Sede en Veracruz, Nuevo León y de manera Nacional. Muy pronto abriremos más sedes.",
        color: "blue",
      },
      {
        value: "∞",
        label: "Posibilidades",
        description:
          "Programas multidisciplinarios desde programación hasta historia, literatura, idiomas, ciencias y arte.",
        color: "yellow",
      },
    ],
  },
  footer: {
    description:
      "La Primera Academia Tecnológica, Multidisciplinaria y Colaborativa, comprometida con la educación de calidad y la reducción del analfabetismo digital creciente en el mundo.",
    copyright: "Ecosistema WCA. Todos los derechos reservados.",
    resources: [
      { label: "Historia, Origen y Propósito", href: "" },
      { label: "Tutoriales", href: "" },
      { label: "Merch Oficial", href: "/merch" },
      { label: "Documentación", href: "" },
      { label: "Blog y Comunidad", href: "" },
    ],
  },
};

/** Combina lo guardado con los predeterminados (los campos nuevos toman su valor por defecto). */
export function resolveSiteContent<K extends SiteContentKey>(key: K, stored: unknown): SiteContent[K] {
  const defaults = SITE_CONTENT_DEFAULTS[key];
  if (!stored || typeof stored !== "object") return defaults;
  const merged = { ...defaults, ...(stored as object) };
  const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(merged);
  return parsed.success ? (parsed.data as SiteContent[K]) : defaults;
}
