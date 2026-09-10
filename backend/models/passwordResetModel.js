import mongoose from "mongoose";

/**
 * PasswordReset — stores a hashed token for password reset requests.
 * Single-use, expires after 1 hour.
 */
const passwordResetSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash:  { type: String, required: true },
    expiresAt:  { type: Date, required: true },
    used:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
passwordResetSchema.index({ userId: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
export default PasswordReset;
