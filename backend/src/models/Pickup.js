// A pickup record: who, when, how much was collected and how fast they responded.
// The dispatcher dashboard "Avg response" is computed from this collection.
import mongoose from "mongoose";

const pickupSchema = new mongoose.Schema(
  {
    boxId: { type: String, required: true, ref: "Box" },
    courierId: { type: String, default: null, ref: "Courier" },
    weightG: { type: Number, min: 0, required: true },
    fillPercent: { type: Number, min: 0, max: 100, required: true },
    // Time from "box became full" to pickup. null if collected before it was full.
    responseMin: { type: Number, min: 0, default: null },
    collectedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

pickupSchema.index({ collectedAt: -1 });
pickupSchema.index({ boxId: 1, collectedAt: -1 });

pickupSchema.methods.toApi = function toApi() {
  return {
    id: this._id.toString(),
    boxId: this.boxId,
    courierId: this.courierId,
    weight: this.weightG,
    fillPercent: this.fillPercent,
    responseMin: this.responseMin,
    collectedAt: this.collectedAt,
  };
};

export const Pickup = mongoose.model("Pickup", pickupSchema);
