// Rotating refresh tokens. Only a SHA-256 hash is stored, so a database leak
// yields no usable tokens. All tokens of one session share a `family`: if an old
// (already used) token shows up again, that signals theft and the whole
// family is revoked.
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
