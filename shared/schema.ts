import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { IntegrationFormDefinition } from "./integration-form";
import type { PresentationCardLink, PresentationCardTheme } from "./card-directions";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("student"),
  profileImage: text("profile_image"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  shortDescription: text("short_description").notNull(),
  level: text("level").notNull(),
  category: text("category").notNull(),
  duration: integer("duration").notNull(),
  modules: integer("modules").notNull(),
  image: text("image").notNull(),
  instructor: text("instructor").notNull(),
  featured: boolean("featured").default(false),
  popular: boolean("popular").default(false),
  new: boolean("new").default(false),
  isLive: boolean("is_live").default(false),
  liveDetails: jsonb("live_details"),
  isDisabled: boolean("is_disabled").default(false),
  comingSoon: boolean("coming_soon").default(false),
  /** Especialización TechHuman: página informativa → LXP (sin temario ni inscripción clásica) */
  techHumanSpecialization: boolean("tech_human_specialization").default(false),
  /** Destino del CTA «Descubre Más»; vacío = DEFAULT_LXP_ENROLLMENT_URL */
  lxpEnrollmentUrl: text("lxp_enrollment_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  /** Última actividad (progreso / inscripción) para ordenar “Mis programas” */
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Certificados de finalización de programas */
export const certificates = pgTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    studentName: text("student_name").notNull(),
    programTitle: text("program_title").notNull(),
    issuedAt: timestamp("issued_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("certificates_user_course_unique").on(table.userId, table.courseId),
    uniqueIndex("certificates_code_unique").on(table.code),
  ],
);

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(),
  order: integer("order").notNull(),
  difficulty: text("difficulty").notNull(),
  instructor: text("instructor").notNull(),
  /** URL de vídeo principal (primera parte; compatibilidad) */
  videoUrl: text("video_url").notNull().default(""),
  /** Grabaciones adicionales de la misma clase (Parte 1, 2, 3…) */
  videoParts: jsonb("video_parts")
    .$type<{ label: string; url: string }[]>()
    .notNull()
    .default([]),
  /** PDF / Drive de la presentación de la clase */
  presentationUrl: text("presentation_url").notNull().default(""),
  /** Carpeta Drive o enlace de descarga de recursos */
  resourcesUrl: text("resources_url").notNull().default(""),
});

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => modules.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  duration: integer("duration").notNull(),
  order: integer("order").notNull(),
});

/** Progreso por módulo (clase) en el visor /learn */
export const moduleProgress = pgTable(
  "module_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    videoProgress: integer("video_progress").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("module_progress_user_module_unique").on(table.userId, table.moduleId),
  ],
);

export const moduleComments = pgTable("module_comments", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  image: text("image").notNull(),
  linkedIn: text("linked_in"),
  github: text("github"),
  twitter: text("twitter"),
  instagram: text("instagram"),
  roleColor: text("role_color").notNull().default("blue"),
  order: integer("order").notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  courseName: text("course_name").notNull(),
  image: text("image").notNull(),
  text: text("text").notNull(),
  rating: integer("rating").notNull(),
  order: integer("order").notNull(),
});

export const allies = pgTable("allies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  image: text("image").notNull(),
  order: integer("order").notNull(),
});

export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  targetUrl: text("target_url").notNull(),
  shortCode: text("short_code").unique(),
  useShortUrl: boolean("use_short_url").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  students: text("students").notNull(),
  order: integer("order").notNull(),
});

