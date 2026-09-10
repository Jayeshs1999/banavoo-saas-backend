import mongoose from "mongoose";

/**
 * EmailVerification — stores hashed OTP for email verification.
 * Kept separate from User so we can reuse this pattern for other OTP flows.
 */
const emailVerificationSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    otpHash:   { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts:  { type: Number, default: 0 },
    verified:  { type: Boolean, default: false },
    // Cooldown: track when the last OTP was sent so we can enforce resend delay
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
emailVerificationSchema.index({ userId: 1 });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup

const EmailVerification = mongoose.model("EmailVerification", emailVerificationSchema);
export default EmailVerification;
