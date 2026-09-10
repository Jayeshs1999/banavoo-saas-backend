import mongoose from "mongoose";

/**
 * PasswordReset — stores a hashed token for password reset requests.
 * Single-use, expires after 1 hour.
 *
 * tokenLookup: SHA-256(rawToken) stored in plain hex so we can do an O(1)
 *   index lookup before the expensive bcrypt.compare() call.
 * tokenHash:   bcrypt(rawToken) for the final security verification.
 */
const passwordResetSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenLookup:  { type: String, required: true },   // SHA-256 hex — for fast DB lookup
    tokenHash:    { type: String, required: true },   // bcrypt — for final verification
    expiresAt:    { type: Date, required: true },
    used:         { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
passwordResetSchema.index({ userId: 1 });
passwordResetSchema.index({ tokenLookup: 1 });                             // fast lookup
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });   // TTL cleanup

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
export default PasswordReset;
