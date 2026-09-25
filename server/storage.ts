import { 
  InsertUser, User, 
  InsertCourse, Course, 
  InsertEnrollment, Enrollment, 
  InsertModule, Module, 
  InsertSection, Section, 
  InsertTeam, Team, 
  InsertTestimonial, Testimonial,
  InsertAlly, Ally,
  InsertQrCode, QrCode,
  InsertCountry, Country,
  InsertPresentationCard, PresentationCard,
  InsertContact, Contact,
  InsertLiveCourseRegistration, LiveCourseRegistration,
  InsertIntegrationForm, IntegrationForm,
  InsertIntegrationResponse, IntegrationResponse,
  users, courses, enrollments, modules, sections, teams, testimonials, allies, qrCodes, countries, presentationCards, contacts, liveCourseRegistrations,
  integrationForms, integrationResponses
} from "@shared/schema";
import { DEFAULT_ALLIES, DEFAULT_COUNTRIES } from "@shared/carousel-defaults";
import { DEFAULT_CARD_THEME } from "@shared/card-directions";
import type { PresentationCardLink, PresentationCardTheme } from "@shared/card-directions";
import { DEFAULT_INTEGRATION_FORM, DEFAULT_INTEGRATION_SLUG, DEFAULT_MIEMBROS_FORM, DEFAULT_MIEMBROS_SLUG, ensureMiembrosCoberturaCandidateGate, promoteSharedFieldShowIfToSections, syncOfficialCopy, type IntegrationFormDefinition } from "@shared/integration-form";
import session from "express-session";
import createMemoryStore from "memorystore";
import * as connectPgModule from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, desc, asc, and, sql } from "drizzle-orm";

