// Районы для фильтра и центровки карты (data/districts.js → DISTRICTS).
import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    _id: { type: String, match: /^[a-z0-9-]+$/ },
    label: { type: String, required: true },
    center: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    zoom: { type: Number, min: 1, max: 20, default: 13 },
  },
  { versionKey: false },
);

districtSchema.methods.toApi = function toApi() {
  return {
    id: this._id,
    label: this.label,
    center: [this.center.lat, this.center.lng], // формат Leaflet, как во фронте
    zoom: this.zoom,
  };
};

export const District = mongoose.model("District", districtSchema);
