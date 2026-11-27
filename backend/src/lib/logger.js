// Structured JSON logs (pino). In production the host/Loki/Datadog collects them;
// in development read them with `npm run dev | npx pino-pretty`.
import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  level: config.NODE_ENV === "test" ? "silent" : config.LOG_LEVEL,
  base: { service: "emptyless-api" },
  // Secrets never reach the logs
  redact: {
    paths: [
      "req.headers.authorization",
      'req.headers["x-device-key"]',
      "req.headers.cookie",
      "*.password",
      "*.refreshToken",
      "*.apiKey",
    ],
    censor: "[redacted]",
  },
});
