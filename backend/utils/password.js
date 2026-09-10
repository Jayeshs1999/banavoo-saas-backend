import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * generateResetToken — generates a cryptographically random reset token.
 * Returns the plain token (to include in email URL) and a bcrypt hash (to store in DB).
 */
export const generateResetToken = async () => {
  const token = crypto.randomBytes(32).toString("hex");
  const salt = await bcrypt.genSalt(10);
  const tokenHash = await bcrypt.hash(token, salt);
  return { token, tokenHash };
};

/**
 * verifyResetToken — compares a plain token against the stored bcrypt hash.
 */
export const verifyResetToken = async (plainToken, tokenHash) => {
  return bcrypt.compare(plainToken, tokenHash);
};
