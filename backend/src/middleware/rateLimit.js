// Request rate limiting. In-memory store: fine for a single instance;
// horizontal scaling needs a Redis store.
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
    // General API limit
    api: rateLimit({ ...base, windowMs: 60_000, limit: 600 }),
    // Login: brute-force protection
    auth: rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 }),
    // A device reports once a minute; 60/min leaves room for a burst after reconnect
    device: rateLimit({
      ...base,
      windowMs: 60_000,
      limit: 60,
      keyGenerator: (req) => req.get("x-device-key")?.slice(0, 12) ?? req.ip,
    }),
  };
}
