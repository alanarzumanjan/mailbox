// Датчик (контроллер), установленный в ящик. У каждого свой API-ключ:
// украденный или сломанный датчик отзывается точечно, не трогая остальные.
//
// Ключ вида eld_<prefix>_<secret> показывается ОДИН раз при выдаче.
// В базе — только префикс (для поиска) и SHA-256 от полного ключа. Ключ
// длинный и случайный, поэтому медленный bcrypt тут не нужен: перебор
// невозможен, а проверка должна быть быстрой на каждом показании.
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
