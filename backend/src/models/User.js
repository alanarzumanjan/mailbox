// Пользователи системы. Регистрации "с улицы" нет (B2B): пользователей заводит
// админ, вход — по паролю или через Google для уже заведённого email.
import mongoose from "mongoose";

export const ROLES = Object.freeze(["admin", "dispatcher", "courier"]);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: ROLES, required: true },
    // bcrypt-хэш. null — вход только через Google.
    passwordHash: { type: String, default: null, select: false },
    // Для роли courier: какой профиль курьера он ведёт (выемки, счётчики).
    courierId: { type: String, default: null, ref: "Courier" },
    // Получать письма о критических событиях (только admin/dispatcher).
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
