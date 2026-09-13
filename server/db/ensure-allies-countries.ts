import { sql } from "drizzle-orm";
import { db } from "../db";
import { allies, countries } from "@shared/schema";
import { DEFAULT_ALLIES, DEFAULT_COUNTRIES } from "@shared/carousel-defaults";

let ensured = false;

export async function ensureAlliesAndCountriesTables() {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS allies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL,
      "order" INTEGER NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS countries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      students TEXT NOT NULL,
      "order" INTEGER NOT NULL
    )
  `);

  const existingAllies = await db.select({ id: allies.id }).from(allies).limit(1);
  if (existingAllies.length === 0) {
    await db.insert(allies).values(
      DEFAULT_ALLIES.map((item) => ({
        name: item.name,
        image: item.image,
        order: item.order,
      })),
    );
  }

  const existingCountries = await db.select({ id: countries.id }).from(countries).limit(1);
  if (existingCountries.length === 0) {
    await db.insert(countries).values(
      DEFAULT_COUNTRIES.map((item) => ({
        name: item.name,
        code: item.code,
        students: item.students,
        order: item.order,
      })),
    );
  }

  ensured = true;
}
