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

// Empty database in development: seed demo data right away so that
// `docker compose up` gives a working API with no manual steps.
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
  // In-flight requests get time to finish; SSE streams never end, so they
  // are cut after 3 s and the browser reconnects to the new instance.
  setTimeout(() => server.closeAllConnections(), 3000).unref();
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));
