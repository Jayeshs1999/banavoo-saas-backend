/**
 * auth.validator.js
 *
 * Pure-function validators that return { valid, errors } objects.
 * Used inside controllers before any database work.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validate registration payload.
 */
export const validateRegister = (body) => {
  const errors = {};
  const { fullName, email, password, confirmPassword, phone } = body;

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  } else if (fullName.trim().length > 100) {
    errors.fullName = "Full name must not exceed 100 characters.";
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password || !PASSWORD_REGEX.test(password)) {
    errors.password =
      "Password must be at least 8 characters, include one uppercase letter and one number.";
  }

  if (!confirmPassword || confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (phone && typeof phone === "string" && phone.trim().length > 0) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = "Please enter a valid phone number.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate login payload.
 */
export const validateLogin = (body) => {
  const errors = {};
  const { email, password } = body;

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!password || typeof password !== "string" || password.length < 1) {
    errors.password = "Password is required.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate OTP verification payload.
 */
export const validateVerifyEmail = (body) => {
  const errors = {};
  const { email, otp } = body;

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!otp || !/^\d{6}$/.test(String(otp))) {
    errors.otp = "OTP must be a 6-digit number.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate forgot-password payload.
 */
export const validateForgotPassword = (body) => {
  const errors = {};
  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    errors.email = "Please enter a valid email address.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate reset-password payload.
 */
export const validateResetPassword = (body) => {
  const errors = {};
  const { token, password, confirmPassword } = body;

  if (!token || typeof token !== "string") {
    errors.token = "Reset token is required.";
  }
  if (!password || !PASSWORD_REGEX.test(password)) {
    errors.password =
      "Password must be at least 8 characters, include one uppercase letter and one number.";
  }
  if (!confirmPassword || confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate resend-otp payload.
 */
export const validateResendOtp = (body) => {
  const errors = {};
  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    errors.email = "Please enter a valid email address.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
};
