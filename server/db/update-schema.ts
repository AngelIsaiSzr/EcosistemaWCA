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

    console.log("✅ Esquema actualizado");
  } catch (err) {
    console.error("❌ Error al actualizar el esquema:", err);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
};

updateSchema();
