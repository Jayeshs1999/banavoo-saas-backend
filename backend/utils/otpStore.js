/**
 * In-memory OTP store for pre-registration email verification.
 * Entries expire after 10 minutes automatically.
 */

const store = new Map(); // email → { otp, expiresAt }
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export const setPreRegOtp = (email, otp) => {
  store.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + TTL_MS,
  });
};

export const verifyPreRegOtp = (email, otp) => {
  const entry = store.get(email.toLowerCase());
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(email.toLowerCase());
    return false;
  }
  if (entry.otp !== otp) return false;
  store.delete(email.toLowerCase()); // one-time use
  return true;
};

export const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
