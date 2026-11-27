// Сборка Express-приложения. Отдельно от server.js, чтобы тесты
// поднимали app без listen() и без реального порта.
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
      // health и стрим не засоряют логи
      autoLogging: { ignore: (req) => req.url === "/health" || req.url.startsWith("/api/stream") },
    }),
  );
  // CSP отключаем только для Swagger UI: ему нужны inline-скрипты
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: corsOrigins === "*" ? true : corsOrigins.split(",").map((s) => s.trim()),
      exposedHeaders: ["x-request-id", "Location"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));

  app.use(createSystemRouter({ version }));

  app.use("/api", limiters.api);
  app.use("/api/auth", createAuthRouter({ limiter: limiters.auth }));
  app.use("/api/users", usersRouter);
  app.use("/api/boxes", boxesRouter);
  app.use("/api/devices", createDevicesRouter({ limiter: limiters.device }));
  app.use("/api/routes", routesRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/couriers", couriersRouter);
  app.use("/api/districts", districtsRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/analytics", createAnalyticsRouter({ economics }));
  app.use("/api/audit", auditRouter);
  app.use("/api/stream", createStreamRouter({ heartbeatMs }));
  if (enableSimulation) app.use("/api/simulate", simulateRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
