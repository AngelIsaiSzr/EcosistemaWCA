export type IntegrationFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "single_choice"
  | "multiple_choice"
  | "checkbox"
  | "yes_no"
  | "dropdown"
  | "date"
  | "time"
  | "rating"
  | "explanation"
  | "separator"
  | "image_upload"
  | "file";

/** Campos que no guardan respuesta (solo layout / copy). */
export function isDisplayOnlyField(type: IntegrationFieldType): boolean {
  return type === "explanation" || type === "separator";
}

export type IntegrationFileAnswer = {
  name: string;
  url: string;
  size?: number;
};

export interface IntegrationChoice {
  value: string;
  label: string;
  description?: string;
  acronym?: string;
}

export interface IntegrationShowIf {
  field: string;
  equals?: string;
  /** Si la respuesta es array (multiple_choice), exige que contenga este valor. */
  includes?: string;
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
  /** Si true, es el paso inicial sin preguntas (el copy real vive en definition.title/subtitle/…). */
  isWelcome?: boolean;
  /**
   * Condición de toda la sección: si no se cumple, el paso se salta.
   * Útil para ramas (ej. «Tipo de solicitud = Incorporación» → sección de detalle).
   */
  showIf?: IntegrationShowIf;
  fields: IntegrationField[];
}

export interface IntegrationEnding {
  title: string;
  message: string;
}

export type IntegrationBackground =
  | "aurora"
  | "logo"
  | "midnight"
  | "mist"
  | "horizon"
  | "constellation"
  | "spotlight"
  | "ripple"
  | "glass"
  | "duotone"
  | "minimal"
  | "custom";

export type IntegrationImageFit = "cover" | "contain" | "auto";
export type IntegrationImageAttachment = "fixed" | "scroll";
export type IntegrationImageRepeat = "no-repeat" | "repeat";
export type IntegrationImagePosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top left"
  | "top right"
  | "bottom left"
  | "bottom right";

export type IntegrationCornerStyle = "sharp" | "rounded" | "pill";

export interface IntegrationTheme {
  background?: IntegrationBackground;
  backgroundColor?: string;
  backgroundImage?: string;
  imageFit?: IntegrationImageFit;
  imagePosition?: IntegrationImagePosition;
  imageAttachment?: IntegrationImageAttachment;
  imageRepeat?: IntegrationImageRepeat;
  imageOpacity?: number;
  overlayOpacity?: number;
  /** Radio de esquinas de controles del formulario. */
  cornerStyle?: IntegrationCornerStyle;
  /** Si true, se aplican los ajustes de Personalizar (colores / imagen). */
  customizeEnabled?: boolean;
}

export const APPEARANCE_PRESETS: { id: IntegrationBackground; label: string; hint: string }[] = [
  { id: "aurora", label: "Aurora WCA", hint: "Luces azules, retícula y logo suave" },
  { id: "midnight", label: "Medianoche", hint: "Azul profundo con brillo inferior" },
  { id: "mist", label: "Niebla", hint: "Velos suaves y poco contraste" },
  { id: "horizon", label: "Horizonte", hint: "Degradado de cielo a marino" },
  { id: "constellation", label: "Constelación", hint: "Puntos de luz tipo estrellas" },
  { id: "spotlight", label: "Foco", hint: "Haz de luz desde arriba" },
  { id: "ripple", label: "Ondas", hint: "Círculos que se expanden desde el centro" },
  { id: "glass", label: "Cristal", hint: "Viñeta y brillo tipo vidrio" },
  { id: "duotone", label: "Duotono", hint: "Dos manchas de color WCA" },
  { id: "minimal", label: "Minimal", hint: "Fondo limpio, casi sin ornamento" },
  { id: "logo", label: "Marca de agua", hint: "Logo grande al centro, fondo sólido" },
  { id: "custom", label: "Imagen propia", hint: "Sube o pega una URL y recórtala" },
];

/** Plantillas del tab Temas (sin Imagen propia). */
export const THEME_PRESET_CATEGORIES: {
  id: string;
  title: string;
  presets: IntegrationBackground[];
}[] = [
  {
    id: "wca",
    title: "Diseños WCA",
    presets: ["aurora", "midnight", "mist", "horizon", "minimal", "logo"],
  },
  {
    id: "atmosfera",
    title: "Atmósfera",
    presets: ["constellation", "spotlight", "ripple", "glass", "duotone"],
  },
];

