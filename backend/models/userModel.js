import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User model — Banavoo SaaS
 *
 * Designed for multi-tenant future: store-specific fields (storeName, slug, etc.)
 * belong to the future Store model, NOT here.
 */
const userSchema = new mongoose.Schema(
  {
    fullName:      { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:         { type: String, trim: true, default: null },
    passwordHash:  { type: String, required: true },

    emailVerified: { type: Boolean, default: false },

    role:   { type: String, enum: ["buyer", "seller", "admin"], default: "buyer" },
    status: { type: String, enum: ["active", "suspended"],      default: "active" },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });

// ── Hash password before saving ─────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// ── Instance method: compare passwords ──────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

// ── Ensure passwordHash is never leaked ─────────────────────────────────────
userSchema.methods.toSafeObject = function () {
  return {
    id:            this._id,
    fullName:      this.fullName,
    email:         this.email,
    phone:         this.phone,
    emailVerified: this.emailVerified,
    role:          this.role,
    status:        this.status,
    lastLoginAt:   this.lastLoginAt,
    createdAt:     this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;
