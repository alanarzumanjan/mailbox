// Аутентификация (кто это) и авторизация (что ему можно).
import { HttpError } from "./errors.js";
import { verifyAccessToken } from "../services/auth.js";

function readToken(req) {
  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

// req.user = { id, role, courierId, name }
export function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) throw new HttpError(401, "unauthorized", "Missing Bearer token");
  const claims = verifyAccessToken(token);
  req.user = { id: claims.sub, role: claims.role, courierId: claims.courierId, name: claims.name };
  next();
}

// EventSource в браузере не умеет ставить заголовки, поэтому для SSE
// токен допускается в query (?access_token=). Только для этого эндпоинта.
export function authenticateStream(req, res, next) {
  const token = readToken(req) ?? req.query.access_token;
  if (!token) throw new HttpError(401, "unauthorized", "Missing access token");
  const claims = verifyAccessToken(String(token));
  req.user = { id: claims.sub, role: claims.role, courierId: claims.courierId, name: claims.name };
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) throw new HttpError(401, "unauthorized", "Not authenticated");
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, "forbidden", `Requires role: ${roles.join(" or ")}`);
    }
    next();
  };

// Готовые наборы прав, чтобы в роутах читалось по смыслу
export const ROLE = Object.freeze({
  staff: requireRole("admin", "dispatcher", "courier"),
  dispatch: requireRole("admin", "dispatcher"),
  admin: requireRole("admin"),
});
