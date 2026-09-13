import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

function pgConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  return {
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, ""),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  };
}

async function runQuery(client: Client, label: string, sql: string) {
  try {
    await client.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠ ${label}: ${message}`);
  }
}

const updateSchema = async () => {
  const client = new Client(pgConfig());

  try {
    console.log("⏳ Conectando a la base de datos...");
    await client.connect();
    console.log("⏳ Actualizando esquema...");

    await runQuery(
      client,
      "tabla integration_forms",
      `
      CREATE TABLE IF NOT EXISTS integration_forms (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        schema JSONB NOT NULL,
        spreadsheet_id TEXT,
        spreadsheet_tab TEXT DEFAULT 'Respuestas',
        is_published BOOLEAN NOT NULL DEFAULT true,
        pinned_at TIMESTAMP,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );

    await runQuery(
      client,
      "columna pinned_at",
      `ALTER TABLE integration_forms ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;`,
    );

    await runQuery(
      client,
      "columna view_count",
      `ALTER TABLE integration_forms ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;`,
    );

    await runQuery(
      client,
      "tabla integration_responses",
      `
      CREATE TABLE IF NOT EXISTS integration_responses (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES integration_forms(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        answers JSONB NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );

    await runQuery(
      client,
      "índice unique de correo",
      `
      CREATE UNIQUE INDEX IF NOT EXISTS integration_responses_form_email_unique
        ON integration_responses (form_id, email);
      `,
    );

    await runQuery(
      client,
      "columna teams.role_color",
      `ALTER TABLE teams ADD COLUMN IF NOT EXISTS role_color TEXT NOT NULL DEFAULT 'blue';`,
    );

    await runQuery(
      client,
      "tabla allies",
      `
      CREATE TABLE IF NOT EXISTS allies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL,
        "order" INTEGER NOT NULL
      );
      `,
    );

    await runQuery(
      client,
      "tabla countries",
      `
      CREATE TABLE IF NOT EXISTS countries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        students TEXT NOT NULL,
        "order" INTEGER NOT NULL
      );
      `,
    );

    console.log("✅ Esquema actualizado");
  } catch (err) {
    console.error("❌ Error al actualizar el esquema:", err);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
};

updateSchema();
