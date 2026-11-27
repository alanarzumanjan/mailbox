// Аутентификация: пароль или Google ID token → пара токенов.
// Access (JWT, 15 мин) — в заголовке Authorization. Refresh (случайная строка,
// 30 дней) — только для /auth/refresh, ротируется при каждом использовании.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { HttpError } from "../middleware/errors.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";

const BCRYPT_ROUNDS = config.BCRYPT_ROUNDS;
const JWT_ISSUER = "emptyless-api";
// Хэш-заглушка: сравниваем пароль даже для несуществующего пользователя,
// чтобы по времени ответа нельзя было узнать, есть ли такой email.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", BCRYPT_ROUNDS);

const invalidCredentials = () =>
  new HttpError(401, "invalid_credentials", "Wrong email or password");

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

export function signAccessToken(user) {
  return jwt.sign(
    { role: user.role, courierId: user.courierId ?? null, name: user.name },
    config.JWT_SECRET,
    {
      subject: user._id.toString(),
      issuer: JWT_ISSUER,
      expiresIn: `${config.ACCESS_TOKEN_TTL_MIN}m`,
      algorithm: "HS256",
    },
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET, { issuer: JWT_ISSUER, algorithms: ["HS256"] });
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "token_expired" : "invalid_token";
    throw new HttpError(401, code, "Access token is invalid or expired");
  }
}

async function issueRefreshToken(user, meta, family = randomToken(12)) {
  const token = randomToken(48);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(token),
    family,
    expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400_000),
    userAgent: meta.userAgent?.slice(0, 200) ?? null,
    ip: meta.ip ?? null,
  });
  return token;
}

async function issueSession(user, meta, family) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user, meta, family),
    tokenType: "Bearer",
    expiresIn: config.ACCESS_TOKEN_TTL_MIN * 60,
    user: user.toApi(),
  };
}

async function markLogin(user) {
  user.lastLoginAt = new Date();
  await user.save();
}

export async function loginWithPassword(email, password, meta) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok || !user.active) throw invalidCredentials();
  await markLogin(user);
  return issueSession(user, meta);
}

let googleClient;
export async function loginWithGoogle(idToken, meta) {
  if (!config.GOOGLE_CLIENT_ID) {
    throw new HttpError(501, "not_configured", "Google sign-in is not configured");
  }
  googleClient ??= new OAuth2Client(config.GOOGLE_CLIENT_ID);

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, "invalid_token", "Google token is invalid");
  }
  if (!payload?.email || !payload.email_verified) {
    throw new HttpError(401, "invalid_token", "Google account email is not verified");
  }

  const user = await User.findOne({ email: payload.email.toLowerCase(), active: true });
  if (!user) {
    // Самостоятельной регистрации нет: доступ выдаёт админ.
    throw new HttpError(403, "not_invited", "This Google account has no access. Ask an administrator.");
  }
  await markLogin(user);
  return issueSession(user, meta);
}

export async function refreshSession(token, meta) {
  const record = await RefreshToken.findOne({ tokenHash: sha256(token) });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new HttpError(401, "invalid_token", "Refresh token is invalid or expired");
  }

  if (record.usedAt) {
    // Токен уже обменивали — его кто-то скопировал. Отзываем всю сессию.
    await RefreshToken.updateMany({ family: record.family }, { $set: { revokedAt: new Date() } });
    logger.warn({ userId: record.userId.toString() }, "refresh token reuse detected, session revoked");
    throw new HttpError(401, "token_reused", "Session revoked, please sign in again");
  }

  // Атомарно помечаем использованным: два параллельных refresh не пройдут оба.
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: record._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  if (!claimed) throw new HttpError(401, "token_reused", "Session revoked, please sign in again");

  const user = await User.findById(record.userId);
  if (!user || !user.active) throw new HttpError(401, "invalid_token", "User is disabled");

  return issueSession(user, meta, record.family);
}

export async function logout(token) {
  const record = await RefreshToken.findOne({ tokenHash: sha256(token) });
  if (record) {
    await RefreshToken.updateMany({ family: record.family }, { $set: { revokedAt: new Date() } });
  }
}

export async function revokeAllSessions(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
