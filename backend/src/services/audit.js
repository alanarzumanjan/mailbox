import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/User.js";
import { logger } from "../lib/logger.js";

// Never store secrets in the log, even if they slipped into changes.
const SECRET_KEYS = new Set(["password", "passwordHash", "apiKey", "keyHash", "refreshToken"]);

function scrub(obj) {
  if (!obj || typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, SECRET_KEYS.has(k) ? "[redacted]" : scrub(v)]),
  );
}

/**
 * Record an action. An audit failure must not break the main action,
 * so it is logged but not rethrown.
 */
export async function audit(req, action, targetType, targetId, changes = null) {
  try {
    let actorEmail = null;
    if (req?.user?.id) {
      actorEmail = (await User.findById(req.user.id).select("email").lean())?.email ?? null;
    }
    await AuditLog.create({
      actorId: req?.user?.id ?? null,
      actorEmail,
      action,
      targetType,
      targetId: String(targetId),
      changes: scrub(changes),
      ip: req?.ip ?? null,
    });
  } catch (err) {
    logger.error({ err, action, targetId }, "audit log write failed");
  }
}
