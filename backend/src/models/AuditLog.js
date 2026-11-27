// Log of administrative actions: who changed what and when.
// Needed to investigate incidents ("who revoked this sensor key?") and to give
// the customer confidence in the system. Never deleted automatically.
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, default: null }, // null means the system
    actorEmail: { type: String, default: null },
    action: { type: String, required: true }, // "box.create", "device.revoke", ...
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

auditLogSchema.methods.toApi = function toApi() {
  return {
    id: this._id.toString(),
    actorId: this.actorId,
    actorEmail: this.actorEmail,
    action: this.action,
    targetType: this.targetType,
    targetId: this.targetId,
    changes: this.changes,
    createdAt: this.createdAt,
  };
};

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