export const presentationCards = pgTable("presentation_cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleTitle: text("role_title").notNull(),
  bio: text("bio").notNull().default(""),
  image: text("image").notNull().default(""),
  slug: text("slug").notNull().unique(),
  direction: text("direction").notNull().default("direccion-sede"),
  theme: jsonb("theme").$type<PresentationCardTheme>().notNull().default({}),
  linkedIn: text("linked_in"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  github: text("github"),
  youtube: text("youtube"),
  tiktok: text("tiktok"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  website: text("website"),
  links: jsonb("links").$type<PresentationCardLink[]>().notNull().default([]),
  assignedUserId: integer("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  isPublished: boolean("is_published").notNull().default(false),
  pinnedAt: timestamp("pinned_at"),
  viewCount: integer("view_count").notNull().default(0),
  order: integer("order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("presentation_cards_assigned_user_unique").on(table.assignedUserId),
]);

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const integrationForms = pgTable("integration_forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  schema: jsonb("schema").$type<IntegrationFormDefinition>().notNull(),
  spreadsheetId: text("spreadsheet_id"),
  spreadsheetTab: text("spreadsheet_tab").default("Respuestas"),
  isPublished: boolean("is_published").notNull().default(true),
  /** public = cualquiera con el enlace; restricted = solo cuentas listadas (+ talento/admin) */
  accessMode: text("access_mode").$type<"public" | "restricted">().notNull().default("public"),
  allowedUserIds: jsonb("allowed_user_ids").$type<number[]>().notNull().default([]),
  /** Si es true, el mismo correo puede enviar varias respuestas */
  allowMultipleSubmissions: boolean("allow_multiple_submissions").notNull().default(false),
  pinnedAt: timestamp("pinned_at"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const integrationResponses = pgTable("integration_responses", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => integrationForms.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [
  uniqueIndex("integration_responses_form_email_unique").on(table.formId, table.email),
]);

export const liveCourseRegistrations = pgTable("live_course_registrations", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number").notNull(),
  age: integer("age").notNull(),
  guardianFirstName: text("guardian_first_name"),
  guardianLastName: text("guardian_last_name"),
  guardianPhoneNumber: text("guardian_phone_number"),
  preferredModality: text("preferred_modality", { enum: ["Presencial", "Virtual"] }).notNull(),
  hasLaptop: boolean("has_laptop").notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
});

/** Configuración de recordatorios semanales a directores. */
export const emailAutomationSettings = pgTable("email_automation_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
  startDate: text("start_date").notNull().default("2026-09-14"),
  /** Hora local America/Mexico_City (0-23) para el envío semanal. */
  sendHour: integer("send_hour").notNull().default(9),
  /** 1 = lunes … 7 = domingo (ISO). */
  sendWeekday: integer("send_weekday").notNull().default(1),
  /** contacto | tec_angel */
  senderId: text("sender_id").notNull().default("contacto"),
  /** AD26 | FJ26 */
  activeSemester: text("active_semester").notNull().default("AD26"),
  calendarVersion: integer("calendar_version").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailWeekTemplates = pgTable("email_week_templates", {
  id: serial("id").primaryKey(),
  weekIndex: integer("week_index").notNull().unique(),
  label: text("label").notNull(),
  /** Fecha calendario de envío YYYY-MM-DD (zona America/Mexico_City). */
  sendDate: text("send_date"),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  bodyHtml: text("body_html").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailAutomationLogs = pgTable("email_automation_logs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // weekly | test | integration
  weekIndex: integer("week_index"),
  templateId: integer("template_id"),
  sendDate: text("send_date"),
  recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
  subject: text("subject").notNull().default(""),
  status: text("status").notNull(), // sent | error | partial
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Configuración del Reto INÉDITO (vídeo de un solo uso). */
export const ineditoRetoSettings = pgTable("inedito_reto_settings", {
  id: serial("id").primaryKey(),
  videoUrl: text("video_url").notNull().default(""),
  emailSubject: text("email_subject").notNull().default("WCA | INÉDITO — Tu acceso al Reto"),
  emailBodyText: text("email_body_text").notNull().default(""),
  emailBodyHtml: text("email_body_html").notNull().default(""),
  /** Horas de vigencia del enlace desde su creación */
  linkTtlHours: integer("link_ttl_hours").notNull().default(72),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IneditoRetoTokenStatus =
  | "pending"
  | "opened"
  | "completed"
  | "expired"
  | "revoked";

export const ineditoRetoTokens = pgTable("inedito_reto_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull().default(""),
  status: text("status").$type<IneditoRetoTokenStatus>().notNull().default("pending"),
  isTest: boolean("is_test").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  openedAt: timestamp("opened_at"),
  completedAt: timestamp("completed_at"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Visibilidad y ajustes de la landing pública /inedito */
export const ineditoLandingSettings = pgTable("inedito_landing_settings", {
  id: serial("id").primaryKey(),
  /** Si es false, solo admin y talento pueden ver /inedito */
  isEnabled: boolean("is_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Personas del organigrama oficial (Sede Monterrey y futuras sedes). */
export const orgChartPeople = pgTable("org_chart_people", {
  id: serial("id").primaryKey(),
  sedeId: text("sede_id").notNull().default("monterrey"),
  parentId: integer("parent_id"),
  directionKey: text("direction_key").notNull(),
  roleKind: text("role_kind").notNull().default("member"),
  name: text("name").notNull(),
  roleTitle: text("role_title").notNull().default(""),
  email: text("email"),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  socialLinks: jsonb("social_links").$type<{ id: string; label: string; url: string }[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  videoUrl: true,
  videoParts: true,
  presentationUrl: true,
  resourcesUrl: true,
}).extend({
  videoUrl: z.string().optional().default(""),
  videoParts: z
    .array(
      z.object({
        label: z.string(),
        url: z.string(),
      }),
    )
    .optional()
    .default([]),
  presentationUrl: z.string().optional().default(""),
  resourcesUrl: z.string().optional().default(""),
});

export const insertSectionSchema = createInsertSchema(sections).omit({
  id: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
});

export const insertAllySchema = createInsertSchema(allies).omit({
  id: true,
});

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  createdAt: true,
  shortCode: true,
});

export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
});

export const insertPresentationCardSchema = createInsertSchema(presentationCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

export const insertContactSchema = z.object({
  name: z.string().min(1, {
    message: "El nombre es requerido"
  }),
  email: z.string().email({
    message: "Por favor ingresa un correo electrónico válido"
  }),
  message: z.string().min(1, {
    message: "El mensaje es requerido"
  })
});

export const insertLiveCourseRegistrationSchema = createInsertSchema(liveCourseRegistrations).omit({
  id: true,
  registeredAt: true,
});

export const insertIntegrationFormSchema = createInsertSchema(integrationForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationResponseSchema = createInsertSchema(integrationResponses).omit({
  id: true,
  submittedAt: true,
});

export const insertEmailAutomationSettingsSchema = createInsertSchema(emailAutomationSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertEmailWeekTemplateSchema = createInsertSchema(emailWeekTemplates).omit({
  id: true,
  updatedAt: true,
});

// Types for insertion
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type InsertModule = z.input<typeof insertModuleSchema>;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type InsertAlly = z.infer<typeof insertAllySchema>;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type InsertPresentationCard = z.infer<typeof insertPresentationCardSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertLiveCourseRegistration = z.infer<typeof insertLiveCourseRegistrationSchema>;
export type InsertIntegrationForm = z.infer<typeof insertIntegrationFormSchema>;
export type InsertIntegrationResponse = z.infer<typeof insertIntegrationResponseSchema>;
export type InsertEmailAutomationSettings = z.infer<typeof insertEmailAutomationSettingsSchema>;
export type InsertEmailWeekTemplate = z.infer<typeof insertEmailWeekTemplateSchema>;

// Types for selection
export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type ModuleProgress = typeof moduleProgress.$inferSelect;
export type ModuleComment = typeof moduleComments.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type Ally = typeof allies.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type Country = typeof countries.$inferSelect;
export type PresentationCard = typeof presentationCards.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type LiveCourseRegistration = typeof liveCourseRegistrations.$inferSelect;
export type IntegrationForm = typeof integrationForms.$inferSelect;
export type IntegrationResponse = typeof integrationResponses.$inferSelect;
export type EmailAutomationSettings = typeof emailAutomationSettings.$inferSelect;
export type EmailWeekTemplate = typeof emailWeekTemplates.$inferSelect;
export type EmailAutomationLog = typeof emailAutomationLogs.$inferSelect;
export type IneditoRetoSettings = typeof ineditoRetoSettings.$inferSelect;
export type IneditoRetoToken = typeof ineditoRetoTokens.$inferSelect;
export type IneditoLandingSettings = typeof ineditoLandingSettings.$inferSelect;
export type OrgChartPerson = typeof orgChartPeople.$inferSelect;
