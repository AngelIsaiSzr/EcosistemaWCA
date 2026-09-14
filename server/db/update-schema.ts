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

    await runQuery(
      client,
      "tabla presentation_cards",
      `
      CREATE TABLE IF NOT EXISTS presentation_cards (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role_title TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        slug TEXT NOT NULL UNIQUE,
        direction TEXT NOT NULL DEFAULT 'direccion-sede',
        theme JSONB NOT NULL DEFAULT '{}',
        linked_in TEXT,
        instagram TEXT,
        twitter TEXT,
        github TEXT,
        youtube TEXT,
        tiktok TEXT,
        whatsapp TEXT,
        email TEXT,
        website TEXT,
        links JSONB NOT NULL DEFAULT '[]',
        assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_published BOOLEAN NOT NULL DEFAULT false,
        pinned_at TIMESTAMP,
        view_count INTEGER NOT NULL DEFAULT 0,
        "order" INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );

    await runQuery(
      client,
      "índice assigned_user presentation_cards",
      `
      CREATE UNIQUE INDEX IF NOT EXISTS presentation_cards_assigned_user_unique
        ON presentation_cards (assigned_user_id)
        WHERE assigned_user_id IS NOT NULL;
      `,
    );

    await runQuery(
      client,
      "tabla inedito_reto_settings",
      `
      CREATE TABLE IF NOT EXISTS inedito_reto_settings (
        id SERIAL PRIMARY KEY,
        video_url TEXT NOT NULL DEFAULT '',
        email_subject TEXT NOT NULL DEFAULT 'WCA | INÉDITO — Tu acceso al Reto',
        email_body_text TEXT NOT NULL DEFAULT '',
        email_body_html TEXT NOT NULL DEFAULT '',
        link_ttl_hours INTEGER NOT NULL DEFAULT 72,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );

    await runQuery(
      client,
      "tabla inedito_reto_tokens",
      `
      CREATE TABLE IF NOT EXISTS inedito_reto_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        is_test BOOLEAN NOT NULL DEFAULT false,
        expires_at TIMESTAMP,
        opened_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );

    await runQuery(
      client,
      "columna modules.video_url",
      `ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT '';`,
    );
    await runQuery(
      client,
      "columna modules.presentation_url",
      `ALTER TABLE modules ADD COLUMN IF NOT EXISTS presentation_url TEXT NOT NULL DEFAULT '';`,
    );
    await runQuery(
      client,
      "columna modules.resources_url",
      `ALTER TABLE modules ADD COLUMN IF NOT EXISTS resources_url TEXT NOT NULL DEFAULT '';`,
    );
    await runQuery(
      client,
      "tabla module_progress",
      `
      CREATE TABLE IF NOT EXISTS module_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        completed BOOLEAN NOT NULL DEFAULT false,
        video_progress INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );
    await runQuery(
      client,
      "índice module_progress único",
      `CREATE UNIQUE INDEX IF NOT EXISTS module_progress_user_module_unique ON module_progress (user_id, module_id);`,
    );
    await runQuery(
      client,
      "tabla module_comments",
      `
      CREATE TABLE IF NOT EXISTS module_comments (
        id SERIAL PRIMARY KEY,
        module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `,
    );
    await runQuery(
      client,
      "índice module_comments",
      `CREATE INDEX IF NOT EXISTS module_comments_module_id_idx ON module_comments (module_id, created_at DESC);`,
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
