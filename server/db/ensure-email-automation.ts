import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { emailAutomationSettings, emailGroups, emailWeekTemplates } from "@shared/schema";
import { DEFAULT_DIRECTOR_CAMPAIGN_START } from "@shared/director-emails";

let ensured = false;

/** Etiquetas del calendario original → plantilla precargada equivalente. */
const LEGACY_PRESET_BY_LABEL: Record<string, string> = {
  "Semana Tec #1": "tec1",
  "Semana Tec #2": "tec2",
  "Periodo 2 · Semana 1": "p2w1",
  "Periodo 2 · Semana 2": "p2w2",
  "Periodo 2 · Semana 3": "p2w3",
  "Periodo 2 · Semana 4": "p2w4",
  "Periodo 2 · Semana 5": "p2w5",
};

/**
 * Los correos que existían antes de los grupos se agrupan en "AD26" (sin tocar su contenido).
 * Solo corre si todavía no hay ningún grupo.
 */
async function migrateLegacyTemplates() {
  const groups = await db.select({ id: emailGroups.id }).from(emailGroups).limit(1);
  const ungrouped = await db.select().from(emailWeekTemplates).where(isNull(emailWeekTemplates.groupId));
  if (groups.length > 0 || ungrouped.length === 0) return;

  const [group] = await db
    .insert(emailGroups)
    .values({
      name: "AD26",
      kind: "semester",
      color: "blue",
      startDate: "2026-08-10",
      endDate: "2026-12-11",
    })
    .returning();

  for (const row of ungrouped) {
    const presetKey =
      row.presetKey ??
      LEGACY_PRESET_BY_LABEL[row.label] ??
      (row.label.toLowerCase().startsWith("cierre") ? "cierre" : null);
    await db
      .update(emailWeekTemplates)
      .set({ groupId: group.id, presetKey })
      .where(and(eq(emailWeekTemplates.id, row.id), isNull(emailWeekTemplates.groupId)));
  }
}

let ensurePromise: Promise<void> | null = null;

/** Una sola inicialización en curso aunque la llamen varias peticiones a la vez. */
export function ensureEmailAutomationTables(): Promise<void> {
  if (ensured) return Promise.resolve();
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

async function runEnsure() {
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
    ALTER TABLE email_automation_settings
    ADD COLUMN IF NOT EXISTS cc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  await db.execute(sql`
    ALTER TABLE email_automation_settings
    ADD COLUMN IF NOT EXISTS bcc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb
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

  await db.execute(sql`ALTER TABLE email_week_templates ADD COLUMN IF NOT EXISTS send_date TEXT`);
  await db.execute(sql`ALTER TABLE email_week_templates ADD COLUMN IF NOT EXISTS group_id INTEGER`);
  await db.execute(sql`ALTER TABLE email_week_templates ADD COLUMN IF NOT EXISTS preset_key TEXT`);
  await db.execute(sql`ALTER TABLE email_week_templates ADD COLUMN IF NOT EXISTS recipients_override JSONB`);
  await db.execute(sql`ALTER TABLE email_week_templates ADD COLUMN IF NOT EXISTS send_hour INTEGER`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'semester',
      color TEXT NOT NULL DEFAULT 'blue',
      start_date TEXT,
      end_date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
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
    });
  }

  await migrateLegacyTemplates();

  ensured = true;
}
