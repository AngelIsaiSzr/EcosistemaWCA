import { sql } from "drizzle-orm";
import { db } from "../db";
import { ineditoRetoSettings } from "@shared/schema";

let ensured = false;

const DEFAULT_SUBJECT = "WCA | INÉDITO — Tu acceso al Reto";
const DEFAULT_TEXT = `Hola,

Has sido preseleccionado/a para la segunda etapa de WCA | INÉDITO.

Este enlace es personal, temporal y de un solo uso. Ábrelo cuando puedas ver el reto completo sin interrupciones:

{{link}}

Una vez que el vídeo termine, el acceso se cerrará para siempre.

— Ecosistema WCA | INÉDITO`;

const DEFAULT_HTML = `<p>Hola,</p>
<p>Has sido preseleccionado/a para la segunda etapa de <strong>WCA | INÉDITO</strong>.</p>
<p>Este enlace es <strong>personal, temporal y de un solo uso</strong>. Ábrelo cuando puedas ver el reto completo sin interrupciones:</p>
<p><a href="{{link}}">{{link}}</a></p>
<p>Una vez que el vídeo termine, el acceso se cerrará para siempre.</p>
<p>— Ecosistema WCA | INÉDITO</p>`;

export async function ensureIneditoRetoTables() {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inedito_reto_settings (
      id SERIAL PRIMARY KEY,
      video_url TEXT NOT NULL DEFAULT '',
      email_subject TEXT NOT NULL DEFAULT 'WCA | INÉDITO — Tu acceso al Reto',
      email_body_text TEXT NOT NULL DEFAULT '',
      email_body_html TEXT NOT NULL DEFAULT '',
      link_ttl_hours INTEGER NOT NULL DEFAULT 72,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
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
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS inedito_reto_tokens_status_idx
      ON inedito_reto_tokens (status)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS inedito_reto_tokens_created_at_idx
      ON inedito_reto_tokens (created_at DESC)
  `);

  const existing = await db.select({ id: ineditoRetoSettings.id }).from(ineditoRetoSettings).limit(1);
  if (existing.length === 0) {
    await db.insert(ineditoRetoSettings).values({
      videoUrl: "",
      emailSubject: DEFAULT_SUBJECT,
      emailBodyText: DEFAULT_TEXT,
      emailBodyHtml: DEFAULT_HTML,
      linkTtlHours: 72,
    });
  } else {
    await db.execute(sql`
      UPDATE inedito_reto_settings
      SET link_ttl_hours = 72
      WHERE link_ttl_hours = 168
    `);
  }

  ensured = true;
}

export { DEFAULT_SUBJECT, DEFAULT_TEXT, DEFAULT_HTML };
