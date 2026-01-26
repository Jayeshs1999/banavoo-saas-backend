import express from "express";
import {
  authAdmin,
  registerAdmin,
  getAdminProfile,
  updateAdminProfile,
  forgotPassword,
  resetPassword,
  verifyMobileOtp,
  verifyEmailOtp,
  sendMobileOtp,
  sendEmailOtp,
} from "../controllers/adminController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: Admin authentication and management
 */

/**
 * @swagger
 * /api/admins/auth:
 *   post:
 *     summary: Admin login
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/auth", authAdmin);

/**
 * @swagger
 * /api/admins/register:
 *   post:
 *     summary: Register new admin
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pgName
 *               - ownerName
 *               - email
 *               - mobile
 *               - password
 *               - address
 *             properties:
 *               pgName:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               address:
 *                 type: object
 *                 properties:
 *                   area:
 *                     type: string
 *                   landmark:
 *                     type: string
 *                   city:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   state:
 *                     type: string
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Admin already exists
 */
router.post("/register", registerAdmin);

/**
 * @swagger
 * /api/admins/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset token sent
 *       404:
 *         description: Admin not found
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/admins/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /api/admins/send-mobile-otp:
 *   post:
 *     summary: Send mobile OTP
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *             properties:
 *               mobile:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       404:
 *         description: Admin not found
 */
router.post("/send-mobile-otp", sendMobileOtp);

/**
 * @swagger
 * /api/admins/verify-mobile-otp:
 *   post:
 *     summary: Verify mobile OTP
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *               - otp
 *             properties:
 *               mobile:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mobile verified successfully
 *       400:
 *         description: Invalid OTP
 */
router.post("/verify-mobile-otp", verifyMobileOtp);

/**
 * @swagger
 * /api/admins/send-email-otp:
 *   post:
 *     summary: Send email OTP
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       404:
 *         description: Admin not found
 */
router.post("/send-email-otp", sendEmailOtp);

/**
 * @swagger
 * /api/admins/verify-email-otp:
 *   post:
 *     summary: Verify email OTP
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid OTP
 */
router.post("/verify-email-otp", verifyEmailOtp);

/**
 * @swagger
 * /api/admins/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Admin not found
 */
router.get("/profile", protectAdmin, getAdminProfile);

/**
 * @swagger
 * /api/admins/profile:
 *   put:
 *     summary: Update admin profile
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pgName:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   area:
 *                     type: string
 *                   landmark:
 *                     type: string
 *                   city:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   state:
 *                     type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Admin not found
 */
router.put("/profile", protectAdmin, updateAdminProfile);

export default router;
