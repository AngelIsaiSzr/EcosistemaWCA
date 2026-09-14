import { sql } from "drizzle-orm";
import { db } from "../db";

let ensured = false;

export async function ensureModuleLearningTables() {
  // ALTER siempre (idempotente) por si se agregan columnas nuevas en caliente
  await db.execute(sql`
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT ''
  `);
  await db.execute(sql`
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_parts JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  await db.execute(sql`
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS presentation_url TEXT NOT NULL DEFAULT ''
  `);
  await db.execute(sql`
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS resources_url TEXT NOT NULL DEFAULT ''
  `);

  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS module_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT false,
      video_progress INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS module_progress_user_module_unique
      ON module_progress (user_id, module_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS module_comments (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS module_comments_module_id_idx
      ON module_comments (module_id, created_at DESC)
  `);

  ensured = true;
}
