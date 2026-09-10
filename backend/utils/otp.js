import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * generateOTP — generates a cryptographically random 6-digit OTP string.
 * Returns the plain OTP (to send in email) and a bcrypt hash (to store in DB).
 */
export const generateOTP = async () => {
  // Use crypto.randomInt for a uniform distribution in [100000, 999999]
  const otp = String(crypto.randomInt(100000, 1000000)).padStart(6, "0");
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  return { otp, otpHash };
};

/**
 * verifyOTP — compares a plain OTP against the stored bcrypt hash.
 */
export const verifyOTP = async (plainOtp, otpHash) => {
  return bcrypt.compare(plainOtp, otpHash);
};
