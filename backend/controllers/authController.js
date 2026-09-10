import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/userModel.js";
import Store from "../models/storeModel.js";
import EmailVerification from "../models/emailVerificationModel.js";
import PasswordReset from "../models/passwordResetModel.js";
import generateToken from "../utils/generateToken.js";
import { generateOTP, verifyOTP } from "../utils/otp.js";
import { generateResetToken, verifyResetToken, getTokenLookup } from "../utils/password.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email/email.service.js";
import {
  validateRegister,
  validateLogin,
  validateVerifyEmail,
  validateForgotPassword,
  validateResetPassword,
  validateResendOtp,
} from "../validators/auth.validator.js";

// ─── Constants ───────────────────────────────────────────────────────────────
const OTP_EXPIRES_MINUTES  = 10;
const OTP_MAX_ATTEMPTS     = 5;
const OTP_RESEND_COOLDOWN  = 30; // seconds
const RESET_EXPIRES_HOURS  = 1;

// ─── Helper ──────────────────────────────────────────────────────────────────
const validationError = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed.",
    code: "VALIDATION_ERROR",
    errors,
  });

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Register a new user
 * @route  POST /api/auth/register
 * @access Public
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { valid, errors } = validateRegister(req.body);
  if (!valid) return validationError(res, errors);

  const { fullName, email, password, phone } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Check duplicate
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({
      success: false,
      code: "EMAIL_EXISTS",
      message: "An account with this email already exists.",
    });
  }

  // Create user — passwordHash field will be hashed by the pre-save hook
  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    passwordHash: password,        // schema pre-save hook hashes this
  });

  // Generate and send OTP
  const { otp, otpHash } = await generateOTP();
  await EmailVerification.create({
    userId:    user._id,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
    lastSentAt: new Date(),
  });

  // Send email (non-blocking: we don't fail registration if email fails in dev)
  try {
    await sendVerificationEmail(user.email, user.fullName, otp);
  } catch (emailErr) {
    // Log but don't surface internal error
    if (process.env.NODE_ENV !== "production") {
      console.error("Email send failed:", emailErr.message);
      // In development, log OTP to console so developer can test without email
      console.log(`[DEV] OTP for ${user.email}: ${otp}`);
    }
  }

  return res.status(201).json({
    success: true,
    message: "Registration successful. Please verify your email.",
    data: {
      email: user.email,
      requiresEmailVerification: true,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Verify email with OTP
 * @route  POST /api/auth/verify-email
 * @access Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { valid, errors } = validateVerifyEmail(req.body);
  if (!valid) return validationError(res, errors);

  const { email, otp } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(400).json({
      success: false,
      code: "INVALID_OTP",
      message: "Invalid or expired verification code.",
    });
  }

  if (user.emailVerified) {
    // Already verified — just log them in
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended.",
      });
    }
    user.lastLoginAt = new Date();
    await user.save();
    generateToken(res, user._id);
    return res.json({ success: true, message: "Email already verified.", data: user.toSafeObject() });
  }

  // Find the latest un-verified, non-expired OTP record
  const record = await EmailVerification.findOne({
    userId:   user._id,
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) {
    return res.status(400).json({
      success: false,
      code: "INVALID_OTP",
      message: "Verification code is invalid or has expired. Please request a new one.",
    });
  }

  // Too many attempts?
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(400).json({
      success: false,
      code: "OTP_MAX_ATTEMPTS",
      message: "Too many failed attempts. Please request a new verification code.",
    });
  }

  // Increment attempt counter before comparing (prevents timing-based enumeration)
  record.attempts += 1;
  await record.save();

  const isMatch = await verifyOTP(String(otp), record.otpHash);
  if (!isMatch) {
    const remaining = OTP_MAX_ATTEMPTS - record.attempts;
    return res.status(400).json({
      success: false,
      code: "INVALID_OTP",
      message: remaining > 0
        ? `Incorrect code. ${remaining} attempt(s) remaining.`
        : "Too many failed attempts. Please request a new verification code.",
    });
  }

  // Mark OTP as used
  record.verified = true;
  await record.save();

  // Mark user email as verified
  user.emailVerified = true;
  user.lastLoginAt   = new Date();
  await user.save();

  // Issue JWT cookie
  generateToken(res, user._id);

  return res.json({
    success: true,
    message: "Email verified successfully.",
    data: user.toSafeObject(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Resend OTP
 * @route  POST /api/auth/resend-otp
 * @access Public
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { valid, errors } = validateResendOtp(req.body);
  if (!valid) return validationError(res, errors);

  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  // Always return the same response to avoid email enumeration
  const genericOk = {
    success: true,
    message: "If an unverified account exists with this email, a new verification code has been sent.",
  };

  if (!user || user.emailVerified) {
    return res.json(genericOk);
  }

  // Enforce resend cooldown
  const lastRecord = await EmailVerification.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (lastRecord) {
    const secondsSinceLast = (Date.now() - new Date(lastRecord.lastSentAt).getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN) {
      const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN - secondsSinceLast);
      return res.status(429).json({
        success: false,
        code: "RESEND_COOLDOWN",
        message: `Please wait ${waitSeconds} second(s) before requesting a new code.`,
        waitSeconds,
      });
    }
    // Invalidate all previous OTPs for this user
    await EmailVerification.updateMany(
      { userId: user._id, verified: false },
      { $set: { expiresAt: new Date(0) } }
    );
  }

  // Generate new OTP
  const { otp, otpHash } = await generateOTP();
  await EmailVerification.create({
    userId:    user._id,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
    lastSentAt: new Date(),
  });

  try {
    await sendVerificationEmail(user.email, user.fullName, otp);
  } catch (emailErr) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Email send failed:", emailErr.message);
      console.log(`[DEV] OTP for ${user.email}: ${otp}`);
    }
  }

  return res.json(genericOk);
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Login user
 * @route  POST /api/auth/login
 * @access Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { valid, errors } = validateLogin(req.body);
  if (!valid) return validationError(res, errors);

  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
  }

  if (user.status === "suspended") {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_SUSPENDED",
      message: "Your account has been suspended. Please contact support.",
    });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before logging in.",
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  generateToken(res, user._id);

  return res.json({
    success: true,
    message: "Logged in successfully.",
    data: user.toSafeObject(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Logout user
 * @route  POST /api/auth/logout
 * @access Private
 */
export const logoutUser = asyncHandler(async (_req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires:  new Date(0),
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.json({ success: true, message: "Logged out successfully." });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Get authenticated user's profile
 * @route  GET /api/auth/me
 * @access Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  const store =
    user.role === "seller"
      ? await Store.findOne({ ownerId: user._id }).select("name slug status _id")
      : null;

  return res.json({
    success: true,
    data: {
      ...user.toSafeObject(),
      store: store
        ? { id: store._id, name: store.name, slug: store.slug, status: store.status }
        : null,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Forgot password — sends reset link
 * @route  POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { valid, errors } = validateForgotPassword(req.body);
  if (!valid) return validationError(res, errors);

  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Always return the same message to prevent email enumeration
  const genericOk = {
    success: true,
    message: "If an account exists with this email, password reset instructions have been sent.",
  };

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.json(genericOk);

  // Invalidate any existing reset tokens
  await PasswordReset.updateMany(
    { userId: user._id, used: false },
    { $set: { used: true } }
  );

  const { token, tokenLookup, tokenHash } = await generateResetToken();
  await PasswordReset.create({
    userId:      user._id,
    tokenLookup,
    tokenHash,
    expiresAt:   new Date(Date.now() + RESET_EXPIRES_HOURS * 60 * 60 * 1000),
  });

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email, user.fullName, resetUrl);
  } catch (emailErr) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Email send failed:", emailErr.message);
      console.log(`[DEV] Reset URL for ${user.email}: ${resetUrl}`);
    }
  }

  return res.json(genericOk);
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Reset password using token
 * @route  POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { valid, errors } = validateResetPassword(req.body);
  if (!valid) return validationError(res, errors);

  const { token, password } = req.body;

  // O(1) lookup via SHA-256 index, then bcrypt verify for security
  const tokenLookup = getTokenLookup(token);
  const matchedRecord = await PasswordReset.findOne({
    tokenLookup,
    used:      false,
    expiresAt: { $gt: new Date() },
  });

  if (!matchedRecord || !(await verifyResetToken(token, matchedRecord.tokenHash))) {
    return res.status(400).json({
      success: false,
      code: "INVALID_RESET_TOKEN",
      message: "This password reset link is invalid or has expired.",
    });
  }

  const user = await User.findById(matchedRecord.userId);
  if (!user) {
    return res.status(400).json({
      success: false,
      code: "INVALID_RESET_TOKEN",
      message: "This password reset link is invalid or has expired.",
    });
  }

  // Update password — pre-save hook will hash it
  user.passwordHash = password;
  await user.save();

  // Invalidate the used token
  matchedRecord.used = true;
  await matchedRecord.save();

  return res.json({
    success: true,
    message: "Password reset successfully. You can now log in with your new password.",
  });
});
