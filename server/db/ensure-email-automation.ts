import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { emailAutomationSettings, emailWeekTemplates } from "@shared/schema";
import {
  DEFAULT_DIRECTOR_CAMPAIGN_START,
  DEFAULT_DIRECTOR_EMAIL_TEMPLATES,
} from "@shared/director-emails";

let ensured = false;

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
      updated_at TIMESTAMP DEFAULT NOW()
    )
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
    });
  }

  const existingTemplates = await db.select().from(emailWeekTemplates);
  if (existingTemplates.length === 0) {
    await db.insert(emailWeekTemplates).values(
      DEFAULT_DIRECTOR_EMAIL_TEMPLATES.map((t) => ({
        weekIndex: t.weekIndex,
        label: t.label,
        sendDate: t.sendDate,
        subject: t.subject,
        bodyText: t.bodyText,
        bodyHtml: t.bodyHtml,
        enabled: true,
      })),
    );
  } else {
    // Backfill fechas por etiqueta (sin pisar fechas ya editadas)
    for (const seed of DEFAULT_DIRECTOR_EMAIL_TEMPLATES) {
      const match = existingTemplates.find((t) => {
        const label = t.label.trim().toLowerCase();
        const seedLabel = seed.label.toLowerCase();
        if (label === seedLabel) return true;
        if (seedLabel.includes("cierre") && label.includes("cierre")) return true;
        if (seedLabel.includes("tec") && label.includes("tec")) return true;
        return false;
      });
      if (!match || match.sendDate) continue;
      await db
        .update(emailWeekTemplates)
        .set({
          sendDate: seed.sendDate,
          label: seed.label,
          updatedAt: new Date(),
        })
        .where(eq(emailWeekTemplates.id, match.id));
    }
  }

  ensured = true;
}
