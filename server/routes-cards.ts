import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { ensurePresentationCardsTable } from "./db/ensure-presentation-cards";
import {
  isReservedCardSlug,
  normalizeCardSlug,
  isCardDirectionId,
  DEFAULT_CARD_DIRECTION,
  DEFAULT_CARD_THEME,
  type PresentationCardLink,
} from "@shared/card-directions";
import type { InsertPresentationCard } from "@shared/schema";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function isStaff(role: string) {
  return role === "admin" || role === "talento";
}

function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !isStaff(req.user.role)) {
    return res.status(403).json({ message: "Unauthorized: se requiere Admin o Talento" });
  }
  next();
}

function sanitizeLinks(raw: unknown): PresentationCardLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const link = item as Record<string, unknown>;
      const title = String(link.title ?? "").trim();
      const url = String(link.url ?? "").trim();
      if (!title || !url) return null;
      return {
        id: String(link.id ?? `link-${index}-${Date.now()}`),
        title,
        url,
        icon: link.icon ? String(link.icon) : undefined,
        style:
          link.style === "outline" || link.style === "soft" || link.style === "solid"
            ? link.style
            : "solid",
        order: typeof link.order === "number" ? link.order : index + 1,
        enabled: link.enabled !== false,
      } satisfies PresentationCardLink;
    })
    .filter((x): x is PresentationCardLink => x !== null)
    .sort((a, b) => a.order - b.order);
}

function buildCardPayload(
  body: Record<string, unknown>,
  opts: { forAdmin: boolean; existingSlug?: string },
): Partial<InsertPresentationCard> | { error: string } {
  const payload: Partial<InsertPresentationCard> = {};

  if (body.name !== undefined) payload.name = String(body.name).trim();
  if (body.roleTitle !== undefined) payload.roleTitle = String(body.roleTitle).trim();
  if (body.bio !== undefined) payload.bio = String(body.bio);
  if (body.image !== undefined) payload.image = String(body.image).trim();

  if (body.direction !== undefined) {
    payload.direction = isCardDirectionId(body.direction)
      ? body.direction
      : DEFAULT_CARD_DIRECTION;
  }

  if (body.theme !== undefined && typeof body.theme === "object" && body.theme) {
    payload.theme = { ...DEFAULT_CARD_THEME, ...(body.theme as object) };
  }

  if (body.links !== undefined) payload.links = sanitizeLinks(body.links);

  for (const key of [
    "linkedIn",
    "instagram",
    "twitter",
    "github",
    "youtube",
    "tiktok",
    "whatsapp",
    "email",
    "website",
  ] as const) {
    if (body[key] !== undefined) {
      const value = body[key];
      payload[key] = value === null || value === "" ? null : String(value).trim();
    }
  }

  if (body.isPublished !== undefined) payload.isPublished = Boolean(body.isPublished);
  if (body.order !== undefined) payload.order = Number(body.order) || 1;

  if (body.pinned !== undefined) {
    payload.pinnedAt = body.pinned ? new Date() : null;
  } else if (body.pinnedAt !== undefined) {
    payload.pinnedAt = body.pinnedAt ? new Date(String(body.pinnedAt)) : null;
  }

  if (opts.forAdmin && body.slug !== undefined) {
    const slug = normalizeCardSlug(String(body.slug));
    if (!slug) return { error: "El slug es requerido" };
    if (isReservedCardSlug(slug)) {
      return { error: `El slug "${slug}" está reservado` };
    }
    payload.slug = slug;
  }

  if (opts.forAdmin && body.assignedUserId !== undefined) {
    if (body.assignedUserId === null || body.assignedUserId === "") {
      payload.assignedUserId = null;
    } else {
      payload.assignedUserId = Number(body.assignedUserId);
      if (Number.isNaN(payload.assignedUserId)) {
        return { error: "Usuario asignado inválido" };
      }
    }
  }

  return payload;
}