const connectPg = connectPgModule.default || connectPgModule;

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;

  // Courses
  getCourse(id: number): Promise<Course | undefined>;
  getCourseBySlug(slug: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined>;
  getAllCourses(): Promise<Course[]>;
  getFeaturedCourses(): Promise<Course[]>;
  deleteCourse(id: number): Promise<boolean>;

  // Enrollments
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  getEnrollmentsByUserId(userId: number): Promise<Enrollment[]>;
  getEnrollmentByCourseAndUser(courseId: number, userId: number): Promise<Enrollment | undefined>;
  updateEnrollmentProgress(id: number, progress: number, completed: boolean): Promise<Enrollment>;
  deleteEnrollment(id: number): Promise<boolean>;
  
  // Modules
  getModulesByCourseId(courseId: number): Promise<Module[]>;
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<boolean>;

  // Sections
  getSectionsByModuleId(moduleId: number): Promise<Section[]>;
  getSection(id: number): Promise<Section | undefined>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: number, section: Partial<InsertSection>): Promise<Section | undefined>;
  deleteSection(id: number): Promise<boolean>;

  // Team
  getAllTeamMembers(): Promise<Team[]>;
  createTeamMember(team: InsertTeam): Promise<Team>;
  updateTeamMember(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;

  // Testimonials
  getAllTestimonials(): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: number, testimonial: Partial<InsertTestimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: number): Promise<boolean>;

  // Allies
  getAllAllies(): Promise<Ally[]>;
  createAlly(ally: InsertAlly): Promise<Ally>;
  updateAlly(id: number, ally: Partial<InsertAlly>): Promise<Ally | undefined>;
  deleteAlly(id: number): Promise<boolean>;

  // QR codes
  getAllQrCodes(): Promise<QrCode[]>;
  createQrCode(qr: InsertQrCode): Promise<QrCode>;
  updateQrCode(id: number, qr: Partial<InsertQrCode>): Promise<QrCode | undefined>;
  deleteQrCode(id: number): Promise<boolean>;

  // Countries
  getAllCountries(): Promise<Country[]>;
  createCountry(country: InsertCountry): Promise<Country>;
  updateCountry(id: number, country: Partial<InsertCountry>): Promise<Country | undefined>;
  deleteCountry(id: number): Promise<boolean>;

  // Presentation cards
  getAllPresentationCards(): Promise<PresentationCard[]>;
  getPresentationCard(id: number): Promise<PresentationCard | undefined>;
  getPresentationCardBySlug(slug: string): Promise<PresentationCard | undefined>;
  getPresentationCardByUserId(userId: number): Promise<PresentationCard | undefined>;
  createPresentationCard(card: InsertPresentationCard): Promise<PresentationCard>;
  updatePresentationCard(id: number, card: Partial<InsertPresentationCard>): Promise<PresentationCard | undefined>;
  deletePresentationCard(id: number): Promise<boolean>;
  incrementPresentationCardViews(id: number): Promise<void>;
  getUsersBasic(): Promise<Array<{ id: number; name: string; email: string }>>;

  // Contacts
  createContact(contact: InsertContact): Promise<Contact>;
  getAllContacts(): Promise<Contact[]>;

  // Live Course Registrations
  createLiveCourseRegistration(registration: InsertLiveCourseRegistration): Promise<LiveCourseRegistration>;
  getLiveCourseRegistrationsByUserIdAndCourseId(userId: number, courseId: number): Promise<LiveCourseRegistration[]>;

  getOrCreateDefaultIntegrationForm(): Promise<IntegrationForm>;
  getOrCreateMiembrosForm(): Promise<IntegrationForm>;
  listIntegrationForms(): Promise<Array<IntegrationForm & { responseCount: number }>>;
  createIntegrationForm(data: InsertIntegrationForm): Promise<IntegrationForm>;
  getIntegrationFormById(id: number): Promise<IntegrationForm | undefined>;
  getIntegrationFormBySlug(slug: string): Promise<IntegrationForm | undefined>;
  updateIntegrationForm(id: number, data: Partial<InsertIntegrationForm>): Promise<IntegrationForm | undefined>;
  deleteIntegrationForm(id: number): Promise<boolean>;
  incrementIntegrationFormViews(id: number): Promise<void>;
  getIntegrationResponses(formId: number, search?: string): Promise<IntegrationResponse[]>;
  getIntegrationResponseByEmail(formId: number, email: string): Promise<IntegrationResponse | undefined>;
  getIntegrationResponseById(id: number): Promise<IntegrationResponse | undefined>;
  createIntegrationResponse(response: InsertIntegrationResponse): Promise<IntegrationResponse>;
  updateIntegrationResponse(
    id: number,
    data: { email?: string; answers: Record<string, unknown> },
  ): Promise<IntegrationResponse | undefined>;

  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private courses: Map<number, Course>;
  private enrollments: Map<number, Enrollment>;
  private modules: Map<number, Module>;
  private sections: Map<number, Section>;
  private teams: Map<number, Team>;
  private testimonials: Map<number, Testimonial>;
  private allies: Map<number, Ally>;
  private qrCodes: Map<number, QrCode>;
  private countries: Map<number, Country>;
  private presentationCards: Map<number, PresentationCard>;
  private contacts: Map<number, Contact>;
  private liveCourseRegistrations: Map<number, LiveCourseRegistration>;
  private integrationForms: Map<number, IntegrationForm>;
  private integrationResponses: Map<number, IntegrationResponse>;
  
  private currentUserIds: number;
  private currentCourseIds: number;
  private currentEnrollmentIds: number;
  private currentModuleIds: number;
  private currentSectionIds: number;
  private currentTeamIds: number;
  private currentTestimonialIds: number;
  private currentAllyIds: number;
  private currentQrCodeIds: number;
  private currentCountryIds: number;
  private currentPresentationCardIds: number;
  private currentContactIds: number;
  private currentLiveCourseRegistrationIds: number;
  private currentIntegrationFormIds: number;
  private currentIntegrationResponseIds: number;

  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.enrollments = new Map();
    this.modules = new Map();
    this.sections = new Map();
    this.teams = new Map();
    this.testimonials = new Map();
    this.allies = new Map();
    this.qrCodes = new Map();
    this.countries = new Map();
    this.presentationCards = new Map();
    this.contacts = new Map();
    this.liveCourseRegistrations = new Map();
    this.integrationForms = new Map();
    this.integrationResponses = new Map();
    
    this.currentUserIds = 1;
    this.currentCourseIds = 1;
    this.currentEnrollmentIds = 1;
    this.currentModuleIds = 1;
    this.currentSectionIds = 1;
    this.currentTeamIds = 1;
    this.currentTestimonialIds = 1;
    this.currentAllyIds = 1;
    this.currentQrCodeIds = 1;
    this.currentCountryIds = 1;
    this.currentPresentationCardIds = 1;
    this.currentContactIds = 1;
    this.currentLiveCourseRegistrationIds = 1;
    this.currentIntegrationFormIds = 1;
    this.currentIntegrationResponseIds = 1;

    for (const item of DEFAULT_ALLIES) {
      const id = this.currentAllyIds++;
      this.allies.set(id, { id, name: item.name, image: item.image, order: item.order });
    }
    for (const item of DEFAULT_COUNTRIES) {
      const id = this.currentCountryIds++;
      this.countries.set(id, {
        id,
        name: item.name,
        code: item.code,
        students: item.students,
        order: item.order,
      });
    }

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserIds++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
      role: insertUser.role || 'student',
      profileImage: insertUser.profileImage || null,
      bio: insertUser.bio || null
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { 
      ...user, 
      ...userUpdate 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    if (!this.users.has(id)) {
      return false;
    }
    return this.users.delete(id);
  }

  // Courses
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getCourseBySlug(slug: string): Promise<Course | undefined> {
    return Array.from(this.courses.values()).find(
      (course) => course.slug === slug,
    );
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = this.currentCourseIds++;
    const course: Course = { 
      ...insertCourse, 
      id,
      createdAt: new Date(),
      featured: insertCourse.featured ?? null,
      popular: insertCourse.popular ?? null,
      new: insertCourse.new ?? null,
      isLive: insertCourse.isLive ?? null,
      liveDetails: insertCourse.liveDetails ?? null
    };
    this.courses.set(id, course);
    return course;
  }

  async getAllCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async getFeaturedCourses(): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(
      (course) => course.featured
    );
  }

  async updateCourse(id: number, courseUpdate: Partial<InsertCourse>): Promise<Course | undefined> {
    const course = this.courses.get(id);
    if (!course) {
      return undefined;
    }
    
    const updatedCourse: Course = { 
      ...course, 
      ...courseUpdate 
    };
    
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }
  
  async deleteCourse(id: number): Promise<boolean> {
    if (!this.courses.has(id)) {
      return false;
    }
    return this.courses.delete(id);
  }

  // Enrollments
  async createEnrollment(insertEnrollment: InsertEnrollment): Promise<Enrollment> {
    const id = this.currentEnrollmentIds++;
    const now = new Date();
    const enrollment: Enrollment = { 
      ...insertEnrollment, 
      id,
      createdAt: now,
      updatedAt: now,
      progress: insertEnrollment.progress || 0,
      completed: insertEnrollment.completed || false
    };
    this.enrollments.set(id, enrollment);
    return enrollment;
  }

  async getEnrollmentsByUserId(userId: number): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values())
      .filter((enrollment) => enrollment.userId === userId)
      .sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
  }

  async getEnrollmentByCourseAndUser(courseId: number, userId: number): Promise<Enrollment | undefined> {
    return Array.from(this.enrollments.values()).find(
      (enrollment) => enrollment.courseId === courseId && enrollment.userId === userId
    );
  }

  async updateEnrollmentProgress(id: number, progress: number, completed: boolean): Promise<Enrollment> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) {
      throw new Error(`Enrollment with id ${id} not found`);
    }
    const updatedEnrollment = {
      ...enrollment,
      progress,
      completed,
      updatedAt: new Date(),
    };
    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    if (!this.enrollments.has(id)) {
      return false;
    }
    return this.enrollments.delete(id);
  }

  // Modules
  async getModulesByCourseId(courseId: number): Promise<Module[]> {
    return Array.from(this.modules.values())
      .filter((module) => module.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  }

  async getModule(id: number): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const id = this.currentModuleIds++;
    const module: Module = {
      ...insertModule,
      videoUrl: insertModule.videoUrl ?? "",
      videoParts: insertModule.videoParts ?? [],
      presentationUrl: insertModule.presentationUrl ?? "",
      resourcesUrl: insertModule.resourcesUrl ?? "",
      id,
    };
    this.modules.set(id, module);
    return module;
  }

  async updateModule(id: number, moduleUpdate: Partial<InsertModule>): Promise<Module | undefined> {
    const module = this.modules.get(id);
    if (!module) {
      return undefined;
    }
    
    const updatedModule: Module = { 
      ...module, 
      ...moduleUpdate 
    };
    
    this.modules.set(id, updatedModule);
    return updatedModule;
  }
  
  async deleteModule(id: number): Promise<boolean> {
    if (!this.modules.has(id)) {
      return false;
    }
    return this.modules.delete(id);
  }

  // Sections
  async getSectionsByModuleId(moduleId: number): Promise<Section[]> {
    return Array.from(this.sections.values())
      .filter((section) => section.moduleId === moduleId)
      .sort((a, b) => a.order - b.order);
  }

  async getSection(id: number): Promise<Section | undefined> {
    return this.sections.get(id);
  }

  async createSection(insertSection: InsertSection): Promise<Section> {
    const id = this.currentSectionIds++;
    const section: Section = { ...insertSection, id };
    this.sections.set(id, section);
    return section;
  }
  
  async updateSection(id: number, sectionUpdate: Partial<InsertSection>): Promise<Section | undefined> {
    const section = this.sections.get(id);
    if (!section) {
      return undefined;
    }
    
    const updatedSection: Section = { 
      ...section, 
      ...sectionUpdate 
    };
    
    this.sections.set(id, updatedSection);
    return updatedSection;
  }

  async deleteSection(id: number): Promise<boolean> {
    if (!this.sections.has(id)) {
      return false;
    }
    return this.sections.delete(id);
  }

  // Team
  async getAllTeamMembers(): Promise<Team[]> {
    return Array.from(this.teams.values())
      .sort((a, b) => a.order - b.order);
  }

  async createTeamMember(insertTeam: InsertTeam): Promise<Team> {
    const id = this.currentTeamIds++;
    const team: Team = { 
      ...insertTeam, 
      id,
      linkedIn: insertTeam.linkedIn || null,
      github: insertTeam.github || null,
      twitter: insertTeam.twitter || null,
      instagram: insertTeam.instagram || null,
      roleColor: insertTeam.roleColor || "blue",
    };
    this.teams.set(id, team);
    return team;
  }
  
  async updateTeamMember(id: number, teamUpdate: Partial<InsertTeam>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) {
      return undefined;
    }
    
    const updatedTeam: Team = { 
      ...team, 
      ...teamUpdate 
    };
    
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }
  
  async deleteTeamMember(id: number): Promise<boolean> {
    if (!this.teams.has(id)) {
      return false;
    }
    return this.teams.delete(id);
  }

  // Testimonials
  async getAllTestimonials(): Promise<Testimonial[]> {
    return Array.from(this.testimonials.values());
  }

  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const id = this.currentTestimonialIds++;
    const testimonial: Testimonial = { ...insertTestimonial, id };
    this.testimonials.set(id, testimonial);
    return testimonial;
  }
  
  async updateTestimonial(id: number, testimonialUpdate: Partial<InsertTestimonial>): Promise<Testimonial | undefined> {
    const testimonial = this.testimonials.get(id);
    if (!testimonial) {
      return undefined;
    }
    
    const updatedTestimonial: Testimonial = { 
      ...testimonial, 
      ...testimonialUpdate 
    };
    
    this.testimonials.set(id, updatedTestimonial);
    return updatedTestimonial;
  }
  
  async deleteTestimonial(id: number): Promise<boolean> {
    if (!this.testimonials.has(id)) {
      return false;
    }
    return this.testimonials.delete(id);
  }

  // Allies
  async getAllAllies(): Promise<Ally[]> {
    return Array.from(this.allies.values()).sort((a, b) => a.order - b.order);
  }

  async createAlly(insertAlly: InsertAlly): Promise<Ally> {
    const id = this.currentAllyIds++;
    const ally: Ally = {
      id,
      name: insertAlly.name || "",
      image: insertAlly.image,
      order: insertAlly.order,
    };
    this.allies.set(id, ally);
    return ally;
  }

  async updateAlly(id: number, allyUpdate: Partial<InsertAlly>): Promise<Ally | undefined> {
    const ally = this.allies.get(id);
    if (!ally) return undefined;
    const updated: Ally = { ...ally, ...allyUpdate };
    this.allies.set(id, updated);
    return updated;
  }

  async deleteAlly(id: number): Promise<boolean> {
    if (!this.allies.has(id)) return false;
    return this.allies.delete(id);
  }

  // QR codes
  async getAllQrCodes(): Promise<QrCode[]> {
    return Array.from(this.qrCodes.values()).sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }

  async createQrCode(insertQr: InsertQrCode): Promise<QrCode> {
    const id = this.currentQrCodeIds++;
    const qr: QrCode = {
      id,
      name: insertQr.name || "",
      targetUrl: insertQr.targetUrl,
      createdAt: new Date(),
    };
    this.qrCodes.set(id, qr);
    return qr;
  }

  async updateQrCode(id: number, qrUpdate: Partial<InsertQrCode>): Promise<QrCode | undefined> {
    const qr = this.qrCodes.get(id);
    if (!qr) return undefined;
    const updated: QrCode = { ...qr, ...qrUpdate };
    this.qrCodes.set(id, updated);
    return updated;
  }

  async deleteQrCode(id: number): Promise<boolean> {
    if (!this.qrCodes.has(id)) return false;
    return this.qrCodes.delete(id);
  }

  // Countries
  async getAllCountries(): Promise<Country[]> {
    return Array.from(this.countries.values()).sort((a, b) => a.order - b.order);
  }

  async createCountry(insertCountry: InsertCountry): Promise<Country> {
    const id = this.currentCountryIds++;
    const country: Country = {
      id,
      name: insertCountry.name,
      code: insertCountry.code.toLowerCase(),
      students: insertCountry.students,
      order: insertCountry.order,
    };
    this.countries.set(id, country);
    return country;
  }

  async updateCountry(id: number, countryUpdate: Partial<InsertCountry>): Promise<Country | undefined> {
    const country = this.countries.get(id);
    if (!country) return undefined;
    const updated: Country = {
      ...country,
      ...countryUpdate,
      code: countryUpdate.code ? countryUpdate.code.toLowerCase() : country.code,
    };
    this.countries.set(id, updated);
    return updated;
  }

  async deleteCountry(id: number): Promise<boolean> {
    if (!this.countries.has(id)) return false;
    return this.countries.delete(id);
  }

  // Presentation cards
  async getAllPresentationCards(): Promise<PresentationCard[]> {
    return Array.from(this.presentationCards.values()).sort((a, b) => a.order - b.order);
  }

  async getPresentationCard(id: number): Promise<PresentationCard | undefined> {
    return this.presentationCards.get(id);
  }

  async getPresentationCardBySlug(slug: string): Promise<PresentationCard | undefined> {
    return Array.from(this.presentationCards.values()).find((c) => c.slug === slug);
  }

  async getPresentationCardByUserId(userId: number): Promise<PresentationCard | undefined> {
    return Array.from(this.presentationCards.values()).find((c) => c.assignedUserId === userId);
  }

  async createPresentationCard(insertCard: InsertPresentationCard): Promise<PresentationCard> {
    const id = this.currentPresentationCardIds++;
    const card: PresentationCard = {
      id,
      name: insertCard.name,
      roleTitle: insertCard.roleTitle,
      bio: insertCard.bio ?? "",
      image: insertCard.image ?? "",
      slug: insertCard.slug,
      direction: insertCard.direction ?? "direccion-sede",
      theme: (insertCard.theme as PresentationCardTheme) ?? { ...DEFAULT_CARD_THEME },
      linkedIn: insertCard.linkedIn ?? null,
      instagram: insertCard.instagram ?? null,
      twitter: insertCard.twitter ?? null,
      github: insertCard.github ?? null,
      youtube: insertCard.youtube ?? null,
      tiktok: insertCard.tiktok ?? null,
      whatsapp: insertCard.whatsapp ?? null,
      email: insertCard.email ?? null,
      website: insertCard.website ?? null,
      links: (insertCard.links as PresentationCardLink[]) ?? [],
      assignedUserId: insertCard.assignedUserId ?? null,
      isPublished: insertCard.isPublished ?? false,
      pinnedAt: insertCard.pinnedAt ?? null,
      viewCount: 0,
      order: insertCard.order ?? 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.presentationCards.set(id, card);
    return card;
  }

  async updatePresentationCard(
    id: number,
    cardUpdate: Partial<InsertPresentationCard>,
  ): Promise<PresentationCard | undefined> {
    const card = this.presentationCards.get(id);
    if (!card) return undefined;
    const updated: PresentationCard = {
      ...card,
      ...cardUpdate,
      theme: (cardUpdate.theme as PresentationCardTheme | undefined) ?? card.theme,
      links: (cardUpdate.links as PresentationCardLink[] | undefined) ?? card.links,
      updatedAt: new Date(),
    };
    this.presentationCards.set(id, updated);
    return updated;
  }

  async deletePresentationCard(id: number): Promise<boolean> {
    if (!this.presentationCards.has(id)) return false;
    return this.presentationCards.delete(id);
  }

  async incrementPresentationCardViews(id: number): Promise<void> {
    const card = this.presentationCards.get(id);
    if (!card) return;
    this.presentationCards.set(id, { ...card, viewCount: card.viewCount + 1 });
  }

  async getUsersBasic(): Promise<Array<{ id: number; name: string; email: string }>> {
    return Array.from(this.users.values()).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));
  }

  // Contacts
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactIds++;
    const contact: Contact = { 
      ...insertContact, 
      id,
      createdAt: new Date()
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  // Live Course Registrations
  async createLiveCourseRegistration(insertRegistration: InsertLiveCourseRegistration): Promise<LiveCourseRegistration> {
    const id = this.currentLiveCourseRegistrationIds++;
    const registration: LiveCourseRegistration = { 
      ...insertRegistration, 
      id, 
      registeredAt: new Date()
    };
    this.liveCourseRegistrations.set(id, registration);
    return registration;
  }

  async getLiveCourseRegistrationsByUserIdAndCourseId(userId: number, courseId: number): Promise<LiveCourseRegistration[]> {
    return Array.from(this.liveCourseRegistrations.values()).filter(
      (reg) => reg.userId === userId && reg.courseId === courseId
    );
  }

  async getOrCreateDefaultIntegrationForm(): Promise<IntegrationForm> {
    const existing = Array.from(this.integrationForms.values()).find(
      (form) => form.slug === DEFAULT_INTEGRATION_SLUG,
    );
    if (existing) return existing;
    const id = this.currentIntegrationFormIds++;
    const form: IntegrationForm = {
      id,
      title: DEFAULT_INTEGRATION_FORM.title,
      slug: DEFAULT_INTEGRATION_SLUG,
      schema: DEFAULT_INTEGRATION_FORM,
      spreadsheetId: null,
      spreadsheetTab: "Respuestas",
      isPublished: true,
      accessMode: "public",
      allowedUserIds: [],
      allowMultipleSubmissions: false,
      pinnedAt: null,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.integrationForms.set(id, form);
    return form;
  }

  async getOrCreateMiembrosForm(): Promise<IntegrationForm> {
    const existing = Array.from(this.integrationForms.values()).find(
      (form) => form.slug === DEFAULT_MIEMBROS_SLUG,
    );
    if (existing) {
      const current = (existing.schema ?? DEFAULT_MIEMBROS_FORM) as IntegrationFormDefinition;
      const patched = promoteSharedFieldShowIfToSections(
        ensureMiembrosCoberturaCandidateGate(current),
      );
      if (JSON.stringify(current) !== JSON.stringify(patched)) {
        const updated: IntegrationForm = {
          ...existing,
          schema: patched,
          updatedAt: new Date(),
        };
        this.integrationForms.set(existing.id, updated);
        return updated;
      }
      return existing;
    }
    const id = this.currentIntegrationFormIds++;
    const form: IntegrationForm = {
      id,
      title: DEFAULT_MIEMBROS_FORM.title,
      slug: DEFAULT_MIEMBROS_SLUG,
      schema: DEFAULT_MIEMBROS_FORM,
      spreadsheetId: null,
      spreadsheetTab: "Respuestas",
      isPublished: true,
      accessMode: "public",
      allowedUserIds: [],
      allowMultipleSubmissions: true,
      pinnedAt: null,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.integrationForms.set(id, form);
    return form;
  }

  async listIntegrationForms(): Promise<Array<IntegrationForm & { responseCount: number }>> {
    const forms = Array.from(this.integrationForms.values());
    forms.sort((a, b) => {
      const ap = a.pinnedAt?.getTime() ?? 0;
      const bp = b.pinnedAt?.getTime() ?? 0;
      if (ap !== bp) return bp - ap;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });
    return forms.map((form) => ({
      ...form,
      responseCount: Array.from(this.integrationResponses.values()).filter((r) => r.formId === form.id).length,
    }));
  }

  async createIntegrationForm(data: InsertIntegrationForm): Promise<IntegrationForm> {
    const id = this.currentIntegrationFormIds++;
    const form: IntegrationForm = {
      id,
      title: data.title,
      slug: data.slug,
      schema: data.schema,
      spreadsheetId: data.spreadsheetId ?? null,
      spreadsheetTab: data.spreadsheetTab ?? "Respuestas",
      isPublished: data.isPublished ?? true,
      accessMode: data.accessMode ?? "public",
      allowedUserIds: data.allowedUserIds ?? [],
      allowMultipleSubmissions: data.allowMultipleSubmissions ?? false,
      pinnedAt: data.pinnedAt ?? null,
      viewCount: data.viewCount ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.integrationForms.set(id, form);
    return form;
  }

  async getIntegrationFormById(id: number): Promise<IntegrationForm | undefined> {
    return this.integrationForms.get(id);
  }

  async getIntegrationFormBySlug(slug: string): Promise<IntegrationForm | undefined> {
    return Array.from(this.integrationForms.values()).find((form) => form.slug === slug);
  }

  async updateIntegrationForm(id: number, data: Partial<InsertIntegrationForm>): Promise<IntegrationForm | undefined> {
    const form = this.integrationForms.get(id);
    if (!form) return undefined;
    const updated: IntegrationForm = { ...form, ...data, updatedAt: new Date() };
    this.integrationForms.set(id, updated);
    return updated;
  }

  async deleteIntegrationForm(id: number): Promise<boolean> {
    const form = this.integrationForms.get(id);
    if (!form || form.slug === DEFAULT_INTEGRATION_SLUG || form.slug === DEFAULT_MIEMBROS_SLUG) return false;
    Array.from(this.integrationResponses.entries()).forEach(([rid, response]) => {
      if (response.formId === id) this.integrationResponses.delete(rid);
    });
    return this.integrationForms.delete(id);
  }

  async incrementIntegrationFormViews(id: number): Promise<void> {
    const form = this.integrationForms.get(id);
    if (!form) return;
    this.integrationForms.set(id, { ...form, viewCount: (form.viewCount ?? 0) + 1 });
  }

  async getIntegrationResponses(formId: number, search?: string): Promise<IntegrationResponse[]> {
    const query = search?.toLowerCase().trim();
    return Array.from(this.integrationResponses.values())
      .filter((item) => item.formId === formId)
      .filter((item) => !query || item.email.toLowerCase().includes(query) || JSON.stringify(item.answers).toLowerCase().includes(query))
      .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
  }

  async getIntegrationResponseByEmail(formId: number, email: string): Promise<IntegrationResponse | undefined> {
    return Array.from(this.integrationResponses.values()).find(
      (item) => item.formId === formId && item.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createIntegrationResponse(response: InsertIntegrationResponse): Promise<IntegrationResponse> {
    const id = this.currentIntegrationResponseIds++;
    const created: IntegrationResponse = {
      ...response,
      id,
      submittedAt: new Date(),
    };
    this.integrationResponses.set(id, created);
    return created;
  }

  async getIntegrationResponseById(id: number): Promise<IntegrationResponse | undefined> {
    return this.integrationResponses.get(id);
  }

  async updateIntegrationResponse(
    id: number,
    data: { email?: string; answers: Record<string, unknown> },
  ): Promise<IntegrationResponse | undefined> {
    const existing = this.integrationResponses.get(id);
    if (!existing) return undefined;
    const updated: IntegrationResponse = {
      ...existing,
      email: data.email ?? existing.email,
      answers: data.answers,
    };
    this.integrationResponses.set(id, updated);
    return updated;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Courses
  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id));
    return course;
  }

  async getCourseBySlug(slug: string): Promise<Course | undefined> {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.slug, slug));
    return course;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values({ ...insertCourse, createdAt: new Date() })
      .returning();
    return course;
  }

  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async getFeaturedCourses(): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.featured, true));
  }
  
  async updateCourse(id: number, courseUpdate: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set(courseUpdate)
      .where(eq(courses.id, id))
      .returning();
      
    return course;
  }
  
  async deleteCourse(id: number): Promise<boolean> {
    const result = await db
      .delete(courses)
      .where(eq(courses.id, id))
      .returning();
    return result.length > 0;
  }

  // Enrollments
  async createEnrollment(insertEnrollment: InsertEnrollment): Promise<Enrollment> {
    const now = new Date();
    const [enrollment] = await db
      .insert(enrollments)
      .values({ ...insertEnrollment, createdAt: now, updatedAt: now })
      .returning();
    return enrollment;
  }

  async getEnrollmentsByUserId(userId: number): Promise<Enrollment[]> {
    return await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.updatedAt), desc(enrollments.createdAt));
  }

  async getEnrollmentByCourseAndUser(courseId: number, userId: number): Promise<Enrollment | undefined> {
    const enrollmentResults = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));
    
    const filtered = enrollmentResults.filter(
      enrollment => enrollment.userId === userId
    );
    
    return filtered.length > 0 ? filtered[0] : undefined;
  }

  async updateEnrollmentProgress(id: number, progress: number, completed: boolean): Promise<Enrollment> {
    const [enrollment] = await db
      .update(enrollments)
      .set({ progress, completed, updatedAt: new Date() })
      .where(eq(enrollments.id, id))
      .returning();
    
    if (!enrollment) {
      throw new Error(`Enrollment with id ${id} not found`);
    }
    
    return enrollment;
  }
  
  async deleteEnrollment(id: number): Promise<boolean> {
    const result = await db
      .delete(enrollments)
      .where(eq(enrollments.id, id))
      .returning();
    return result.length > 0;
  }

  // Modules
  async getModulesByCourseId(courseId: number): Promise<Module[]> {
    return await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.order));
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id));
    return module;
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const [module] = await db
      .insert(modules)
      .values({
        ...insertModule,
        videoUrl: insertModule.videoUrl ?? "",
        videoParts: insertModule.videoParts ?? [],
        presentationUrl: insertModule.presentationUrl ?? "",
        resourcesUrl: insertModule.resourcesUrl ?? "",
      })
      .returning();
    return module;
  }
  
  async updateModule(id: number, moduleUpdate: Partial<InsertModule>): Promise<Module | undefined> {
    const [module] = await db
      .update(modules)
      .set(moduleUpdate)
      .where(eq(modules.id, id))
      .returning();
      
    return module;
  }
  
  async deleteModule(id: number): Promise<boolean> {
    const result = await db
      .delete(modules)
      .where(eq(modules.id, id))
      .returning();
    return result.length > 0;
  }

  // Sections
  async getSectionsByModuleId(moduleId: number): Promise<Section[]> {
    return await db
      .select()
      .from(sections)
      .where(eq(sections.moduleId, moduleId))
      .orderBy(asc(sections.order));
  }

  async getSection(id: number): Promise<Section | undefined> {
    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, id));
    return section;
  }

  async createSection(insertSection: InsertSection): Promise<Section> {
    const [section] = await db
      .insert(sections)
      .values(insertSection)
      .returning();
    return section;
  }
  
  async updateSection(id: number, sectionUpdate: Partial<InsertSection>): Promise<Section | undefined> {
    const [section] = await db
      .update(sections)
      .set(sectionUpdate)
      .where(eq(sections.id, id))
      .returning();
      
    return section;
  }
  
  async deleteSection(id: number): Promise<boolean> {
    const result = await db
      .delete(sections)
      .where(eq(sections.id, id))
      .returning();
    return result.length > 0;
  }

  // Team
  async getAllTeamMembers(): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .orderBy(asc(teams.order));
  }

  async createTeamMember(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(insertTeam)
      .returning();
    return team;
  }
  
  async updateTeamMember(id: number, teamUpdate: Partial<InsertTeam>): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set(teamUpdate)
      .where(eq(teams.id, id))
      .returning();
      
    return team;
  }
  
  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await db
      .delete(teams)
      .where(eq(teams.id, id))
      .returning();
    return result.length > 0;
  }

  // Testimonials
  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials);
  }

  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db
      .insert(testimonials)
      .values(insertTestimonial)
      .returning();
    return testimonial;
  }
  
  async updateTestimonial(id: number, testimonialUpdate: Partial<InsertTestimonial>): Promise<Testimonial | undefined> {
    const [testimonial] = await db
      .update(testimonials)
      .set(testimonialUpdate)
      .where(eq(testimonials.id, id))
      .returning();
      
    return testimonial;
  }
  
  async deleteTestimonial(id: number): Promise<boolean> {
    const result = await db
      .delete(testimonials)
      .where(eq(testimonials.id, id))
      .returning();
    return result.length > 0;
  }

  // Allies
  async getAllAllies(): Promise<Ally[]> {
    return await db.select().from(allies).orderBy(asc(allies.order));
  }

  async createAlly(insertAlly: InsertAlly): Promise<Ally> {
    const [ally] = await db.insert(allies).values(insertAlly).returning();
    return ally;
  }

  async updateAlly(id: number, allyUpdate: Partial<InsertAlly>): Promise<Ally | undefined> {
    const [ally] = await db
      .update(allies)
      .set(allyUpdate)
      .where(eq(allies.id, id))
      .returning();
    return ally;
  }

  async deleteAlly(id: number): Promise<boolean> {
    const result = await db.delete(allies).where(eq(allies.id, id)).returning();
    return result.length > 0;
  }

  // QR codes
  async getAllQrCodes(): Promise<QrCode[]> {
    return await db.select().from(qrCodes).orderBy(desc(qrCodes.createdAt));
  }

  async createQrCode(insertQr: InsertQrCode): Promise<QrCode> {
    const [qr] = await db.insert(qrCodes).values(insertQr).returning();
    return qr;
  }

  async updateQrCode(id: number, qrUpdate: Partial<InsertQrCode>): Promise<QrCode | undefined> {
    const [qr] = await db
      .update(qrCodes)
      .set(qrUpdate)
      .where(eq(qrCodes.id, id))
      .returning();
    return qr;
  }

  async deleteQrCode(id: number): Promise<boolean> {
    const result = await db.delete(qrCodes).where(eq(qrCodes.id, id)).returning();
    return result.length > 0;
  }

  // Countries
  async getAllCountries(): Promise<Country[]> {
    return await db.select().from(countries).orderBy(asc(countries.order));
  }

  async createCountry(insertCountry: InsertCountry): Promise<Country> {
    const [country] = await db
      .insert(countries)
      .values({
        ...insertCountry,
        code: insertCountry.code.toLowerCase(),
      })
      .returning();
    return country;
  }

  async updateCountry(id: number, countryUpdate: Partial<InsertCountry>): Promise<Country | undefined> {
    const payload = {
      ...countryUpdate,
      ...(countryUpdate.code ? { code: countryUpdate.code.toLowerCase() } : {}),
    };
    const [country] = await db
      .update(countries)
      .set(payload)
      .where(eq(countries.id, id))
      .returning();
    return country;
  }

  async deleteCountry(id: number): Promise<boolean> {
    const result = await db.delete(countries).where(eq(countries.id, id)).returning();
    return result.length > 0;
  }

  // Presentation cards
  async getAllPresentationCards(): Promise<PresentationCard[]> {
    return await db.select().from(presentationCards).orderBy(asc(presentationCards.order));
  }

  async getPresentationCard(id: number): Promise<PresentationCard | undefined> {
    const [card] = await db
      .select()
      .from(presentationCards)
      .where(eq(presentationCards.id, id))
      .limit(1);
    return card;
  }

  async getPresentationCardBySlug(slug: string): Promise<PresentationCard | undefined> {
    const [card] = await db
      .select()
      .from(presentationCards)
      .where(eq(presentationCards.slug, slug))
      .limit(1);
    return card;
  }

  async getPresentationCardByUserId(userId: number): Promise<PresentationCard | undefined> {
    const [card] = await db
      .select()
      .from(presentationCards)
      .where(eq(presentationCards.assignedUserId, userId))
      .limit(1);
    return card;
  }

  async createPresentationCard(insertCard: InsertPresentationCard): Promise<PresentationCard> {
    const [card] = await db
      .insert(presentationCards)
      .values({
        ...insertCard,
        theme: insertCard.theme ?? { ...DEFAULT_CARD_THEME },
        links: insertCard.links ?? [],
        updatedAt: new Date(),
      })
      .returning();
    return card;
  }

  async updatePresentationCard(
    id: number,
    cardUpdate: Partial<InsertPresentationCard>,
  ): Promise<PresentationCard | undefined> {
    const [card] = await db
      .update(presentationCards)
      .set({ ...cardUpdate, updatedAt: new Date() })
      .where(eq(presentationCards.id, id))
      .returning();
    return card;
  }

  async deletePresentationCard(id: number): Promise<boolean> {
    const result = await db
      .delete(presentationCards)
      .where(eq(presentationCards.id, id))
      .returning();
    return result.length > 0;
  }

  async incrementPresentationCardViews(id: number): Promise<void> {
    await db
      .update(presentationCards)
      .set({ viewCount: sql`${presentationCards.viewCount} + 1` })
      .where(eq(presentationCards.id, id));
  }

  async getUsersBasic(): Promise<Array<{ id: number; name: string; email: string }>> {
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .orderBy(asc(users.name));
    return rows;
  }

  // Contacts
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values({ ...insertContact, createdAt: new Date() })
      .returning();
    return contact;
  }

  async getAllContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  // Live Course Registrations
  async createLiveCourseRegistration(insertRegistration: InsertLiveCourseRegistration): Promise<LiveCourseRegistration> {
    const [registration] = await db.insert(liveCourseRegistrations).values(insertRegistration).returning();
    if (!registration) {
      throw new Error("Failed to create live course registration");
    }
    return registration;
  }

  async getLiveCourseRegistrationsByUserIdAndCourseId(userId: number, courseId: number): Promise<LiveCourseRegistration[]> {
    const regs = await db.select().from(liveCourseRegistrations)
      .where(and(eq(liveCourseRegistrations.userId, userId), eq(liveCourseRegistrations.courseId, courseId)))
      .execute();
    return regs;
  }

  async getOrCreateDefaultIntegrationForm(): Promise<IntegrationForm> {
    const [existing] = await db
      .select()
      .from(integrationForms)
      .where(eq(integrationForms.slug, DEFAULT_INTEGRATION_SLUG))
      .limit(1);
    if (existing) {
      const current = existing.schema;
      const synced = syncOfficialCopy(current);
      if (JSON.stringify(current) !== JSON.stringify(synced)) {
        const [updated] = await db
          .update(integrationForms)
          .set({ schema: synced, updatedAt: new Date() })
          .where(eq(integrationForms.id, existing.id))
          .returning();
        return updated ?? { ...existing, schema: synced };
      }
      return existing;
    }
    const [created] = await db.insert(integrationForms).values({
      title: DEFAULT_INTEGRATION_FORM.title,
      slug: DEFAULT_INTEGRATION_SLUG,
      schema: DEFAULT_INTEGRATION_FORM,
      isPublished: true,
      accessMode: "public",
      allowedUserIds: [],
      allowMultipleSubmissions: false,
      spreadsheetTab: "Respuestas",
      viewCount: 0,
    }).returning();
    return created!;
  }

  async getOrCreateMiembrosForm(): Promise<IntegrationForm> {
    const [existing] = await db
      .select()
      .from(integrationForms)
      .where(eq(integrationForms.slug, DEFAULT_MIEMBROS_SLUG))
      .limit(1);
    if (existing) {
      const current = (existing.schema ?? DEFAULT_MIEMBROS_FORM) as IntegrationFormDefinition;
      const patched = promoteSharedFieldShowIfToSections(
        ensureMiembrosCoberturaCandidateGate(current),
      );
      if (JSON.stringify(current) !== JSON.stringify(patched)) {
        const [updated] = await db
          .update(integrationForms)
          .set({ schema: patched, updatedAt: new Date() })
          .where(eq(integrationForms.id, existing.id))
          .returning();
        return updated ?? { ...existing, schema: patched };
      }
      return existing;
    }

    const [created] = await db.insert(integrationForms).values({
      title: DEFAULT_MIEMBROS_FORM.title,
      slug: DEFAULT_MIEMBROS_SLUG,
      schema: DEFAULT_MIEMBROS_FORM,
      isPublished: true,
      accessMode: "public",
      allowedUserIds: [],
      allowMultipleSubmissions: true,
      spreadsheetTab: "Respuestas",
      viewCount: 0,
    }).returning();
    return created!;
  }

  async listIntegrationForms(): Promise<Array<IntegrationForm & { responseCount: number }>> {
    const forms = await db
      .select()
      .from(integrationForms)
      .orderBy(sql`${integrationForms.pinnedAt} ASC NULLS LAST`, desc(integrationForms.createdAt));

    if (forms.length === 0) return [];

    const counts = await db
      .select({
        formId: integrationResponses.formId,
        count: sql<number>`count(*)::int`,
      })
      .from(integrationResponses)
      .groupBy(integrationResponses.formId);

    const countMap = new Map(counts.map((row) => [row.formId, Number(row.count)]));
    return forms.map((form) => ({
      ...form,
      responseCount: countMap.get(form.id) ?? 0,
    }));
  }

  async createIntegrationForm(data: InsertIntegrationForm): Promise<IntegrationForm> {
    const [created] = await db.insert(integrationForms).values({
      ...data,
      spreadsheetTab: data.spreadsheetTab ?? "Respuestas",
      isPublished: data.isPublished ?? true,
      accessMode: data.accessMode ?? "public",
      allowedUserIds: data.allowedUserIds ?? [],
      allowMultipleSubmissions: data.allowMultipleSubmissions ?? false,
      viewCount: data.viewCount ?? 0,
    }).returning();
    if (!created) throw new Error("Failed to create integration form");
    return created;
  }

  async getIntegrationFormById(id: number): Promise<IntegrationForm | undefined> {
    const [form] = await db.select().from(integrationForms).where(eq(integrationForms.id, id));
    return form;
  }

  async getIntegrationFormBySlug(slug: string): Promise<IntegrationForm | undefined> {
    const [form] = await db.select().from(integrationForms).where(eq(integrationForms.slug, slug));
    return form;
  }

  async updateIntegrationForm(id: number, data: Partial<InsertIntegrationForm>): Promise<IntegrationForm | undefined> {
    const [form] = await db
      .update(integrationForms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrationForms.id, id))
      .returning();
    return form;
  }

  async deleteIntegrationForm(id: number): Promise<boolean> {
    const form = await this.getIntegrationFormById(id);
    if (!form || form.slug === DEFAULT_INTEGRATION_SLUG || form.slug === DEFAULT_MIEMBROS_SLUG) return false;
    await db.delete(integrationForms).where(eq(integrationForms.id, id));
    return true;
  }

  async incrementIntegrationFormViews(id: number): Promise<void> {
    await db
      .update(integrationForms)
      .set({ viewCount: sql`COALESCE(${integrationForms.viewCount}, 0) + 1` })
      .where(eq(integrationForms.id, id));
  }

  async getIntegrationResponses(formId: number, search?: string): Promise<IntegrationResponse[]> {
    const query = search?.trim();
    if (query) {
      return await db
        .select()
        .from(integrationResponses)
        .where(and(
          eq(integrationResponses.formId, formId),
          sql`(${integrationResponses.email} ILIKE ${"%" + query + "%"} OR CAST(${integrationResponses.answers} AS TEXT) ILIKE ${"%" + query + "%"})`,
        ))
        .orderBy(desc(integrationResponses.submittedAt));
    }
    return await db
      .select()
      .from(integrationResponses)
      .where(eq(integrationResponses.formId, formId))
      .orderBy(desc(integrationResponses.submittedAt));
  }

  async getIntegrationResponseByEmail(formId: number, email: string): Promise<IntegrationResponse | undefined> {
    const [response] = await db
      .select()
      .from(integrationResponses)
      .where(and(eq(integrationResponses.formId, formId), eq(integrationResponses.email, email.toLowerCase())));
    return response;
  }

  async createIntegrationResponse(response: InsertIntegrationResponse): Promise<IntegrationResponse> {
    const [created] = await db.insert(integrationResponses).values({
      ...response,
      email: response.email.toLowerCase(),
    }).returning();
    if (!created) {
      throw new Error("Failed to create integration response");
    }
    return created;
  }

  async getIntegrationResponseById(id: number): Promise<IntegrationResponse | undefined> {
    const [response] = await db
      .select()
      .from(integrationResponses)
      .where(eq(integrationResponses.id, id));
    return response;
  }

  async updateIntegrationResponse(
    id: number,
    data: { email?: string; answers: Record<string, unknown> },
  ): Promise<IntegrationResponse | undefined> {
    const [updated] = await db
      .update(integrationResponses)
      .set({
        answers: data.answers,
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
      })
      .where(eq(integrationResponses.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
