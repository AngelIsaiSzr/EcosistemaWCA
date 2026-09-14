import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { certificates, courses } from "@shared/schema";
import { storage } from "./storage";
import { ensureCertificatesAndEnrollmentActivity } from "./db/ensure-certificates";
import {
  buildCertificatePdf,
  makeCertificateCode,
} from "./services/certificate-pdf";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Debes iniciar sesión" });
  }
  next();
}

export async function issueCertificateIfEligible(
  userId: number,
  courseId: number,
  studentName: string,
): Promise<typeof certificates.$inferSelect | null> {
  await ensureCertificatesAndEnrollmentActivity();

  const enrollment = await storage.getEnrollmentByCourseAndUser(courseId, userId);
  if (!enrollment || !enrollment.completed || enrollment.progress < 100) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
    .limit(1);
  if (existing) return existing;

  const course = await storage.getCourse(courseId);
  if (!course) return null;

  const [created] = await db
    .insert(certificates)
    .values({
      userId,
      courseId,
      enrollmentId: enrollment.id,
      code: makeCertificateCode(userId, courseId),
      studentName: studentName.trim() || "Estudiante",
      programTitle: course.title,
    })
    .returning();

  return created ?? null;
}

export function registerCertificateRoutes(app: Express) {
  ensureCertificatesAndEnrollmentActivity().catch((err) => {
    console.error("No se pudo asegurar certificados:", err);
  });

  app.get("/api/certificates", requireAuth, async (req, res) => {
    try {
      await ensureCertificatesAndEnrollmentActivity();
      const rows = await db
        .select({
          id: certificates.id,
          userId: certificates.userId,
          courseId: certificates.courseId,
          enrollmentId: certificates.enrollmentId,
          code: certificates.code,
          studentName: certificates.studentName,
          programTitle: certificates.programTitle,
          issuedAt: certificates.issuedAt,
          programSlug: courses.slug,
          programImage: courses.image,
          programCategory: courses.category,
        })
        .from(certificates)
        .innerJoin(courses, eq(courses.id, certificates.courseId))
        .where(eq(certificates.userId, req.user!.id))
        .orderBy(desc(certificates.issuedAt));

      return res.json(rows);
    } catch (error) {
      console.error("certificates GET", error);
      return res.status(500).json({ message: "No se pudieron cargar los certificados" });
    }
  });

  app.post("/api/programs/:courseId/certificate", requireAuth, async (req, res) => {
    try {
      const courseId = Number(req.params.courseId);
      const cert = await issueCertificateIfEligible(
        req.user!.id,
        courseId,
        req.user!.name,
      );
      if (!cert) {
        return res.status(400).json({
          message: "Debes completar el 100% del programa para obtener el certificado",
        });
      }
      return res.json(cert);
    } catch (error) {
      console.error("certificate issue", error);
      return res.status(500).json({ message: "No se pudo emitir el certificado" });
    }
  });

  app.get("/api/certificates/:id/pdf", requireAuth, async (req, res) => {
    try {
      await ensureCertificatesAndEnrollmentActivity();
      const id = Number(req.params.id);
      const [cert] = await db
        .select()
        .from(certificates)
        .where(eq(certificates.id, id))
        .limit(1);

      if (!cert) return res.status(404).json({ message: "Certificado no encontrado" });
      if (cert.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "No autorizado" });
      }

      const bytes = await buildCertificatePdf(cert);
      const filename = `certificado-wca-${cert.code}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(Buffer.from(bytes));
    } catch (error) {
      console.error("certificate PDF", error);
      return res.status(500).json({ message: "No se pudo generar el PDF" });
    }
  });
}
