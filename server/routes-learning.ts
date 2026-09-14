import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  moduleComments,
  moduleProgress,
  users,
} from "@shared/schema";
import { storage } from "./storage";
import { ensureModuleLearningTables } from "./db/ensure-module-learning";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Debes iniciar sesión" });
  }
  next();
}

async function syncEnrollmentProgress(userId: number, courseId: number) {
  const courseModules = await storage.getModulesByCourseId(courseId);
  if (courseModules.length === 0) return;

  const ids = courseModules.map((m) => m.id);
  const progressRows = await db
    .select()
    .from(moduleProgress)
    .where(
      and(eq(moduleProgress.userId, userId), inArray(moduleProgress.moduleId, ids)),
    );

  const completed = progressRows.filter((p) => p.completed).length;
  const pct = Math.round((completed / courseModules.length) * 100);
  const enrollment = await storage.getEnrollmentByCourseAndUser(courseId, userId);
  if (enrollment) {
    await storage.updateEnrollmentProgress(enrollment.id, pct, pct >= 100);
  }
}

export function registerLearningRoutes(app: Express) {
  ensureModuleLearningTables().catch((err) => {
    console.error("No se pudieron asegurar tablas de learning:", err);
  });

  app.get("/api/programs/:courseId/module-progress", requireAuth, async (req, res) => {
    try {
      await ensureModuleLearningTables();
      const courseId = Number(req.params.courseId);
      const courseModules = await storage.getModulesByCourseId(courseId);
      const ids = new Set(courseModules.map((m) => m.id));
      const rows = await db
        .select()
        .from(moduleProgress)
        .where(eq(moduleProgress.userId, req.user!.id));
      const moduleRows = rows.filter((r) => ids.has(r.moduleId));
      const completedCount = moduleRows.filter((m) => m.completed).length;
      return res.json({
        modules: moduleRows,
        progressPercent:
          courseModules.length === 0
            ? 0
            : Math.round((completedCount / courseModules.length) * 100),
      });
    } catch (error) {
      console.error("module-progress GET", error);
      return res.status(500).json({ message: "No se pudo cargar el progreso" });
    }
  });

  app.post("/api/modules/:id/progress", requireAuth, async (req, res) => {
    try {
      await ensureModuleLearningTables();
      const moduleId = Number(req.params.id);
      const body = z
        .object({
          completed: z.boolean().optional(),
          videoProgress: z.number().int().min(0).max(100).optional(),
        })
        .parse(req.body ?? {});

      const mod = await storage.getModule(moduleId);
      if (!mod) return res.status(404).json({ message: "Módulo no encontrado" });

      const [existing] = await db
        .select()
        .from(moduleProgress)
        .where(
          and(
            eq(moduleProgress.userId, req.user!.id),
            eq(moduleProgress.moduleId, moduleId),
          ),
        )
        .limit(1);

      let row;
      if (existing) {
        [row] = await db
          .update(moduleProgress)
          .set({
            completed: body.completed ?? existing.completed,
            videoProgress: body.videoProgress ?? existing.videoProgress,
            updatedAt: new Date(),
          })
          .where(eq(moduleProgress.id, existing.id))
          .returning();
      } else {
        [row] = await db
          .insert(moduleProgress)
          .values({
            userId: req.user!.id,
            moduleId,
            completed: body.completed ?? false,
            videoProgress: body.videoProgress ?? 0,
          })
          .returning();
      }

      await syncEnrollmentProgress(req.user!.id, mod.courseId);
      return res.json(row);
    } catch (error) {
      console.error("module progress POST", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Datos inválidos" });
      }
      return res.status(500).json({ message: "No se pudo guardar el progreso" });
    }
  });

  app.get("/api/modules/:id/comments", async (req, res) => {
    try {
      await ensureModuleLearningTables();
      const moduleId = Number(req.params.id);
      const rows = await db
        .select({
          id: moduleComments.id,
          moduleId: moduleComments.moduleId,
          userId: moduleComments.userId,
          body: moduleComments.body,
          createdAt: moduleComments.createdAt,
          userName: users.name,
          userImage: users.profileImage,
        })
        .from(moduleComments)
        .innerJoin(users, eq(users.id, moduleComments.userId))
        .where(eq(moduleComments.moduleId, moduleId))
        .orderBy(desc(moduleComments.createdAt));

      return res.json(rows);
    } catch (error) {
      console.error("comments GET", error);
      return res.status(500).json({ message: "No se pudieron cargar los comentarios" });
    }
  });

  app.post("/api/modules/:id/comments", requireAuth, async (req, res) => {
    try {
      await ensureModuleLearningTables();
      const moduleId = Number(req.params.id);
      const body = z
        .object({ body: z.string().trim().min(1).max(2000) })
        .parse(req.body);

      const mod = await storage.getModule(moduleId);
      if (!mod) return res.status(404).json({ message: "Módulo no encontrado" });

      const [created] = await db
        .insert(moduleComments)
        .values({
          moduleId,
          userId: req.user!.id,
          body: body.body,
        })
        .returning();

      return res.status(201).json({
        ...created,
        userName: req.user!.name,
        userImage: req.user!.profileImage,
      });
    } catch (error) {
      console.error("comments POST", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Datos inválidos" });
      }
      return res.status(500).json({ message: "No se pudo publicar el comentario" });
    }
  });

  app.delete("/api/modules/:moduleId/comments/:commentId", requireAuth, async (req, res) => {
    try {
      await ensureModuleLearningTables();
      const commentId = Number(req.params.commentId);
      const [row] = await db
        .select()
        .from(moduleComments)
        .where(eq(moduleComments.id, commentId))
        .limit(1);
      if (!row) return res.status(404).json({ message: "Comentario no encontrado" });
      if (row.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "No puedes eliminar este comentario" });
      }
      await db.delete(moduleComments).where(eq(moduleComments.id, commentId));
      return res.json({ ok: true });
    } catch (error) {
      console.error("comments DELETE", error);
      return res.status(500).json({ message: "No se pudo eliminar" });
    }
  });
}
