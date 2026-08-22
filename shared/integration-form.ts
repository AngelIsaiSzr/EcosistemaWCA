export type IntegrationFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "single_choice"
  | "multiple_choice"
  | "checkbox";

export interface IntegrationChoice {
  value: string;
  label: string;
  description?: string;
  acronym?: string;
}

export interface IntegrationShowIf {
  field: string;
  equals?: string;
}

export interface IntegrationField {
  id: string;
  type: IntegrationFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  unique?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  allowOther?: boolean;
  options?: IntegrationChoice[];
  showIf?: IntegrationShowIf;
}

export interface IntegrationSection {
  id: string;
  title: string;
  subtitle?: string;
  isWelcome?: boolean;
  fields: IntegrationField[];
}

export interface IntegrationEnding {
  title: string;
  message: string;
}

export type IntegrationBackground = "aurora" | "logo" | "custom";

export interface IntegrationTheme {
  background?: IntegrationBackground;
  backgroundImage?: string;
}

export interface IntegrationFormDefinition {
  version: number;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  ending: IntegrationEnding;
  theme?: IntegrationTheme;
  sections: IntegrationSection[];
}

export const WCA_LOGO_URL = "/logo-wca.png";
export const WCA_LOGO_FALLBACK =
  "https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png";

export const DEFAULT_INTEGRATION_SLUG = "integracion";

