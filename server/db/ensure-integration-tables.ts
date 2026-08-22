import { sql } from "drizzle-orm";
import { db } from "./db";

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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS integration_responses_form_email_unique
      ON integration_responses (form_id, email)
  `);
  ensured = true;
}
