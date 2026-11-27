import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { z } from "zod";
import { registry, json, buildOpenApiDocument } from "../lib/openapi.js";
import { isDbReady } from "../db.js";

export function createSystemRouter({ version }) {
  const router = Router();
  const started = Date.now();

  const Health = z.object({
    status: z.enum(["ok", "degraded"]),
    db: z.boolean(),
    version: z.string(),
    uptimeSec: z.number(),
  });
  registry.registerPath({
    method: "get",
    path: "/health",
    tags: ["System"],
    summary: "Liveness/readiness for Docker and the host",
    responses: { 200: json(Health), 503: json(Health, "Database unavailable") },
  });
  router.get("/health", (req, res) => {
    const db = isDbReady();
    res.status(db ? 200 : 503).json({
      status: db ? "ok" : "degraded",
      db,
      version,
      uptimeSec: Math.round((Date.now() - started) / 1000),
    });
  });

  // Документ строится лениво: к первому запросу все роуты уже зарегистрированы.
  let doc;
  const getDoc = () => (doc ??= buildOpenApiDocument());
  router.get("/openapi.json", (req, res) => res.json(getDoc()));
  router.use("/docs", swaggerUi.serve, (req, res, next) =>
    swaggerUi.setup(getDoc(), { customSiteTitle: "EmptyLess API" })(req, res, next),
  );

  return router;
}
