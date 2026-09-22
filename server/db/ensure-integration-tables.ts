import { sql } from "drizzle-orm";
import { db } from "../db";

let ensured = false;

export async function ensureIntegrationTables() {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integration_forms (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      schema JSONB NOT NULL,
      spreadsheet_id TEXT,
      spreadsheet_tab TEXT DEFAULT 'Respuestas',
      is_published BOOLEAN NOT NULL DEFAULT true,
      access_mode TEXT NOT NULL DEFAULT 'public',
      allowed_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      allow_multiple_submissions BOOLEAN NOT NULL DEFAULT false,
      pinned_at TIMESTAMP,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`
    ALTER TABLE integration_forms ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP
  `);
  await db.execute(sql`
    ALTER TABLE integration_forms ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0
  `);
  await db.execute(sql`
    ALTER TABLE integration_forms ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'public'
  `);
  await db.execute(sql`
    ALTER TABLE integration_forms ADD COLUMN IF NOT EXISTS allowed_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  await db.execute(sql`
    ALTER TABLE integration_forms ADD COLUMN IF NOT EXISTS allow_multiple_submissions BOOLEAN NOT NULL DEFAULT false
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integration_responses (
      id SERIAL PRIMARY KEY,
      form_id INTEGER NOT NULL REFERENCES integration_forms(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      answers JSONB NOT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Unicidad por correo se aplica en la API según allow_multiple_submissions
  await db.execute(sql`
    DROP INDEX IF EXISTS integration_responses_form_email_unique
  `);
  ensured = true;
}
