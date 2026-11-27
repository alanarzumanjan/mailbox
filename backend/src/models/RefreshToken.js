// Refresh-токены с ротацией. Храним только SHA-256 хэш: утечка базы не даёт
// готовых токенов. Все токены одной сессии связаны `family` — если старый
// (уже использованный) токен приходит снова, это признак кражи, и вся
// семья отзывается.
import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
