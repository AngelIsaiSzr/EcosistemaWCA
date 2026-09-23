/** Organigrama oficial — Sede Monterrey */

export const ORG_SEDE_ID = "monterrey" as const;

export const ORG_DIRECTION_COLORS = {
  "sede-director": "#4086E7",
  "sede-subdirector": "#AD60FB",
  "operaciones-logistica": "#FF3131",
  "academia-innovacion": "#7DA1D3",
  "comunicacion-experiencia": "#FFD400",
  "talento-bienestar": "#5EC986",
  "desarrollo-tecnologico": "#2B6DCA",
  "estrategia-finanzas": "#FF3D4D",
  "investigacion-informacion": "#22C35D",
} as const;

export type OrgDirectionKey = keyof typeof ORG_DIRECTION_COLORS;

export type OrgRoleKind = "director" | "subdirector" | "member";

export type OrgSocialLink = {
  id: string;
  label: string;
  url: string;
};

export type OrgPerson = {
  id: number;
  sedeId: string;
  parentId: number | null;
  directionKey: OrgDirectionKey;
  roleKind: OrgRoleKind;
  name: string;
  roleTitle: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  socialLinks: OrgSocialLink[];
  sortOrder: number;
  isActive: boolean;
};

export const ORG_DIRECTION_LABELS: Record<OrgDirectionKey, string> = {
  "sede-director": "Dirección de Sede",
  "sede-subdirector": "Subdirección de Sede",
  "operaciones-logistica": "Operaciones y Logística",
  "academia-innovacion": "Academia e Innovación Educativa",
  "comunicacion-experiencia": "Comunicación y Experiencia",
  "talento-bienestar": "Talento y Bienestar",
  "desarrollo-tecnologico": "Desarrollo Tecnológico e Innovación",
  "estrategia-finanzas": "Estrategia y Finanzas",
  "investigacion-informacion": "Investigación e Información",
};

/** Semilla oficial Sede Monterrey (directores + integrantes del PDF, sep 2026). */
export type OrgSeedPerson = {
  directionKey: OrgDirectionKey;
  roleKind: OrgRoleKind;
  name: string;
  roleTitle: string;
  email: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  sortOrder: number;
  /** Solo miembros: dirección padre (el director de esa área). */
  parentDirectionKey?: OrgDirectionKey;
};

