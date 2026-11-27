// Sensor (controller) installed in a box. Each has its own API key:
// a stolen or broken device is revoked individually without touching the others.
//
// A key looks like eld_<prefix>_<secret> and is shown ONCE when provisioned.
// The database stores only the prefix (for lookup) and a SHA-256 of the full key.
// The key is long and random, so slow bcrypt is unnecessary: brute force
// is infeasible, and the check must be fast on every reading.
import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    _id: { type: String, match: /^DEV-\d{3,}$/ },
    boxId: { type: String, required: true, ref: "Box", index: true },
    name: { type: String, default: "Sensor", maxlength: 80 },
    keyPrefix: { type: String, required: true, unique: true },
    keyHash: { type: String, required: true, select: false },
    firmware: { type: String, default: null, maxlength: 40 },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    lastSeenAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

deviceSchema.index({ status: 1, lastSeenAt: 1 });

deviceSchema.methods.toApi = function toApi() {
  return {
    id: this._id,
    boxId: this.boxId,
    name: this.name,
    keyPrefix: this.keyPrefix,
    firmware: this.firmware,
    status: this.status,
    lastSeenAt: this.lastSeenAt,
    createdAt: this.createdAt,
  };
};

export const Device = mongoose.model("Device", deviceSchema);
