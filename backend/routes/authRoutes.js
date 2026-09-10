import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter, resendOtpLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Public routes
router.post("/register",        authLimiter,      registerUser);
router.post("/login",           authLimiter,      loginUser);
router.post("/verify-email",    authLimiter,      verifyEmail);
router.post("/resend-otp",      resendOtpLimiter, resendOtp);
router.post("/forgot-password", authLimiter,      forgotPassword);
router.post("/reset-password",  authLimiter,      resetPassword);

// Private routes
router.post("/logout", protect, logoutUser);
router.get("/me",      protect, getMe);

export default router;
