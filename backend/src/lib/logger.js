// Структурные JSON-логи (pino). В проде их собирает хостинг/Loki/Datadog,
// в разработке читаются через `npm run dev | npx pino-pretty`.
import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  level: config.NODE_ENV === "test" ? "silent" : config.LOG_LEVEL,
  base: { service: "emptyless-api" },
  // Секреты в логи не попадают никогда
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
