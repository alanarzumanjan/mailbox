// Ограничение частоты запросов. Хранилище в памяти процесса: для одного
// инстанса достаточно; при горизонтальном масштабировании нужен Redis-store.
import rateLimit from "express-rate-limit";

const handler = (req, res) =>
  res.status(429).json({ error: { code: "rate_limited", message: "Too many requests, slow down" } });

const base = { standardHeaders: "draft-7", legacyHeaders: false, handler };

export function createLimiters({ disabled = false } = {}) {
  if (disabled) {
    const pass = (req, res, next) => next();
    return { api: pass, auth: pass, device: pass };
  }
  return {
    // Общий лимит на API
    api: rateLimit({ ...base, windowMs: 60_000, limit: 600 }),
    // Логин: защита от перебора паролей
    auth: rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 }),
    // Устройство шлёт раз в минуту; 60/мин с запасом на пачку после реконнекта
    device: rateLimit({
      ...base,
      windowMs: 60_000,
      limit: 60,
      keyGenerator: (req) => req.get("x-device-key")?.slice(0, 12) ?? req.ip,
    }),
  };
}
