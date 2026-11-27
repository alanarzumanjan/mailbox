// Сырые показания датчиков. Нужны для графиков, детекта "быстрого заполнения"
// и разбора спорных случаев. Живут READING_RETENTION_DAYS (по умолчанию 30)
// через TTL-индекс, чтобы база не росла бесконечно. 0 — хранить всегда.
import mongoose from "mongoose";

const retentionDays = Number(process.env.READING_RETENTION_DAYS ?? 30);

const readingSchema = new mongoose.Schema(
  {
    boxId: { type: String, required: true, ref: "Box" },
    weightG: { type: Number, required: true, min: 0 },
    distanceMm: { type: Number, min: 0, default: null },
    battery: { type: Number, min: 0, max: 100, default: null },
    fillPercent: { type: Number, required: true },
    source: { type: String, enum: ["device", "simulation"], default: "device" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

readingSchema.index({ boxId: 1, createdAt: -1 });
if (retentionDays > 0) {
  readingSchema.index({ createdAt: 1 }, { expireAfterSeconds: retentionDays * 86400 });
}

readingSchema.methods.toApi = function toApi() {
  return {
    boxId: this.boxId,
    weight: this.weightG,
    distance: this.distanceMm,
    battery: this.battery,
    fillPercent: this.fillPercent,
    source: this.source,
    createdAt: this.createdAt,
  };
};

export const Reading = mongoose.model("Reading", readingSchema);