export function themeControlRadius(style?: IntegrationCornerStyle): string {
  if (style === "sharp") return "rounded-none";
  if (style === "pill") return "rounded-full";
  return "rounded-lg";
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
  /** Anchos de columnas de la vista de respuestas (id → px) */
  responseColumnWidths?: Record<string, number>;
}

export const WCA_LOGO_URL = "/logo-wca.png";
export const WCA_LOGO_FALLBACK =
  "https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png";

export const DEFAULT_INTEGRATION_SLUG = "integracion";

export function createBlankIntegrationForm(title = "Formulario sin título"): IntegrationFormDefinition {
  return {
    version: 1,
    title,
    subtitle: "",
    description: "Completa este formulario. Tus respuestas nos ayudan a conocerte mejor.",
    cta: "Comenzar",
    ending: {
      title: "¡Gracias por tu respuesta!",
      message: "Recibimos tu información. El equipo de Talento y Bienestar te contactará si es necesario.",
    },
    theme: {
      customizeEnabled: false,
    },
    sections: [
      {
        id: "welcome",
        title,
        subtitle: "Bienvenida",
        isWelcome: true,
        fields: [],
      },
      {
        id: "datos",
        title: "Tus datos",
        subtitle: "Empecemos por lo esencial.",
        fields: [
          {
            id: "email",
            type: "email",
            label: "Correo electrónico",
            placeholder: "nombre@correo.com",
            required: true,
            unique: true,
          },
        ],
      },
    ],
  };
}

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
    backgroundColor: "#0b1220",
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
            "Acepto que mis datos se usen únicamente para el proceso de selección e integración al equipo del Ecosistema WCA.",
          description: "Consulta los términos de la convocatoria y la política de privacidad.",
          required: true,
        },
      ],
    },
  ],
};

export const DEFAULT_MIEMBROS_SLUG = "miembros";

