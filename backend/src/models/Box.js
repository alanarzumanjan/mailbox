// Почтовый ящик: паспорт (адрес, координаты, ёмкость) + последнее состояние датчиков.
// История показаний хранится отдельно (Reading), здесь только "текущий снимок",
// чтобы карта и дашборд читали одну коллекцию одним запросом.
import mongoose from "mongoose";
import { STATUS } from "../domain/fill.js";

const capacitySchema = new mongoose.Schema(
  {
    maxWeightG: { type: Number, required: true, min: 1, default: 2000 },
    // Калибровка ИК-датчика для конкретного ящика (мм от датчика).
    emptyDistanceMm: { type: Number, min: 0, default: 300 },
    fullDistanceMm: { type: Number, min: 0, default: 40 },
  },
  { _id: false },
);

const stateSchema = new mongoose.Schema(
  {
    weightG: { type: Number, min: 0, default: 0 },
    distanceMm: { type: Number, min: 0, default: null },
    battery: { type: Number, min: 0, max: 100, default: null },
    fillPercent: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.NORMAL },
    // Когда ящик стал полным — для расчёта времени реакции курьера.
    fullSince: { type: Date, default: null },
    lastReadingAt: { type: Date, default: null },
    // null — датчик ещё ни разу не выходил на связь; false — пропал.
    online: { type: Boolean, default: null },
  },
  { _id: false },
);

const boxSchema = new mongoose.Schema(
  {
    _id: { type: String, match: /^MG-\d{3,}$/ }, // MG-001, как во фронте
    name: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    district: { type: String, required: true, index: true },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    capacity: { type: capacitySchema, default: () => ({}) },
    state: { type: stateSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

boxSchema.index({ "state.status": 1 });

// Плоский формат, который уже понимает фронт (data/initialBoxes.js):
// { id, name, address, district, lat, lng, weight, max, battery, ... }
boxSchema.methods.toApi = function toApi() {
  return {
    id: this._id,
    name: this.name,
    address: this.address,
    district: this.district,
    lat: this.location.lat,
    lng: this.location.lng,
    weight: this.state.weightG,
    max: this.capacity.maxWeightG,
    distance: this.state.distanceMm,
    battery: this.state.battery,
    fillPercent: this.state.fillPercent,
    status: this.state.status,
    online: this.state.online,
    fullSince: this.state.fullSince,
    updatedAt: this.state.lastReadingAt ?? this.updatedAt,
  };
};

export const Box = mongoose.model("Box", boxSchema);
