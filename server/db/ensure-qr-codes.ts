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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  ensured = true;
}