/** Solicitudes de miembros de equipo (alta, cobertura de rol, retiro). */
export const DEFAULT_MIEMBROS_FORM: IntegrationFormDefinition = {
  version: 1,
  title: "Solicitud de miembros",
  subtitle: "Dirección de Talento y Bienestar",
  description:
    "Usa este formulario para pedir incorporación, cobertura de un rol o retiro de un integrante. Talento y Bienestar revisará el caso, hablará con las personas involucradas y tomará la decisión final con el proceso de la dirección.",
  cta: "Iniciar solicitud",
  ending: {
    title: "Solicitud recibida",
    message:
      "Talento y Bienestar revisará el caso. Puede haber seguimiento para platicar con la dirección y con las personas involucradas antes de cualquier decisión. Gracias por documentar el contexto.",
  },
  theme: {
    background: "midnight",
    backgroundColor: "#0b1220",
  },
  sections: [
    {
      id: "welcome",
      title: "Solicitud de miembros",
      subtitle: "Alta · cobertura de rol · retiro",
      isWelcome: true,
      fields: [],
    },
    {
      id: "solicitante",
      title: "Quién solicita",
      subtitle: "Datos de quien envía la solicitud a nombre de una dirección.",
      fields: [
        {
          id: "requesterName",
          type: "short_text",
          label: "Tu nombre completo",
          required: true,
          maxLength: 120,
        },
        {
          id: "email",
          type: "email",
          label: "Tu correo de contacto",
          description: "Usaremos este correo para dar seguimiento a la solicitud.",
          placeholder: "nombre@correo.com",
          required: true,
        },
        {
          id: "requesterPhone",
          type: "phone",
          label: "Teléfono (opcional)",
          required: false,
        },
        {
          id: "requesterRole",
          type: "short_text",
          label: "Tu cargo o rol en la dirección",
          placeholder: "Ej. Director/a, Coordinación, Líder de área…",
          required: true,
          maxLength: 120,
        },
      ],
    },
    {
      id: "direccion-tipo",
      title: "Dirección y tipo de solicitud",
      subtitle: "Una solicitud = un tipo de movimiento (puedes enviar otra si necesitas más de uno).",
      fields: [
        {
          id: "direction",
          type: "single_choice",
          label: "Dirección que solicita",
          required: true,
          options: [
            { value: "direccion-sede", label: "Dirección de Sede" },
            { value: "operaciones-logistica", label: "Dirección de Operaciones y Logística" },
            {
              value: "academia-innovacion",
              label: "Dirección de Academia e Innovación Educativa",
            },
            {
              value: "comunicacion-experiencia",
              label: "Dirección de Comunicación y Experiencia",
            },
            { value: "talento-bienestar", label: "Dirección de Talento y Bienestar" },
            {
              value: "desarrollo-tecnologico",
              label: "Dirección de Desarrollo Tecnológico e Innovación",
            },
            { value: "estrategia-finanzas", label: "Dirección de Estrategia y Finanzas" },
            {
              value: "investigacion-informacion",
              label: "Dirección de Investigación e Información",
            },
          ],
        },
        {
          id: "requestType",
          type: "single_choice",
          label: "Tipo de solicitud",
          required: true,
          options: [
            {
              value: "incorporacion",
              label: "Incorporación de nuevo(s) miembro(s)",
              description: "Necesitas sumar a alguien al equipo (rol nuevo o plaza adicional).",
            },
            {
              value: "cobertura",
              label: "Cobertura / continuidad de un rol",
              description:
                "Alguien ya no sostiene el rol y necesitas que otra persona entre en su lugar (o cubra esa función).",
            },
            {
              value: "retiro",
              label: "Retiro de miembro(s) del equipo",
              description:
                "El equipo ya opera sin esa persona o el ajuste es no mantenerla en el equipo.",
            },
          ],
        },
        {
          id: "urgency",
          type: "single_choice",
          label: "¿Qué tan urgente es?",
          required: true,
          options: [
            { value: "urgente", label: "Urgente (esta semana)" },
            { value: "2_semanas", label: "En las próximas 2 semanas" },
            { value: "1_mes", label: "En el próximo mes" },
            { value: "flexible", label: "Flexible / sin fecha dura" },
          ],
        },
        {
          id: "desiredDate",
          type: "short_text",
          label: "Fecha deseada (aprox.)",
          description: "Ej. 15 de octubre, inicio de mes, cierre de trimestre…",
          placeholder: "Opcional",
          required: false,
          maxLength: 80,
        },
      ],
    },
    {
      id: "detalle-incorporacion",
      title: "Detalle · Incorporación",
      subtitle: "Perfil que necesitas y por qué.",
      showIf: { field: "requestType", equals: "incorporacion" },
      fields: [
        {
          id: "newRoleTitle",
          type: "short_text",
          label: "Rol o función que se necesita",
          required: true,
          maxLength: 120,
          showIf: { field: "requestType", equals: "incorporacion" },
        },
        {
          id: "newHeadcount",
          type: "number",
          label: "¿Cuántas personas necesitas?",
          required: true,
          min: 1,
          max: 10,
          showIf: { field: "requestType", equals: "incorporacion" },
        },
        {
          id: "newProfile",
          type: "long_text",
          label: "Perfil y responsabilidades esperadas",
          description: "Qué haría día a día, skills mínimas y con quién colaboraría.",
          required: true,
          showIf: { field: "requestType", equals: "incorporacion" },
        },
        {
          id: "newJustification",
          type: "long_text",
          label: "¿Por qué se necesita ahora?",
          description: "Carga de trabajo, proyecto, hueco en el equipo, meta de la dirección…",
          required: true,
          showIf: { field: "requestType", equals: "incorporacion" },
        },
        {
          id: "newHasCandidate",
          type: "single_choice",
          label: "¿Ya tienes a alguien en mente?",
          required: true,
          options: [
            { value: "si", label: "Sí, tengo propuesta" },
            { value: "no", label: "No, pedimos apoyo para buscar" },
          ],
          showIf: { field: "requestType", equals: "incorporacion" },
        },
        {
          id: "newCandidateName",
          type: "short_text",
          label: "Nombre de la persona propuesta",
          required: true,
          maxLength: 120,
          showIf: { field: "newHasCandidate", equals: "si" },
        },
        {
          id: "newCandidateContact",
          type: "short_text",
          label: "Contacto de la persona propuesta",
          description: "Correo y/o número de teléfono.",
          required: true,
          maxLength: 160,
          showIf: { field: "newHasCandidate", equals: "si" },
        },
      ],
    },
    {
      id: "detalle-cobertura",
      title: "Detalle · Cobertura de rol",
      subtitle: "Quién deja de sostener el rol y cómo quieres cubrirlo.",
      showIf: { field: "requestType", equals: "cobertura" },
      fields: [
        {
          id: "coverMemberName",
          type: "short_text",
          label: "Nombre de la persona cuyo rol hay que cubrir",
          required: true,
          maxLength: 120,
          showIf: { field: "requestType", equals: "cobertura" },
        },
        {
          id: "coverMemberContact",
          type: "short_text",
          label: "Contacto de esa persona",
          description: "Correo y/o número para que Talento pueda dar seguimiento.",
          required: true,
          maxLength: 160,
          showIf: { field: "requestType", equals: "cobertura" },
        },
        {
          id: "coverMemberRole",
          type: "short_text",
          label: "Rol o función actual",
          required: true,
          maxLength: 120,
          showIf: { field: "requestType", equals: "cobertura" },
        },
        {
          id: "coverSituation",
          type: "long_text",
          label: "¿Qué está pasando?",
          description:
            "Bajo compromiso, ausencia, cambio de foco, conflicto de carga… sin juicios: hechos y contexto.",
          required: true,
          showIf: { field: "requestType", equals: "cobertura" },
        },
        {
          id: "coverSameRole",
          type: "single_choice",
          label: "¿La cobertura mantiene el mismo rol?",
          required: true,
          options: [
            { value: "mismo", label: "Sí, mismo rol / mismas responsabilidades" },
            { value: "ajustado", label: "Rol ajustado (cambia el alcance)" },
          ],
          showIf: { field: "requestType", equals: "cobertura" },
        },
        {
          id: "coverHasCandidate",
          type: "single_choice",
          label: "¿Tienes a una persona propuesta para cubrir?",
          required: true,
          options: [
            { value: "si", label: "Sí, tengo propuesta" },
            { value: "no", label: "No, pedimos apoyo para buscar" },
          ],
          showIf: { field: "requestType", equals: "cobertura" },
        },
        {
          id: "coverProposedName",
          type: "short_text",
          label: "Nombre de la persona propuesta",
          required: true,
          maxLength: 120,
          showIf: { field: "coverHasCandidate", equals: "si" },
        },
        {
          id: "coverProposedContact",
          type: "short_text",
          label: "Contacto de quien proponen para cubrir",
          description: "Correo y/o número de teléfono.",
          required: true,
          maxLength: 160,
          showIf: { field: "coverHasCandidate", equals: "si" },
        },
      ],
    },
    {
      id: "detalle-retiro",
      title: "Detalle · Retiro",
      subtitle: "Contexto para analizar el caso con cuidado.",
      showIf: { field: "requestType", equals: "retiro" },
      fields: [
        {
          id: "removeMemberName",
          type: "short_text",
          label: "Nombre de la persona",
          required: true,
          maxLength: 120,
          showIf: { field: "requestType", equals: "retiro" },
        },
        {
          id: "removeMemberContact",
          type: "short_text",
          label: "Contacto de esa persona",
          description: "Correo y/o número.",
          required: true,
          maxLength: 160,
          showIf: { field: "requestType", equals: "retiro" },
        },
        {
          id: "removeMemberRole",
          type: "short_text",
          label: "Rol o función actual",
          required: true,
          maxLength: 120,
          showIf: { field: "requestType", equals: "retiro" },
        },
        {
          id: "removeReason",
          type: "single_choice",
          label: "Motivo principal",
          required: true,
          options: [
            { value: "bajo_compromiso", label: "Bajo compromiso / falta de entrega" },
            { value: "capacidad_cubierta", label: "El equipo ya cubre esa función" },
            { value: "reestructura", label: "Reestructura o cambio de prioridades" },
            { value: "conflicto", label: "Conflicto o dinámica de equipo" },
            { value: "otro", label: "Otro" },
          ],
          showIf: { field: "requestType", equals: "retiro" },
        },
        {
          id: "removeTried",
          type: "long_text",
          label: "¿Qué se ha intentado antes?",
          description: "Conversaciones, ajustes de rol, acompañamiento, acuerdos…",
          required: true,
          showIf: { field: "requestType", equals: "retiro" },
        },
        {
          id: "removeTalked",
          type: "single_choice",
          label: "¿Ya se habló con la persona sobre esta situación?",
          required: true,
          options: [
            { value: "si", label: "Sí, de forma clara" },
            { value: "parcial", label: "Parcialmente / solo indicios" },
            { value: "no", label: "Todavía no" },
          ],
          showIf: { field: "requestType", equals: "retiro" },
        },
        {
          id: "removeLastDay",
          type: "short_text",
          label: "Fecha deseada de cierre (si aplica)",
          placeholder: "Opcional",
          required: false,
          maxLength: 80,
          showIf: { field: "requestType", equals: "retiro" },
        },
      ],
    },
    {
      id: "contexto",
      title: "Contexto para Talento",
      subtitle: "Esto nos ayuda a priorizar y a acompañar bien el caso.",
      fields: [
        {
          id: "impact",
          type: "long_text",
          label: "¿Qué impacto tiene en el equipo si no se atiende?",
          description: "Operación, clima, plazos, calidad, carga sobre otras personas…",
          required: true,
        },
        {
          id: "extraComments",
          type: "long_text",
          label: "Comentarios adicionales",
          description: "Cualquier detalle que no cupo arriba.",
          required: false,
        },
        {
          id: "processAck",
          type: "checkbox",
          label:
            "Entiendo que la decisión final corresponde a Talento y Bienestar, y que puede haber conversaciones con las personas involucradas antes de cerrar el caso.",
          required: true,
        },
      ],
    },
  ],
};

