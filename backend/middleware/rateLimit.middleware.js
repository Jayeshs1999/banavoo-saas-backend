import rateLimit from "express-rate-limit";

const json429 = (req, res) => {
  res.status(429).json({
    success: false,
    code: "RATE_LIMITED",
    message: "Too many requests. Please wait and try again.",
  });
};

/** Strict limiter for sensitive auth actions (5 requests / 15 min) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

/** More lenient limiter for resend OTP (3 requests / 5 min) */
export const resendOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

/** General API limiter (100 requests / 15 min) */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});
