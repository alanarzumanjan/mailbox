// Факт выемки: кто, когда, сколько забрал и как быстро отреагировал.
// Из этой коллекции считается "Avg response" на дашборде диспетчера.
import mongoose from "mongoose";

const pickupSchema = new mongoose.Schema(
  {
    boxId: { type: String, required: true, ref: "Box" },
    courierId: { type: String, default: null, ref: "Courier" },
    weightG: { type: Number, min: 0, required: true },
    fillPercent: { type: Number, min: 0, max: 100, required: true },
    // Время от "ящик стал полным" до выемки. null — если забрали до заполнения.
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
