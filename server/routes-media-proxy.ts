import type { Express, Request, Response } from "express";
import { isAllowedProxyUrl } from "@shared/media-url";

type CacheEntry = {
  buffer: Buffer;
  contentType: string;
  etag: string;
  storedAt: number;
};

const MAX_CACHE_ENTRIES = 80;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en memoria del proceso
const cache = new Map<string, CacheEntry>();

function touch(key: string, entry: CacheEntry) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export function registerMediaProxyRoutes(app: Express) {
  app.get("/api/media/proxy", async (req: Request, res: Response) => {
    const raw = typeof req.query.u === "string" ? req.query.u : "";
    if (!raw || !isAllowedProxyUrl(raw)) {
      return res.status(400).json({ message: "URL no permitida" });
    }

    const cached = cache.get(raw);
    if (cached && Date.now() - cached.storedAt < TTL_MS) {
      touch(raw, cached);
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("ETag", cached.etag);
      res.setHeader("X-Media-Cache", "HIT");
      if (req.headers["if-none-match"] === cached.etag) {
        return res.status(304).end();
      }
      return res.send(cached.buffer);
    }

    try {
      const upstream = await fetch(raw, {
        headers: {
          "User-Agent": "EcosistemaWCA-MediaProxy/1.0",
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        },
        redirect: "follow",
      });

      if (!upstream.ok) {
        return res.status(upstream.status).json({ message: "No se pudo obtener la imagen" });
      }

      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
        return res.status(415).json({ message: "El recurso no es una imagen" });
      }

      const arrayBuffer = await upstream.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_BYTES) {
        return res.status(413).json({ message: "Imagen demasiado grande" });
      }

      const buffer = Buffer.from(arrayBuffer);
      const etag = `"m${buffer.length.toString(16)}-${Buffer.from(raw).toString("base64url").slice(0, 16)}"`;
      const entry: CacheEntry = {
        buffer,
        contentType,
        etag,
        storedAt: Date.now(),
      };
      touch(raw, entry);

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("ETag", etag);
      res.setHeader("X-Media-Cache", "MISS");
      return res.send(buffer);
    } catch (error) {
      console.error("[media-proxy]", error);
      return res.status(502).json({ message: "Error al obtener la imagen" });
    }
  });
}
