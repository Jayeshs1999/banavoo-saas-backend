import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * generateResetToken — generates a cryptographically random reset token.
 *
 * Returns:
 *   token       — plain hex string to embed in the reset URL (never stored)
 *   tokenLookup — SHA-256(token) in hex, stored in DB for O(1) index lookup
 *   tokenHash   — bcrypt(token), stored in DB for final security verification
 */
export const generateResetToken = async () => {
  const token       = crypto.randomBytes(32).toString("hex");
  const tokenLookup = crypto.createHash("sha256").update(token).digest("hex");
  const salt        = await bcrypt.genSalt(10);
  const tokenHash   = await bcrypt.hash(token, salt);
  return { token, tokenLookup, tokenHash };
};

/**
 * getTokenLookup — derives the SHA-256 lookup key from a plain token.
 * Used when verifying a submitted token to do the fast DB query first.
 */
export const getTokenLookup = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * verifyResetToken — compares a plain token against the stored bcrypt hash.
 */
export const verifyResetToken = async (plainToken, tokenHash) => {
  return bcrypt.compare(plainToken, tokenHash);
};
