// Builds the Express app. Kept separate from server.js so tests
// can run the app without listen() and a real port.
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import boxesRouter from "./routes/boxes.js";
import routesRouter from "./routes/routes.js";
import simulateRouter from "./routes/simulate.js";
import usersRouter from "./routes/users.js";
import { createAuthRouter } from "./routes/auth.js";
import { createDevicesRouter } from "./routes/devices.js";
import { createStreamRouter } from "./routes/stream.js";
import { createAnalyticsRouter } from "./routes/analytics.js";
import { createSystemRouter } from "./routes/system.js";
import {
  eventsRouter, couriersRouter, districtsRouter, statsRouter, auditRouter,
} from "./routes/dispatch.js";
import { createLimiters } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

const { version } = createRequire(import.meta.url)("../package.json");

export function createApp({
  corsOrigins = "*",
  enableSimulation = true,
  trustProxy = false,
  rateLimit = true,
  economics = { fuelLPer100Km: 9, fuelPriceEur: 1.6, avgSpeedKmh: 25, stopMinutes: 3 },
  heartbeatMs,
} = {}) {
  const app = express();
  const limiters = createLimiters({ disabled: !rateLimit });

  app.disable("x-powered-by");
  if (trustProxy) app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.get("x-request-id") ?? randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      // keep health checks and the stream out of the logs
      autoLogging: { ignore: (req) => req.url === "/health" || req.url.startsWith("/stream") },
    }),
  );
  // CSP is disabled only because Swagger UI needs inline scripts
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: corsOrigins === "*" ? true : corsOrigins.split(",").map((s) => s.trim()),
      exposedHeaders: ["x-request-id", "Location"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));

  app.use(createSystemRouter({ version }));

  app.use(limiters.api);
  app.use("/auth", createAuthRouter({ limiter: limiters.auth }));
  app.use("/users", usersRouter);
  app.use("/boxes", boxesRouter);
  app.use("/devices", createDevicesRouter({ limiter: limiters.device }));
  app.use("/routes", routesRouter);
  app.use("/events", eventsRouter);
  app.use("/couriers", couriersRouter);
  app.use("/districts", districtsRouter);
  app.use("/stats", statsRouter);
  app.use("/analytics", createAnalyticsRouter({ economics }));
  app.use("/audit", auditRouter);
  app.use("/stream", createStreamRouter({ heartbeatMs }));
  if (enableSimulation) app.use("/simulate", simulateRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
