// Лента событий диспетчера (data/dispatchData.js → INITIAL_EVENTS).
import mongoose from "mongoose";

export const EVENT_TYPES = Object.freeze(["critical", "warning", "info", "success"]);

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: EVENT_TYPES, required: true },
    // id ящика или "SYSTEM" для событий смены
    boxId: { type: String, required: true },
    message: { type: String, required: true, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

eventSchema.index({ createdAt: -1 });
eventSchema.index({ boxId: 1, createdAt: -1 });

eventSchema.methods.toApi = function toApi() {
  return {
    id: this._id.toString(),
    type: this.type,
    boxId: this.boxId,
    message: this.message,
    createdAt: this.createdAt,
  };
};

export const Event = mongoose.model("Event", eventSchema);
