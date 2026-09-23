import type { Express, Request, Response, NextFunction } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { orgChartPeople } from "@shared/schema";
import { ensureOrgChartTables, listOrgPeople } from "./db/ensure-org-chart";
import { ORG_DIRECTION_COLORS, ORG_SEDE_ID, type OrgDirectionKey } from "@shared/org-chart";

const TALENTO_ROLE = "talento";
const DIRECTION_KEYS = Object.keys(ORG_DIRECTION_COLORS) as OrgDirectionKey[];

function requireTalento(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user || req.user.role !== TALENTO_ROLE) {
    return res.status(403).json({ message: "Unauthorized: Talento y Bienestar access required" });
  }
  next();
}

function serialize(row: typeof orgChartPeople.$inferSelect) {
  return {
    id: row.id,
    sedeId: row.sedeId,
    parentId: row.parentId,
    directionKey: row.directionKey,
    roleKind: row.roleKind,
    name: row.name,
    roleTitle: row.roleTitle,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photoUrl,
    socialLinks: Array.isArray(row.socialLinks) ? row.socialLinks : [],
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  };
}

const socialSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  url: z.string().min(1).max(500),
});

const upsertSchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  directionKey: z.enum(DIRECTION_KEYS as [OrgDirectionKey, ...OrgDirectionKey[]]),
  roleKind: z.enum(["director", "subdirector", "member"]),
  name: z.string().min(1).max(160),
  roleTitle: z.string().min(1).max(160),
  email: z.string().email().nullable().or(z.literal("")).optional(),
  phone: z.string().max(40).nullable().or(z.literal("")).optional(),
  photoUrl: z.string().max(800).nullable().or(z.literal("")).optional(),
  socialLinks: z.array(socialSchema).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export function registerOrgChartRoutes(app: Express) {
  app.get("/api/organigrama", async (req, res) => {
    try {
      const sedeId = String(req.query.sede || ORG_SEDE_ID);
      const rows = await listOrgPeople(sedeId);
      res.json({
        sedeId,
        title: "Organigrama Oficial",
        subtitle: "Estructura Organizativa Institucional del Ecosistema WCA",
        sedeLabel: "Sede Monterrey",
        people: rows.filter((r) => r.isActive).map(serialize),
      });
    } catch (error) {
      console.error("GET /api/organigrama", error);
      res.status(500).json({ message: "No se pudo cargar el organigrama" });
    }
  });

  app.get("/api/talento/organigrama", requireTalento, async (req, res) => {
    try {
      const sedeId = String(req.query.sede || ORG_SEDE_ID);
      const rows = await listOrgPeople(sedeId);
      res.json({
        sedeId,
        people: rows.map(serialize),
      });
    } catch (error) {
      console.error("GET /api/talento/organigrama", error);
      res.status(500).json({ message: "No se pudo cargar el organigrama" });
    }
  });

  app.post("/api/talento/organigrama", requireTalento, async (req, res) => {
    try {
      await ensureOrgChartTables();
      const body = upsertSchema.parse(req.body);
      const email = body.email === "" ? null : body.email ?? null;
      const phone = body.phone === "" ? null : body.phone ?? null;
      const photoUrl = body.photoUrl === "" ? null : body.photoUrl ?? null;

      if (body.roleKind !== "member") {
        return res.status(400).json({
          message: "Solo se pueden agregar miembros. Directores y subdirección se editan, no se duplican.",
        });
      }
      if (!body.parentId) {
        return res.status(400).json({ message: "Un miembro debe colgar de una dirección." });
      }

      const [parent] = await db
        .select()
        .from(orgChartPeople)
        .where(eq(orgChartPeople.id, body.parentId))
        .limit(1);
      if (!parent || parent.roleKind === "member") {
        return res.status(400).json({ message: "El padre debe ser un director o la subdirección." });
      }

      const siblings = await db
        .select({ sortOrder: orgChartPeople.sortOrder })
        .from(orgChartPeople)
        .where(eq(orgChartPeople.parentId, body.parentId))
        .orderBy(asc(orgChartPeople.sortOrder));
      const nextOrder =
        body.sortOrder ??
        (siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 100);

      const [created] = await db
        .insert(orgChartPeople)
        .values({
          sedeId: ORG_SEDE_ID,
          parentId: body.parentId,
          directionKey: body.directionKey,
          roleKind: "member",
          name: body.name.trim(),
          roleTitle: body.roleTitle.trim(),
          email,
          phone,
          photoUrl,
          socialLinks: body.socialLinks ?? [],
          sortOrder: nextOrder,
          isActive: body.isActive ?? true,
        })
        .returning();

      res.status(201).json(serialize(created!));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
      }
      console.error("POST /api/talento/organigrama", error);
      res.status(500).json({ message: "No se pudo crear la persona" });
    }
  });

  app.patch("/api/talento/organigrama/:id", requireTalento, async (req, res) => {
    try {
      await ensureOrgChartTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

      const [current] = await db.select().from(orgChartPeople).where(eq(orgChartPeople.id, id)).limit(1);
      if (!current) return res.status(404).json({ message: "No encontrado" });

      const body = upsertSchema.partial().parse(req.body);
      const patch: Record<string, unknown> = { updatedAt: new Date() };

      if (body.name != null) patch.name = body.name.trim();
      if (body.roleTitle != null) patch.roleTitle = body.roleTitle.trim();
      if (body.email !== undefined) patch.email = body.email === "" ? null : body.email;
      if (body.phone !== undefined) patch.phone = body.phone === "" ? null : body.phone;
      if (body.photoUrl !== undefined) patch.photoUrl = body.photoUrl === "" ? null : body.photoUrl;
      if (body.socialLinks !== undefined) patch.socialLinks = body.socialLinks;
      if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
      if (body.isActive !== undefined) patch.isActive = body.isActive;

      // Directores fijos: no cambiar kind/direction/parent
      if (current.roleKind === "member") {
        if (body.directionKey != null) patch.directionKey = body.directionKey;
        if (body.parentId !== undefined) patch.parentId = body.parentId;
      }

      const [updated] = await db
        .update(orgChartPeople)
        .set(patch)
        .where(eq(orgChartPeople.id, id))
        .returning();

      res.json(serialize(updated!));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
      }
      console.error("PATCH /api/talento/organigrama/:id", error);
      res.status(500).json({ message: "No se pudo actualizar" });
    }
  });

  app.delete("/api/talento/organigrama/:id", requireTalento, async (req, res) => {
    try {
      await ensureOrgChartTables();
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

      const [current] = await db.select().from(orgChartPeople).where(eq(orgChartPeople.id, id)).limit(1);
      if (!current) return res.status(404).json({ message: "No encontrado" });
      if (current.roleKind !== "member") {
        return res.status(400).json({ message: "No se puede eliminar directores ni la subdirección." });
      }

      await db.delete(orgChartPeople).where(and(eq(orgChartPeople.id, id), eq(orgChartPeople.roleKind, "member")));
      res.json({ ok: true });
    } catch (error) {
      console.error("DELETE /api/talento/organigrama/:id", error);
      res.status(500).json({ message: "No se pudo eliminar" });
    }
  });

  app.post("/api/talento/organigrama/reorder", requireTalento, async (req, res) => {
    try {
      await ensureOrgChartTables();
      const body = z
        .object({
          items: z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })),
        })
        .parse(req.body);

      for (const item of body.items) {
        await db
          .update(orgChartPeople)
          .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
          .where(eq(orgChartPeople.id, item.id));
      }
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos" });
      }
      console.error("POST /api/talento/organigrama/reorder", error);
      res.status(500).json({ message: "No se pudo reordenar" });
    }
  });

  // warm seed
  ensureOrgChartTables().catch((err) => console.error("ensureOrgChartTables", err));
}