export const ORG_SEED_MONTERREY: OrgSeedPerson[] = [
  {
    directionKey: "sede-director",
    roleKind: "director",
    name: "Angel Isaí Moreno Salazar",
    roleTitle: "Director de Sede",
    email: "angel.salazar@ecosistemawca.com",
    sortOrder: 0,
  },
  {
    directionKey: "sede-subdirector",
    roleKind: "subdirector",
    name: "Ana Sofía López Martínez",
    roleTitle: "Subdirectora de Sede",
    email: "ana.lopez@ecosistemawca.com",
    sortOrder: 1,
  },
  // Extremos: Academia (izq) y Desarrollo Tecnológico (der) — nombres largos, más ancho en UI.
  {
    directionKey: "academia-innovacion",
    roleKind: "director",
    name: "Ricardo Alarcón Navarro",
    roleTitle: "Director de Academia e Innovación Educativa",
    email: "ricardo.alarcon@ecosistemawca.com",
    sortOrder: 10,
  },
  {
    directionKey: "operaciones-logistica",
    roleKind: "director",
    name: "Alicia Sofía Bernadez Terrazas",
    roleTitle: "Directora de Operaciones y Logística",
    email: "alicia.bernadez@ecosistemawca.com",
    sortOrder: 11,
  },
  {
    directionKey: "comunicacion-experiencia",
    roleKind: "director",
    name: "Mariana Yoshelin Rodriguez Garcia",
    roleTitle: "Directora de Comunicación y Experiencia",
    email: "mariana.rodriguez@ecosistemawca.com",
    sortOrder: 12,
  },
  {
    directionKey: "talento-bienestar",
    roleKind: "director",
    name: "Santiago Alanis González",
    roleTitle: "Director de Talento y Bienestar",
    email: "santiago.alanis@ecosistemawca.com",
    sortOrder: 13,
  },
  {
    directionKey: "estrategia-finanzas",
    roleKind: "director",
    name: "Rodrigo Flores Manriquez",
    roleTitle: "Director de Estrategia y Finanzas",
    email: "rodrigo.flores@ecosistemawca.com",
    sortOrder: 14,
  },
  {
    directionKey: "investigacion-informacion",
    roleKind: "director",
    name: "Alessia García Vázquez",
    roleTitle: "Directora de Investigación e Información",
    email: "alessia.garcia@ecosistemawca.com",
    sortOrder: 15,
  },
  {
    directionKey: "desarrollo-tecnologico",
    roleKind: "director",
    name: "Paola Vanessa Cárdenas Gómez",
    roleTitle: "Directora de Desarrollo Tecnológico e Innovación",
    email: "paola.cardenas@ecosistemawca.com",
    sortOrder: 16,
  },
  // —— Operaciones ——
  {
    directionKey: "operaciones-logistica",
    roleKind: "member",
    parentDirectionKey: "operaciones-logistica",
    name: "Suri Valeria Tristán Hernández",
    roleTitle: "Integrante de la Dirección",
    email: "suri.tristan@ecosistemawca.com",
    sortOrder: 100,
  },
  {
    directionKey: "operaciones-logistica",
    roleKind: "member",
    parentDirectionKey: "operaciones-logistica",
    name: "Duly Alexandra Hernández Morales",
    roleTitle: "Integrante de la Dirección",
    email: "duly.hernandez@ecosistemawca.com",
    sortOrder: 101,
  },
  {
    directionKey: "operaciones-logistica",
    roleKind: "member",
    parentDirectionKey: "operaciones-logistica",
    name: "Regina Abigail Valdez Mata",
    roleTitle: "Integrante de la Dirección",
    email: "regina.valdez@ecosistemawca.com",
    sortOrder: 102,
  },
  // —— Academia ——
  {
    directionKey: "academia-innovacion",
    roleKind: "member",
    parentDirectionKey: "academia-innovacion",
    name: "Paola Silva Esparza",
    roleTitle: "Integrante de la Dirección",
    email: "paola.silva@ecosistemawca.com",
    sortOrder: 110,
  },
  {
    directionKey: "academia-innovacion",
    roleKind: "member",
    parentDirectionKey: "academia-innovacion",
    name: "Fatima Abigail Ochoa Quintero",
    roleTitle: "Integrante de la Dirección",
    email: "fatima.ochoa@ecosistemawca.com",
    sortOrder: 111,
  },
  // —— Comunicación ——
  {
    directionKey: "comunicacion-experiencia",
    roleKind: "member",
    parentDirectionKey: "comunicacion-experiencia",
    name: "Hector Alejandro Ocampo Balderas",
    roleTitle: "Integrante de la Dirección",
    email: "hector.ocampo@ecosistemawca.com",
    sortOrder: 120,
  },
  {
    directionKey: "comunicacion-experiencia",
    roleKind: "member",
    parentDirectionKey: "comunicacion-experiencia",
    name: "Ilse Edith Rosales Gallardo",
    roleTitle: "Integrante de la Dirección",
    email: "ilse.rosales@ecosistemawca.com",
    sortOrder: 121,
  },
  {
    directionKey: "comunicacion-experiencia",
    roleKind: "member",
    parentDirectionKey: "comunicacion-experiencia",
    name: "Guillermo Garcia Sanchez",
    roleTitle: "Integrante de la Dirección",
    email: "guillermo.garcia@ecosistemawca.com",
    sortOrder: 122,
  },
  {
    directionKey: "comunicacion-experiencia",
    roleKind: "member",
    parentDirectionKey: "comunicacion-experiencia",
    name: "Derek Maximiliano González Malaver",
    roleTitle: "Integrante de la Dirección",
    email: "derek.gonzalez@ecosistemawca.com",
    sortOrder: 123,
  },
  // —— Talento ——
  {
    directionKey: "talento-bienestar",
    roleKind: "member",
    parentDirectionKey: "talento-bienestar",
    name: "Ivanna Pérez Chávez",
    roleTitle: "Integrante de la Dirección",
    email: "ivanna.perez@ecosistemawca.com",
    sortOrder: 130,
  },
  {
    directionKey: "talento-bienestar",
    roleKind: "member",
    parentDirectionKey: "talento-bienestar",
    name: "Diana Goretti Fonseca Gallardo",
    roleTitle: "Integrante de la Dirección",
    email: "diana.fonseca@ecosistemawca.com",
    sortOrder: 131,
  },
  // —— Desarrollo Tecnológico ——
  {
    directionKey: "desarrollo-tecnologico",
    roleKind: "member",
    parentDirectionKey: "desarrollo-tecnologico",
    name: "Ahmed Jhulyam Corpus Venegas",
    roleTitle: "Integrante de la Dirección",
    email: "ahmed.corpus@ecosistemawca.com",
    sortOrder: 140,
  },
  {
    directionKey: "desarrollo-tecnologico",
    roleKind: "member",
    parentDirectionKey: "desarrollo-tecnologico",
    name: "Sylvie Aylin Zabetoglu González",
    roleTitle: "Integrante de la Dirección",
    email: "sylvie.zabetoglu@ecosistemawca.com",
    sortOrder: 141,
  },
  {
    directionKey: "desarrollo-tecnologico",
    roleKind: "member",
    parentDirectionKey: "desarrollo-tecnologico",
    name: "Paulo Alexis Hernández Sandoval",
    roleTitle: "Integrante de la Dirección",
    email: "paulo.hernandez@ecosistemawca.com",
    sortOrder: 142,
  },
  // —— Estrategia ——
  {
    directionKey: "estrategia-finanzas",
    roleKind: "member",
    parentDirectionKey: "estrategia-finanzas",
    name: "Mayrelin Hernández Romero",
    roleTitle: "Integrante de la Dirección",
    email: "mayrelin.hernandez@ecosistemawca.com",
    sortOrder: 150,
  },
  {
    directionKey: "estrategia-finanzas",
    roleKind: "member",
    parentDirectionKey: "estrategia-finanzas",
    name: "Katherine Camacho",
    roleTitle: "Integrante de la Dirección",
    email: "katherine.camacho@ecosistemawca.com",
    sortOrder: 151,
  },
  // —— Investigación ——
  {
    directionKey: "investigacion-informacion",
    roleKind: "member",
    parentDirectionKey: "investigacion-informacion",
    name: "Melanie Yamileth García Leos",
    roleTitle: "Integrante de la Dirección",
    email: "melanie.garcia@ecosistemawca.com",
    sortOrder: 160,
  },
  {
    directionKey: "investigacion-informacion",
    roleKind: "member",
    parentDirectionKey: "investigacion-informacion",
    name: "Noriko Montes Goo",
    roleTitle: "Integrante de la Dirección",
    email: "noriko.montes@ecosistemawca.com",
    sortOrder: 161,
  },
  {
    directionKey: "investigacion-informacion",
    roleKind: "member",
    parentDirectionKey: "investigacion-informacion",
    name: "Sofía Daniela Cruz Gutiérrez",
    roleTitle: "Integrante de la Dirección",
    email: "sofia.cruz@ecosistemawca.com",
    sortOrder: 162,
  },
];

export function orgColor(key: OrgDirectionKey): string {
  return ORG_DIRECTION_COLORS[key];
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function buildOrgTree(people: OrgPerson[]) {
  const byParent = new Map<number | null, OrgPerson[]>();
  for (const p of people.filter((x) => x.isActive)) {
    const key = p.parentId;
    const list = byParent.get(key) ?? [];
    list.push(p);
    byParent.set(key, list);
  }
  Array.from(byParent.values()).forEach((list) => {
    list.sort((a: OrgPerson, b: OrgPerson) => a.sortOrder - b.sortOrder || a.id - b.id);
  });
  return byParent;
}
