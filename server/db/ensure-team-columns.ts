import { sql } from "drizzle-orm";
import { db } from "../db";

let teamEnsured = false;

export async function ensureTeamColumns() {
  if (teamEnsured) return;
  await db.execute(sql`
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS role_color TEXT NOT NULL DEFAULT 'blue'
  `);
  teamEnsured = true;
}
