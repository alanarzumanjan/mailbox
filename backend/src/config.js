// Конфигурация из переменных окружения. Валидируем на старте:
// лучше упасть сразу с понятной ошибкой, чем в рантайме на первом запросе.
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const DEV_SECRET = "dev-jwt-secret-change-me-in-production-please";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/emptyless"),

  // Через запятую. "*" — любой origin (удобно в разработке, в проде так не надо).
  CORS_ORIGINS: z.string().default("*"),
  // За прокси (Vercel, Render, nginx) — чтобы rate limit видел реальный IP.
  TRUST_PROXY: bool.default("false"),

  // Авторизация пользователей
  JWT_SECRET: z.string().min(32).default(DEV_SECRET),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().min(1).max(120).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  GOOGLE_CLIENT_ID: optionalString,
  // Стоимость bcrypt. 12 — разумно для прода; в тестах можно 4 для скорости.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  // Устройства: без показаний дольше N минут — "датчик офлайн".
  DEVICE_OFFLINE_MINUTES: z.coerce.number().int().min(1).default(30),
  MONITOR_INTERVAL_SEC: z.coerce.number().int().min(5).default(60),

  // Уведомления (оба канала необязательны)
  RESEND_API_KEY: optionalString,
  NOTIFY_FROM_EMAIL: z.string().default("EmptyLess <onboarding@resend.dev>"),
  ALERT_WEBHOOK_URL: optionalString,

  // Эндпоинт /api/simulate для демо-кнопки "Simulate mail" на фронте.
  ENABLE_SIMULATION: bool.default("true"),
  // Сколько дней хранить сырые показания (TTL-индекс). 0 — не удалять.
  READING_RETENTION_DAYS: z.coerce.number().int().min(0).default(30),

  // Параметры экономической модели для /api/analytics/savings
  FUEL_L_PER_100KM: z.coerce.number().positive().default(9),
  FUEL_PRICE_EUR: z.coerce.number().positive().default(1.6),
  AVG_SPEED_KMH: z.coerce.number().positive().default(25),
  STOP_MINUTES: z.coerce.number().min(0).default(3),
});

// "KEY=" в .env означает "не задано", а не пустую строку
const env = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
const parsed = schema.safeParse(env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = Object.freeze(parsed.data);

if (config.NODE_ENV === "production") {
  if (config.JWT_SECRET === DEV_SECRET) {
    console.error("JWT_SECRET must be set in production");
    process.exit(1);
  }
  if (config.CORS_ORIGINS === "*") {
    console.warn("CORS_ORIGINS=* in production: any website can call the API");
  }
}
