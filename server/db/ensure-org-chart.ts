import { sql, eq, asc } from "drizzle-orm";
import { db } from "../db";
import { orgChartPeople } from "@shared/schema";
import { ORG_SEED_MONTERREY, ORG_SEDE_ID, type OrgDirectionKey } from "@shared/org-chart";

let ensured = false;

export async function ensureOrgChartTables() {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS org_chart_people (
      id SERIAL PRIMARY KEY,
      sede_id TEXT NOT NULL DEFAULT 'monterrey',
      parent_id INTEGER REFERENCES org_chart_people(id) ON DELETE SET NULL,
      direction_key TEXT NOT NULL,
      role_kind TEXT NOT NULL DEFAULT 'member',
      name TEXT NOT NULL,
      role_title TEXT NOT NULL DEFAULT '',
      email TEXT,
      phone TEXT,
      photo_url TEXT,
      social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS org_chart_people_sede_idx
      ON org_chart_people (sede_id)
  `);

  const existing = await db
    .select({ id: orgChartPeople.id })
    .from(orgChartPeople)
    .where(eq(orgChartPeople.sedeId, ORG_SEDE_ID))
    .limit(1);

  if (existing.length === 0) {
    await seedMonterreyOrg();
  } else {
    await seedMissingMembers();
  }

  ensured = true;
}

async function seedMonterreyOrg() {
  const leaders = ORG_SEED_MONTERREY.filter((p) => p.roleKind !== "member");
  const members = ORG_SEED_MONTERREY.filter((p) => p.roleKind === "member");

  const [director] = await db
    .insert(orgChartPeople)
    .values({
      sedeId: ORG_SEDE_ID,
      parentId: null,
      directionKey: leaders[0]!.directionKey,
      roleKind: leaders[0]!.roleKind,
      name: leaders[0]!.name,
      roleTitle: leaders[0]!.roleTitle,
      email: leaders[0]!.email,
      phone: null,
      photoUrl: null,
      socialLinks: [],
      sortOrder: leaders[0]!.sortOrder,
      isActive: true,
    })
    .returning();

  const [sub] = await db
    .insert(orgChartPeople)
    .values({
      sedeId: ORG_SEDE_ID,
      parentId: director!.id,
      directionKey: leaders[1]!.directionKey,
      roleKind: leaders[1]!.roleKind,
      name: leaders[1]!.name,
      roleTitle: leaders[1]!.roleTitle,
      email: leaders[1]!.email,
      phone: null,
      photoUrl: null,
      socialLinks: [],
      sortOrder: leaders[1]!.sortOrder,
      isActive: true,
    })
    .returning();

  const directorIds = new Map<OrgDirectionKey, number>();
  for (const person of leaders.slice(2)) {
    const [row] = await db
      .insert(orgChartPeople)
      .values({
        sedeId: ORG_SEDE_ID,
        parentId: sub!.id,
        directionKey: person.directionKey,
        roleKind: person.roleKind,
        name: person.name,
        roleTitle: person.roleTitle,
        email: person.email,
        phone: null,
        photoUrl: null,
        socialLinks: [],
        sortOrder: person.sortOrder,
        isActive: true,
      })
      .returning();
    directorIds.set(person.directionKey, row!.id);
  }

  for (const person of members) {
    const parentId = directorIds.get(person.parentDirectionKey ?? person.directionKey);
    if (!parentId) continue;
    await db.insert(orgChartPeople).values({
      sedeId: ORG_SEDE_ID,
      parentId,
      directionKey: person.directionKey,
      roleKind: "member",
      name: person.name,
      roleTitle: person.roleTitle,
      email: person.email,
      phone: null,
      photoUrl: null,
      socialLinks: [],
      sortOrder: person.sortOrder,
      isActive: true,
    });
  }
}

/** Si ya existían solo directores, agrega integrantes faltantes por correo. */
async function seedMissingMembers() {
  const rows = await db
    .select()
    .from(orgChartPeople)
    .where(eq(orgChartPeople.sedeId, ORG_SEDE_ID));

  const emails = new Set(
    rows.map((r) => (r.email || "").trim().toLowerCase()).filter(Boolean),
  );
  const directorsByKey = new Map<string, number>();
  for (const r of rows) {
    if (r.roleKind === "director" && !r.directionKey.startsWith("sede")) {
      directorsByKey.set(r.directionKey, r.id);
    }
  }

  for (const person of ORG_SEED_MONTERREY.filter((p) => p.roleKind === "member")) {
    const email = (person.email || "").trim().toLowerCase();
    if (!email || emails.has(email)) continue;
    const parentId = directorsByKey.get(person.parentDirectionKey ?? person.directionKey);
    if (!parentId) continue;
    await db.insert(orgChartPeople).values({
      sedeId: ORG_SEDE_ID,
      parentId,
      directionKey: person.directionKey,
      roleKind: "member",
      name: person.name,
      roleTitle: person.roleTitle,
      email: person.email,
      phone: null,
      photoUrl: null,
      socialLinks: [],
      sortOrder: person.sortOrder,
      isActive: true,
    });
    emails.add(email);
  }
}

export async function listOrgPeople(sedeId: string = ORG_SEDE_ID) {
  await ensureOrgChartTables();
  return db
    .select()
    .from(orgChartPeople)
    .where(eq(orgChartPeople.sedeId, sedeId))
    .orderBy(asc(orgChartPeople.sortOrder), asc(orgChartPeople.id));
}
