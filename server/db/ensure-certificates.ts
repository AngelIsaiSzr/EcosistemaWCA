import { sql } from "drizzle-orm";
import { db } from "../db";

let ensured = false;

export async function ensureCertificatesAndEnrollmentActivity() {
  await db.execute(sql`
    ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  await db.execute(sql`
    UPDATE enrollments SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS certificates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      student_name TEXT NOT NULL,
      program_title TEXT NOT NULL,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_unique
      ON certificates (user_id, course_id)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS certificates_code_unique
      ON certificates (code)
  `);

  ensured = true;
}

export function certificatesEnsured() {
  return ensured;
}
