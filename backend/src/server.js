import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { connectDb, disconnectDb } from "./db.js";
import { createApp } from "./app.js";
import { Box } from "./models/Box.js";
import { seedDatabase } from "./seed/seed.js";
import { startMonitor } from "./services/monitor.js";
import { createNotifier } from "./services/notifications.js";

await connectDb(config.MONGODB_URI);
logger.info("MongoDB connected");

// Пустая база в разработке — сразу наполняем демо-данными, чтобы
// `docker compose up` давал рабочий API без ручных шагов.
if (config.NODE_ENV !== "production" && (await Box.estimatedDocumentCount()) === 0) {
  await seedDatabase();
}

const notifier = createNotifier({
  resendApiKey: config.RESEND_API_KEY,
  fromEmail: config.NOTIFY_FROM_EMAIL,
  webhookUrl: config.ALERT_WEBHOOK_URL,
});
notifier.start();
logger.info({ channels: notifier.channels }, "notifications ready");

const stopMonitor = startMonitor({
  offlineMinutes: config.DEVICE_OFFLINE_MINUTES,
  intervalSec: config.MONITOR_INTERVAL_SEC,
});

const app = createApp({
  corsOrigins: config.CORS_ORIGINS,
  enableSimulation: config.ENABLE_SIMULATION,
  trustProxy: config.TRUST_PROXY,
  economics: {
    fuelLPer100Km: config.FUEL_L_PER_100KM,
    fuelPriceEur: config.FUEL_PRICE_EUR,
    avgSpeedKmh: config.AVG_SPEED_KMH,
    stopMinutes: config.STOP_MINUTES,
  },
});

const server = app.listen(config.PORT, () => {
  logger.info(`EmptyLess API on :${config.PORT} — docs at /docs`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  stopMonitor();
  notifier.stop();
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  // Текущие запросы успевают завершиться; SSE-потоки бесконечны —
  // их обрываем через 3 с, браузер сам переподключится к новому инстансу.
  setTimeout(() => server.closeAllConnections(), 3000).unref();
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));
