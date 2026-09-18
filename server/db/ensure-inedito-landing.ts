import { sql } from "drizzle-orm";
import { db } from "../db";
import { ineditoLandingSettings } from "@shared/schema";

let ensured = false;

export async function ensureIneditoLandingTables() {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inedito_landing_settings (
      id SERIAL PRIMARY KEY,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = await db
    .select({ id: ineditoLandingSettings.id })
    .from(ineditoLandingSettings)
    .limit(1);

  if (existing.length === 0) {
    await db.insert(ineditoLandingSettings).values({
      isEnabled: true,
    });
  }

  ensured = true;
}