export function registerCardRoutes(app: Express) {
  ensurePresentationCardsTable().catch((err) => {
    console.warn("No se pudo asegurar presentation_cards al inicio:", err);
  });

  app.get("/api/users/list-basic", requireStaff, async (_req, res) => {
    try {
      await ensurePresentationCardsTable();
      const users = await storage.getUsersBasic();
      res.json(users);
    } catch {
      res.status(500).json({ message: "Failed to list users" });
    }
  });

  app.get("/api/cards", requireAuth, async (req, res) => {
    try {
      await ensurePresentationCardsTable();
      if (isStaff(req.user!.role)) {
        const cards = await storage.getAllPresentationCards();
        return res.json(cards);
      }
      const mine = await storage.getPresentationCardByUserId(req.user!.id);
      return res.json(mine ? [mine] : []);
    } catch {
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  app.get("/api/cards/mine", requireAuth, async (req, res) => {
    try {
      await ensurePresentationCardsTable();
      const card = await storage.getPresentationCardByUserId(req.user!.id);
      if (!card) return res.status(404).json({ message: "No tienes tarjeta asignada" });
      res.json(card);
    } catch {
      res.status(500).json({ message: "Failed to fetch card" });
    }
  });

  app.get("/api/cards/by-slug/:slug", async (req, res) => {
    try {
      await ensurePresentationCardsTable();
      const slug = normalizeCardSlug(req.params.slug);
      if (!slug || isReservedCardSlug(slug)) {
        return res.status(404).json({ message: "Card not found" });
      }
      const card = await storage.getPresentationCardBySlug(slug);
      if (!card || !card.isPublished) {
        return res.status(404).json({ message: "Card not found" });
      }
      void storage.incrementPresentationCardViews(card.id);
      res.json({ ...card, viewCount: card.viewCount + 1 });
    } catch {
      res.status(500).json({ message: "Failed to fetch card" });
    }
  });

  app.get("/api/cards/:id", requireAuth, async (req, res) => {
    try {
      await ensurePresentationCardsTable();
      const id = parseInt(req.params.id, 10);
      const card = await storage.getPresentationCard(id);
      if (!card) return res.status(404).json({ message: "Card not found" });
      const isAdmin = isStaff(req.user!.role);
      const isOwner = card.assignedUserId === req.user!.id;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      res.json(card);
    } catch {
      res.status(500).json({ message: "Failed to fetch card" });
    }
  });

  app.post("/api/cards", requireStaff, async (req, res) => {
    try {
      await ensurePresentationCardsTable();
      const body = req.body as Record<string, unknown>;
      const built = buildCardPayload(body, { forAdmin: true });
      if ("error" in built) return res.status(400).json({ message: built.error });

      const name = built.name || "Nueva tarjeta";
      const roleTitle = built.roleTitle || "Miembro";
      let slug = built.slug || normalizeCardSlug(name);
      if (!slug) slug = `miembro-${Date.now()}`;
      if (isReservedCardSlug(slug)) {
        return res.status(400).json({ message: `El slug "${slug}" está reservado` });
      }

      const existing = await storage.getPresentationCardBySlug(slug);
      if (existing) {
        return res.status(400).json({ message: "Ese slug ya está en uso" });
      }

      if (built.assignedUserId) {
        const taken = await storage.getPresentationCardByUserId(built.assignedUserId);
        if (taken) {
          return res.status(400).json({ message: "Ese usuario ya tiene una tarjeta asignada" });
        }
      }

      const all = await storage.getAllPresentationCards();
      const nextOrder =
        all.length > 0 ? Math.max(...all.map((c) => c.order)) + 1 : 1;

      const card = await storage.createPresentationCard({
        name,
        roleTitle,
        bio: built.bio ?? "",
        image: built.image ?? "",
        slug,
        direction: built.direction ?? DEFAULT_CARD_DIRECTION,
        theme: built.theme ?? { ...DEFAULT_CARD_THEME },
        linkedIn: built.linkedIn ?? null,
        instagram: built.instagram ?? null,
        twitter: built.twitter ?? null,
        github: built.github ?? null,
        youtube: built.youtube ?? null,
        tiktok: built.tiktok ?? null,
        whatsapp: built.whatsapp ?? null,
        email: built.email ?? null,
        website: built.website ?? null,
        links: built.links ?? [],
        assignedUserId: built.assignedUserId ?? null,
        isPublished: built.isPublished ?? false,
        pinnedAt: built.pinnedAt ?? null,
        order: built.order ?? nextOrder,
      });

      res.status(201).json(card);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.patch("/api/cards/:id", requireAuth, async (req, res) => {
    try {
      await ensurePresentationCardsTable();
      const id = parseInt(req.params.id, 10);
      const existing = await storage.getPresentationCard(id);
      if (!existing) return res.status(404).json({ message: "Card not found" });

      const isAdmin = isStaff(req.user!.role);
      const isOwner = existing.assignedUserId === req.user!.id;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const body = req.body as Record<string, unknown>;
      const built = buildCardPayload(body, {
        forAdmin: isAdmin,
        existingSlug: existing.slug,
      });
      if ("error" in built) return res.status(400).json({ message: built.error });

      if (!isAdmin) {
        delete built.slug;
        delete built.assignedUserId;
      }

      if (isAdmin && built.slug && built.slug !== existing.slug) {
        const clash = await storage.getPresentationCardBySlug(built.slug);
        if (clash && clash.id !== id) {
          return res.status(400).json({ message: "Ese slug ya está en uso" });
        }
      }

      if (isAdmin && built.assignedUserId && built.assignedUserId !== existing.assignedUserId) {
        const taken = await storage.getPresentationCardByUserId(built.assignedUserId);
        if (taken && taken.id !== id) {
          return res.status(400).json({ message: "Ese usuario ya tiene una tarjeta asignada" });
        }
      }

      const updated = await storage.updatePresentationCard(id, built);
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

  app.delete("/api/cards/:id", requireStaff, async (req, res) => {
    try {
      await ensurePresentationCardsTable();
      const id = parseInt(req.params.id, 10);
      const ok = await storage.deletePresentationCard(id);
      if (!ok) return res.status(404).json({ message: "Card not found" });
      res.json({ message: "Card deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete card" });
    }
  });
}
