import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { emailAutomationSettings, emailWeekTemplates } from "@shared/schema";
import {
  DEFAULT_ACTIVE_SEMESTER,
  DEFAULT_DIRECTOR_CAMPAIGN_START,
  EMAIL_CALENDAR_SEED_VERSION,
  SEMESTER_CALENDARS,
  type SemesterCalendarId,
} from "@shared/director-emails";

let ensured = false;

async function syncTemplatesForSemester(semesterId: SemesterCalendarId) {
  const calendar = SEMESTER_CALENDARS[semesterId];
  const existing = await db.select().from(emailWeekTemplates);

  for (const seed of calendar.templates) {
    const match = existing.find((t) => t.weekIndex === seed.weekIndex);
    if (match) {
      await db
        .update(emailWeekTemplates)
        .set({
          label: seed.label,
          sendDate: seed.sendDate,
          subject: seed.subject,
          bodyText: seed.bodyText,
          bodyHtml: seed.bodyHtml,
          enabled: seed.enabled !== false,
          updatedAt: new Date(),
        })
        .where(eq(emailWeekTemplates.id, match.id));
    } else {
      await db.insert(emailWeekTemplates).values({
        weekIndex: seed.weekIndex,
        label: seed.label,
        sendDate: seed.sendDate,
        subject: seed.subject,
        bodyText: seed.bodyText,
        bodyHtml: seed.bodyHtml,
        enabled: seed.enabled !== false,
      });
    }
  }

  // Quitar plantillas sobrantes de un seed anterior (p. ej. solo 7 filas)
  const keep = new Set(calendar.templates.map((t) => t.weekIndex));
  for (const row of existing) {
    if (!keep.has(row.weekIndex)) {
      await db.delete(emailWeekTemplates).where(eq(emailWeekTemplates.id, row.id));
    }
  }
}

export async function ensureEmailAutomationTables() {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_automation_settings (
      id SERIAL PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
      start_date TEXT NOT NULL DEFAULT '2026-09-14',
      send_hour INTEGER NOT NULL DEFAULT 9,
      send_weekday INTEGER NOT NULL DEFAULT 1,
      sender_id TEXT NOT NULL DEFAULT 'contacto',
      active_semester TEXT NOT NULL DEFAULT 'AD26',
      calendar_version INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE email_automation_settings
    ADD COLUMN IF NOT EXISTS sender_id TEXT NOT NULL DEFAULT 'contacto'
  `);
  await db.execute(sql`
    ALTER TABLE email_automation_settings
    ADD COLUMN IF NOT EXISTS active_semester TEXT NOT NULL DEFAULT 'AD26'
  `);
  await db.execute(sql`
    ALTER TABLE email_automation_settings
    ADD COLUMN IF NOT EXISTS calendar_version INTEGER NOT NULL DEFAULT 0
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_week_templates (
      id SERIAL PRIMARY KEY,
      week_index INTEGER NOT NULL UNIQUE,
      label TEXT NOT NULL,
      send_date TEXT,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      body_html TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE email_week_templates
    ADD COLUMN IF NOT EXISTS send_date TEXT
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_automation_logs (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      week_index INTEGER,
      template_id INTEGER,
      send_date TEXT,
      recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
      subject TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE email_automation_logs
    ADD COLUMN IF NOT EXISTS send_date TEXT
  `);

  const existingSettings = await db.select().from(emailAutomationSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(emailAutomationSettings).values({
      enabled: false,
      recipients: [],
      startDate: DEFAULT_DIRECTOR_CAMPAIGN_START,
      sendHour: 9,
      sendWeekday: 1,
      senderId: "contacto",
      activeSemester: DEFAULT_ACTIVE_SEMESTER,
      calendarVersion: 0,
    });
  }

  const [settings] = await db.select().from(emailAutomationSettings).limit(1);
  const semester = (
    settings?.activeSemester === "FJ26" ? "FJ26" : "AD26"
  ) as SemesterCalendarId;

  const existingTemplates = await db.select().from(emailWeekTemplates);
  const needsSync =
    existingTemplates.length === 0 ||
    (settings?.calendarVersion ?? 0) < EMAIL_CALENDAR_SEED_VERSION;

  if (needsSync) {
    if (existingTemplates.length === 0) {
      const seeds = SEMESTER_CALENDARS[semester].templates;
      await db.insert(emailWeekTemplates).values(
        seeds.map((t) => ({
          weekIndex: t.weekIndex,
          label: t.label,
          sendDate: t.sendDate,
          subject: t.subject,
          bodyText: t.bodyText,
          bodyHtml: t.bodyHtml,
          enabled: t.enabled !== false,
        })),
      );
    } else {
      await syncTemplatesForSemester(semester);
      // Rellenar cuerpos si estaban vacíos / genéricos al crear filas nuevas
      const after = await db.select().from(emailWeekTemplates);
      for (const seed of SEMESTER_CALENDARS[semester].templates) {
        const row = after.find((t) => t.weekIndex === seed.weekIndex);
        if (row && (!row.bodyText || row.bodyText.length < 20)) {
          await db
            .update(emailWeekTemplates)
            .set({
              bodyText: seed.bodyText,
              bodyHtml: seed.bodyHtml,
              subject: seed.subject,
              updatedAt: new Date(),
            })
            .where(eq(emailWeekTemplates.id, row.id));
        }
      }
    }

    if (settings) {
      await db
        .update(emailAutomationSettings)
        .set({
          calendarVersion: EMAIL_CALENDAR_SEED_VERSION,
          activeSemester: semester,
          startDate: SEMESTER_CALENDARS[semester].classStart,
          updatedAt: new Date(),
        })
        .where(eq(emailAutomationSettings.id, settings.id));
    }
  }

  ensured = true;
}

export async function applySemesterCalendar(semesterId: SemesterCalendarId) {
  await ensureEmailAutomationTables();
  // Forzar re-sync aunque ensured=true
  const calendar = SEMESTER_CALENDARS[semesterId];
  const existing = await db.select().from(emailWeekTemplates);

  for (const seed of calendar.templates) {
    const match = existing.find((t) => t.weekIndex === seed.weekIndex);
    if (match) {
      await db
        .update(emailWeekTemplates)
        .set({
          label: seed.label,
          sendDate: seed.sendDate,
          subject: seed.subject,
          bodyText: seed.bodyText,
          bodyHtml: seed.bodyHtml,
          enabled: seed.enabled !== false,
          updatedAt: new Date(),
        })
        .where(eq(emailWeekTemplates.id, match.id));
    } else {
      await db.insert(emailWeekTemplates).values({
        weekIndex: seed.weekIndex,
        label: seed.label,
        sendDate: seed.sendDate,
        subject: seed.subject,
        bodyText: seed.bodyText,
        bodyHtml: seed.bodyHtml,
        enabled: seed.enabled !== false,
      });
    }
  }

  const keep = new Set(calendar.templates.map((t) => t.weekIndex));
  for (const row of existing) {
    if (!keep.has(row.weekIndex)) {
      await db.delete(emailWeekTemplates).where(eq(emailWeekTemplates.id, row.id));
    }
  }

  const [settings] = await db.select().from(emailAutomationSettings).limit(1);
  if (settings) {
    await db
      .update(emailAutomationSettings)
      .set({
        activeSemester: semesterId,
        startDate: calendar.classStart,
        calendarVersion: EMAIL_CALENDAR_SEED_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(emailAutomationSettings.id, settings.id));
  }

  return calendar;
}