export const PHONE_COUNTRIES: { code: string; dial: string; name: string; flag: string }[] = [
  { code: "MX", dial: "+52", name: "México", flag: "🇲🇽" },
  { code: "US", dial: "+1", name: "EE.UU. / Canadá", flag: "🇺🇸" },
  { code: "GT", dial: "+502", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", dial: "+504", name: "Honduras", flag: "🇭🇳" },
  { code: "SV", dial: "+503", name: "El Salvador", flag: "🇸🇻" },
  { code: "NI", dial: "+505", name: "Nicaragua", flag: "🇳🇮" },
  { code: "CR", dial: "+506", name: "Costa Rica", flag: "🇨🇷" },
  { code: "PA", dial: "+507", name: "Panamá", flag: "🇵🇦" },
  { code: "CO", dial: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "VE", dial: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "EC", dial: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "PE", dial: "+51", name: "Perú", flag: "🇵🇪" },
  { code: "BO", dial: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "CL", dial: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "AR", dial: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "UY", dial: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "PY", dial: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "BR", dial: "+55", name: "Brasil", flag: "🇧🇷" },
  { code: "ES", dial: "+34", name: "España", flag: "🇪🇸" },
  { code: "FR", dial: "+33", name: "Francia", flag: "🇫🇷" },
  { code: "DE", dial: "+49", name: "Alemania", flag: "🇩🇪" },
  { code: "IT", dial: "+39", name: "Italia", flag: "🇮🇹" },
  { code: "GB", dial: "+44", name: "Reino Unido", flag: "🇬🇧" },
];

export const DEFAULT_INTEGRATION_FORM: IntegrationFormDefinition = {
  version: 1,
  title: "¡Súmate a WCA!",
  subtitle: "Formulario de Integración al Ecosistema WCA",
  description:
    "Para personas que desean enseñar, facilitar, liderar y transformar desde la tecnología con propósito.",
  cta: "Buscamos instructores, tutoras, facilitadores y líderes con vocación de impacto.",
  ending: {
    title: "¡Gracias por sumarte al Ecosistema WCA!",
    message:
      "Valoramos mucho tu interés en formar parte de World Community Academy. Nos pondremos pronto en contacto contigo. 💙 Gracias por creer en la educación, la tecnología y el impacto humano.\n\n— Equipo WCA",
  },
  theme: {
    background: "aurora",
    backgroundImage: "/logo-wca.png",
  },
  sections: [
    {
      id: "welcome",
      title: "¡Súmate a WCA!",
      isWelcome: true,
      fields: [],
    },
    {
      id: "datos-personales",
      title: "Datos personales",
      subtitle: "Cuéntanos quién eres para poder contactarte.",
      fields: [
        {
          id: "fullName",
          type: "short_text",
          label: "Nombre completo",
          placeholder: "Escribe aquí...",
          required: true,
          maxLength: 255,
        },
        {
          id: "age",
          type: "number",
          label: "Edad",
          placeholder: "Ingresa tu edad...",
          required: true,
          min: 0,
          max: 100,
        },
        {
          id: "email",
          type: "email",
          label: "Correo electrónico",
          placeholder: "Ingresa tu email...",
          required: true,
          unique: true,
        },
        {
          id: "phone",
          type: "phone",
          label: "Número de teléfono",
          description: "Número de teléfono con WhatsApp.",
          required: true,
        },
        {
          id: "residence",
          type: "short_text",
          label: "Lugar donde resides actualmente",
          description: "Ciudad y Estado",
          placeholder: "Escribe aquí...",
          required: true,
          maxLength: 255,
        },
        {
          id: "portfolioUrl",
          type: "url",
          label: "CV, portafolio o LinkedIn",
          description:
            "Pega un enlace de Google Drive, LinkedIn u otro portafolio. Nos ayuda a conocerte mejor sin una ronda extra de información.",
          placeholder: "https://linkedin.com/in/... o https://drive.google.com/...",
          required: true,
        },
      ],
    },
    {
      id: "motivacion",
      title: "Motivación",
      subtitle: "Queremos entender por qué te late WCA.",
      fields: [
        {
          id: "motivation",
          type: "long_text",
          label: "¿Qué te motiva a formar parte del Ecosistema WCA?",
          placeholder: "Escribe aquí...",
          required: true,
        },
      ],
    },
    {
      id: "area",
      title: "Área de integración",
      subtitle: "Elige cómo te gustaría sumarte. Las siguientes opciones dependen de tu respuesta.",
      fields: [
        {
          id: "integrationPath",
          type: "single_choice",
          label: "¿Cómo te gustaría integrarte a WCA?",
          required: true,
          options: [
            {
              value: "directivo",
              label: "Quiero integrarme a un área específica o al equipo directivo.",
            },
            {
              value: "educativo",
              label: "Quiero integrarme como parte del equipo educativo (instructor, tutor o facilitador)",
            },
          ],
        },
        {
          id: "directorateAreas",
          type: "multiple_choice",
          label: "¿A qué área(s) directiva(s) te gustaría postularte?",
          required: true,
          showIf: { field: "integrationPath", equals: "directivo" },
          options: [
            {
              value: "academia",
              label: "Dirección de Academia y de Innovación Educativa",
              acronym: "CAO",
              description:
                "Fomentan el aprendizaje con impacto social, diseñan los cursos, contenidos y mejoran la metodología, materiales y evaluación de aprendizajes. Habilidades: educación, pedagogía, tecnologías educativas, diseño instruccional e innovación educativa.",
            },
            {
              value: "comunicacion",
              label: "Dirección de Comunicación y Experiencia",
              acronym: "CMO",
              description:
                "Crean la identidad, presencia digital, narrativa e imagen de WCA; comunican con empatía, propósito y creatividad cada curso, actividad y logro. Habilidades: comunicación, marketing digital, diseño, storytelling y redes sociales.",
            },
            {
              value: "tecnologia",
              label: "Dirección de Desarrollo Tecnológico e Innovación",
              acronym: "CTO",
              description:
                "Crean plataformas y herramientas interactivas de WCA. Lideran proyectos de innovación tecnológica y desarrollan sistemas de cursos o dashboards de impacto. Habilidades: HTML, CSS, JavaScript, Node.js, React, Python, bases de datos, Git, APIs y UI/UX.",
            },
            {
              value: "finanzas",
              label: "Dirección de Estrategia y Finanzas",
              acronym: "CFO",
              description:
                "Aseguran la sostenibilidad económica de la academia mediante estrategias, presupuestos, alianzas y proyecciones de crecimiento. Habilidades: finanzas, Excel avanzado, fundraising, análisis de datos y economía social.",
            },
            {
              value: "talento",
              label: "Dirección de Talento y Bienestar",
              acronym: "RH",
              description:
                "Reclutan, integran y acompañan al equipo humano de la sede. Promueven la cultura organizacional, la convivencia y el desarrollo personal. Habilidades: psicología organizacional, reclutamiento, liderazgo empático y clima laboral.",
            },
            {
              value: "investigacion",
              label: "Dirección de Investigación e Información",
              acronym: "CIO",
              description:
                "Miden y evalúan el impacto de WCA mediante estudios, informes y visualización de resultados alineados a los ODS. Habilidades: análisis de datos, estadística, Power BI, Excel avanzado y redacción técnica.",
            },
            {
              value: "operaciones",
              label: "Dirección de Operaciones y Logística",
              acronym: "COO",
              description:
                "Coordinan la ejecución de operaciones y la gestión de sedes, eventos y materiales. Aseguran que equipos y agendas funcionen. Habilidades: gestión de proyectos, organización de eventos y herramientas colaborativas.",
            },
          ],
        },
        {
          id: "educationAreas",
          type: "multiple_choice",
          label: "¿A qué área(s) educativa(s) te gustaría postularte?",
          required: true,
          showIf: { field: "integrationPath", equals: "educativo" },
          options: [
            { value: "instructor", label: "Instructor/a" },
            { value: "tutor", label: "Tutor/a" },
            { value: "facilitador", label: "Facilitador/a" },
          ],
        },
      ],
    },
    {
      id: "habilidades",
      title: "Habilidades y experiencia",
      subtitle: "Queremos conocer lo que puedes aportar.",
      fields: [
        {
          id: "skills",
          type: "long_text",
          label: "¿Qué habilidades, conocimientos o herramientas dominas?",
          description: "Ej: diseño gráfico, programación, Excel, Canva, edición de video, Google Drive, gestión de proyectos, etc.",
          placeholder: "Escribe aquí...",
          required: true,
        },
        {
          id: "languages",
          type: "multiple_choice",
          label: "Idiomas que hablas o dominas",
          required: true,
          allowOther: true,
          options: [
            { value: "es", label: "Español" },
            { value: "en", label: "Inglés" },
            { value: "fr", label: "Francés" },
            { value: "de", label: "Alemán" },
          ],
        },
        {
          id: "experience",
          type: "long_text",
          label: "¿Qué experiencia previa tienes en educación, liderazgo y proyectos sociales o de impacto?",
          placeholder: "Escribe aquí...",
          required: true,
        },
      ],
    },
    {
      id: "valores",
      title: "Valores",
      subtitle: "El corazón de WCA también se elige.",
      fields: [
        {
          id: "values",
          type: "multiple_choice",
          label: "¿Con cuál de estos valores de WCA conectas más?",
          description: "Puedes elegir más de uno",
          required: true,
          options: [
            { value: "educacion-accesible", label: "Educación accesible para todos" },
            { value: "tecnologia-proposito", label: "Tecnología con propósito humano" },
            { value: "impacto-ods", label: "Impacto social / ODS" },
            { value: "comunidad", label: "Comunidad y colaboración" },
            { value: "creatividad-juego", label: "Creatividad y juego como forma de aprender" },
            { value: "inclusion", label: "Inclusión y diversidad" },
          ],
        },
      ],
    },
    {
      id: "disponibilidad",
      title: "Disponibilidad",
      subtitle: "Para coordinar ritmos reales de colaboración.",
      fields: [
        {
          id: "weeklyAvailability",
          type: "single_choice",
          label: "¿Cuál es tu disponibilidad de tiempo semanal para colaborar?",
          required: true,
          options: [
            { value: "menos-5", label: "Menos de 5 horas" },
            { value: "5-10", label: "5 a 10 horas" },
            { value: "mas-10", label: "Más de 10 horas" },
            { value: "depende", label: "Depende del proyecto" },
          ],
        },
        {
          id: "internetAccess",
          type: "single_choice",
          label: "¿Cuentas con acceso estable a internet y computadora o celular?",
          required: true,
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
            { value: "parcial", label: "Parcial" },
          ],
        },
      ],
    },
    {
      id: "cierre",
      title: "Cierre",
      subtitle: "Un último espacio para ti, y el consentimiento para tratar tus datos.",
      fields: [
        {
          id: "additionalInfo",
          type: "long_text",
          label: "¿Algo más que quieras contarnos sobre ti?",
          description: "Espacio libre para compartir intereses, valores o ideas que te gustaría aportar.",
          placeholder: "Escribe aquí...",
          required: false,
        },
        {
          id: "privacyConsent",
          type: "checkbox",
          label:
            "Acepto que mis datos se usen únicamente para el proceso de selección e integración al equipo de Ecosistema WCA.",
          description: "Puedes consultar cómo protegemos tu información en la Política de Privacidad.",
          required: true,
        },
      ],
    },
  ],
};

