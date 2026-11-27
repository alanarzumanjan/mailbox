// System users. There is no public sign-up (B2B): an admin creates users;
// they sign in with a password or with Google for an email that already exists.
import mongoose from "mongoose";

export const ROLES = Object.freeze(["admin", "dispatcher", "courier"]);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: ROLES, required: true },
    // bcrypt hash. null means Google sign-in only.
    passwordHash: { type: String, default: null, select: false },
    // For the courier role: which courier profile they act as (pickups, counters).
    courierId: { type: String, default: null, ref: "Courier" },
    // Receive emails about critical events (admin/dispatcher only).
    notifyEmail: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.toApi = function toApi() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    role: this.role,
    courierId: this.courierId,
    notifyEmail: this.notifyEmail,
    active: this.active,
    lastLoginAt: this.lastLoginAt,
  };
};

export const User = mongoose.model("User", userSchema);
