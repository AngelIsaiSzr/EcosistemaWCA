import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL debe estar configurado. Asegúrate de que el archivo .env contenga la variable DATABASE_URL.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  idleTimeoutMillis: 30_000,
});

// Sin este listener, un cliente inactivo que la BD cierra (ECONNRESET) tumba todo el proceso.
pool.on("error", (error) => {
  console.error("[db] Conexión inactiva cerrada por el servidor de Postgres:", error.message);
});

export const db = drizzle(pool, { schema });