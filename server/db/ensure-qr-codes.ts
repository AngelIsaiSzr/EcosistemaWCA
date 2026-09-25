import { sql } from "drizzle-orm";
import { db } from "../db";

let ensured = false;

export async function ensureQrCodesTable() {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      target_url TEXT NOT NULL,
      short_code TEXT UNIQUE,
      use_short_url BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS short_code TEXT
  `);
  await db.execute(sql`
    ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS use_short_url BOOLEAN NOT NULL DEFAULT false
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS qr_codes_short_code_uidx ON qr_codes (short_code)
  `);

  ensured = true;
}