export function isFieldVisible(
  field: IntegrationField,
  answers: Record<string, unknown>,
): boolean {
  if (!field.showIf) return true;
  return answers[field.showIf.field] === field.showIf.equals;
}

export const FIELD_TYPE_LABELS: Record<IntegrationFieldType, string> = {
  short_text: "Texto corto",
  long_text: "Texto largo",
  number: "Número",
  email: "Correo",
  phone: "Teléfono",
  url: "Enlace",
  single_choice: "Opción única",
  multiple_choice: "Varias opciones",
  checkbox: "Casilla",
};

export function countryFlagUrl(code: string) {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(normalizeUrl(value));
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function newFieldId(prefix = "campo") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getAllFields(definition: IntegrationFormDefinition): IntegrationField[] {
  return definition.sections.flatMap((section) => section.fields);
}

export function syncOfficialCopy(definition: IntegrationFormDefinition): IntegrationFormDefinition {
  return {
    ...definition,
    theme: definition.theme ?? DEFAULT_INTEGRATION_FORM.theme,
  };
}

export function getSheetHeaders(definition: IntegrationFormDefinition): string[] {
  const fieldHeaders = getAllFields(definition).map((field) => field.label);
  return ["Fecha de envío", "ID de envío", ...fieldHeaders];
}

export function formatAnswerForSheet(
  field: IntegrationField,
  value: unknown,
): string {
  if (value === undefined || value === null || value === "") return "";
  if (field.type === "phone" && typeof value === "object") {
    const phone = value as { dial?: string; number?: string };
    return `${phone.dial ?? ""} ${phone.number ?? ""}`.trim();
  }
  if (field.type === "checkbox") {
    return value === true || value === "true" ? "Sí" : "No";
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const option = field.options?.find((opt) => opt.value === item);
        return option?.label ?? String(item);
      })
      .join(" | ");
  }
  if (field.options) {
    const option = field.options.find((opt) => opt.value === value);
    if (option) return option.label;
  }
  return String(value);
}

export function buildSheetRow(
  definition: IntegrationFormDefinition,
  answers: Record<string, unknown>,
  submittedAt: Date,
  submissionId: string,
): string[] {
  const fieldValues = getAllFields(definition).map((field) =>
    formatAnswerForSheet(field, answers[field.id]),
  );
  return [
    submittedAt.toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
    submissionId,
    ...fieldValues,
  ];
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl?.[1]) return fromUrl[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
