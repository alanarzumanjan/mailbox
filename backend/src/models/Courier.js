// Couriers on shift (data/dispatchData.js → COURIERS).
import mongoose from "mongoose";

export const COURIER_STATUSES = Object.freeze(["en_route", "at_pickup", "break", "offline"]);
export const ACTIVE_COURIER_STATUSES = Object.freeze(["en_route", "at_pickup"]);

const courierSchema = new mongoose.Schema(
  {
    _id: { type: String, match: /^CR-\d{2,}$/ },
    name: { type: String, required: true, trim: true },
    district: { type: String, required: true }, // "all" means a floating courier
    zone: { type: String, required: true },
    status: { type: String, enum: COURIER_STATUSES, default: "offline" },
    note: { type: String, default: "", maxlength: 200 },
    pickups: { type: Number, min: 0, default: 0 }, // pickups this shift
  },
  { timestamps: true, versionKey: false },
);

courierSchema.methods.toApi = function toApi() {
  return {
    id: this._id,
    name: this.name,
    district: this.district,
    zone: this.zone,
    status: this.status,
    note: this.note,
    pickups: this.pickups,
  };
};

export const Courier = mongoose.model("Courier", courierSchema);