export function matchesShowIf(
  showIf: IntegrationShowIf | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (!showIf) return true;
  const raw = answers[showIf.field];
  if (showIf.includes != null) {
    if (Array.isArray(raw)) return raw.map(String).includes(showIf.includes);
    return String(raw ?? "") === showIf.includes;
  }
  if (showIf.equals != null) {
    return String(raw ?? "") === String(showIf.equals);
  }
  return true;
}

export function isFieldVisible(
  field: IntegrationField,
  answers: Record<string, unknown>,
): boolean {
  return matchesShowIf(field.showIf, answers);
}

/** Una sección aparece si no es bienvenida-condicional y tiene al menos un campo visible. */
export function isSectionVisible(
  section: IntegrationSection,
  answers: Record<string, unknown>,
): boolean {
  if (section.isWelcome) return true;
  if (!matchesShowIf(section.showIf, answers)) return false;
  return section.fields.some((field) => isFieldVisible(field, answers));
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
  yes_no: "Sí / No",
  dropdown: "Desplegable",
  date: "Fecha",
  time: "Hora",
  rating: "Calificación",
  explanation: "Explicación",
  separator: "Separador",
  image_upload: "Subir imagen",
  file: "Subir archivo",
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

export function createEmptyField(type: IntegrationFieldType): IntegrationField {
  const base: IntegrationField = {
    id: newFieldId(),
    type,
    label:
      type === "explanation"
        ? "Texto de explicación"
        : type === "separator"
          ? "Separador"
          : "Nueva pregunta",
    required: !isDisplayOnlyField(type),
  };
  if (type === "single_choice" || type === "multiple_choice" || type === "dropdown") {
    base.options = [{ value: "opcion-1", label: "Opción 1" }];
  }
  if (type === "yes_no") {
    base.options = [
      { value: "si", label: "Sí" },
      { value: "no", label: "No" },
    ];
  }
  if (type === "rating") {
    base.min = 1;
    base.max = 5;
  }
  if (type === "number") {
    base.min = 0;
    base.max = 100;
  }
  return base;
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

/**
 * Parche quirúrgico: gate sí/no para persona propuesta en Cobertura.
 * No sustituye el schema completo; solo inserta/ajusta esos campos si existen.
 */
export function ensureMiembrosCoberturaCandidateGate(
  definition: IntegrationFormDefinition,
): IntegrationFormDefinition {
  const sectionIndex = definition.sections.findIndex(
    (section) =>
      section.id === "detalle-cobertura" ||
      section.fields.some(
        (field) => field.id === "coverProposedName" || field.id === "coverProposedContact",
      ),
  );
  if (sectionIndex < 0) return definition;

  const section = definition.sections[sectionIndex]!;
  const fields = [...section.fields];
  let changed = false;

  const gateField: IntegrationField = {
    id: "coverHasCandidate",
    type: "single_choice",
    label: "¿Tienes a una persona propuesta para cubrir?",
    required: true,
    options: [
      { value: "si", label: "Sí, tengo propuesta" },
      { value: "no", label: "No, pedimos apoyo para buscar" },
    ],
    showIf: { field: "requestType", equals: "cobertura" },
  };

  const hasGate = fields.some((field) => field.id === "coverHasCandidate");
  if (!hasGate) {
    const insertAt = fields.findIndex(
      (field) => field.id === "coverProposedName" || field.id === "coverProposedContact",
    );
    if (insertAt >= 0) fields.splice(insertAt, 0, gateField);
    else fields.push(gateField);
    changed = true;
  }

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    if (field.id === "coverHasCandidate") {
      const next: IntegrationField = {
        ...field,
        type: "single_choice",
        label: gateField.label,
        required: true,
        options: gateField.options,
        showIf: gateField.showIf,
      };
      if (JSON.stringify(field) !== JSON.stringify(next)) {
        fields[i] = next;
        changed = true;
      }
      continue;
    }
    if (field.id === "coverProposedName") {
      const next: IntegrationField = {
        ...field,
        type: "short_text",
        label:
          field.label.includes("(si hay)") || field.label === "Persona propuesta para cubrir (si hay)"
            ? "Nombre de la persona propuesta"
            : field.label,
        required: true,
        maxLength: field.maxLength ?? 120,
        showIf: { field: "coverHasCandidate", equals: "si" },
      };
      if (JSON.stringify(field) !== JSON.stringify(next)) {
        fields[i] = next;
        changed = true;
      }
      continue;
    }
    if (field.id === "coverProposedContact") {
      const next: IntegrationField = {
        ...field,
        // short_text: correo y/o teléfono; nunca forzar validación de email
        type: "short_text",
        required: true,
        maxLength: field.maxLength ?? 160,
        description: field.description?.trim() || "Correo y/o número de teléfono.",
        showIf: { field: "coverHasCandidate", equals: "si" },
      };
      if (JSON.stringify(field) !== JSON.stringify(next)) {
        fields[i] = next;
        changed = true;
      }
    }
  }

  if (!changed) return definition;

  const sections = definition.sections.map((s, idx) =>
    idx === sectionIndex ? { ...s, fields } : s,
  );
  return { ...definition, sections };
}

/**
 * Si todos los campos de una sección comparten la misma condición y la sección
 * no tiene showIf propio, lo sube a nivel sección (misma lógica en las 3 ramas).
 */
export function promoteSharedFieldShowIfToSections(
  definition: IntegrationFormDefinition,
): IntegrationFormDefinition {
  let changed = false;
  const sections = definition.sections.map((section) => {
    if (section.isWelcome || section.showIf?.field) return section;
    if (section.fields.length === 0) return section;
    const first = section.fields[0]?.showIf;
    if (!first?.field) return section;
    const same = section.fields.every(
      (f) =>
        f.showIf?.field === first.field &&
        (f.showIf.equals ?? "") === (first.equals ?? "") &&
        (f.showIf.includes ?? "") === (first.includes ?? ""),
    );
    if (!same) return section;
    changed = true;
    return { ...section, showIf: { ...first } };
  });
  return changed ? { ...definition, sections } : definition;
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
  if (isDisplayOnlyField(field.type)) return "";
  if (field.type === "phone" && typeof value === "object") {
    const phone = value as { dial?: string; number?: string };
    return `${phone.dial ?? ""} ${phone.number ?? ""}`.trim();
  }
  if (field.type === "file" && typeof value === "object" && value !== null) {
    const file = value as IntegrationFileAnswer;
    return file.url ? `${file.name || "archivo"} (${file.url})` : "";
  }
  if (field.type === "image_upload" && typeof value === "string") {
    return value;
  }
  if (field.type === "yes_no") {
    if (value === "si" || value === true) return "Sí";
    if (value === "no" || value === false) return "No";
  }
  if (field.type === "checkbox") {
    return value === true || value === "true" ? "Sí" : "No";
  }
  if (field.type === "rating") {
    return String(value);
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

/** Evita que Sheets interprete +, =, @, - como fórmula (p. ej. teléfonos con lada). */
export function toGoogleSheetsCellValue(value: string): string {
  if (!value) return value;
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

export function formatAnswerForGoogleSheet(
  field: IntegrationField,
  value: unknown,
): string {
  return toGoogleSheetsCellValue(formatAnswerForSheet(field, value));
}

export function buildSheetRow(
  definition: IntegrationFormDefinition,
  answers: Record<string, unknown>,
  submittedAt: Date,
  submissionId: string,
): string[] {
  const fieldValues = getAllFields(definition).map((field) =>
    formatAnswerForGoogleSheet(field, answers[field.id]),
  );
  return [
    submittedAt.toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),
    submissionId,
    ...fieldValues,
  ];
}

export function sheetTabFilename(tab: string): string {
  const safe = (tab || "Respuestas")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${safe || "Respuestas"}.csv`;
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
