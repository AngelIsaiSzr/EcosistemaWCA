import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const url = process.env.DATABASE_URL.includes("sslmode=")
    ? process.env.DATABASE_URL
    : `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes("?") ? "&" : "?"}sslmode=require`;

  return new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });
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
  const client = createClient();

  try {
    console.log("⏳ Conectando a la base de datos...");
    await client.connect();
    await client.query("SET statement_timeout = 20000");
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
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
      "columnas live en courses",
      `
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS live_details jsonb;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT false;
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
