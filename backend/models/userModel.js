import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User model template.
 * Add or remove fields to match your application's data model.
 */
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password:  { type: String, required: true },
    mobile:    { type: String },
    role:      { type: String, enum: ["user", "admin", "super_admin"], default: "user" },
    isActive:  { type: Boolean, default: true },
    // TODO: Add more fields as needed
  },
  { timestamps: true }
);

// ── Hash password before saving ─────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare passwords ──────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
