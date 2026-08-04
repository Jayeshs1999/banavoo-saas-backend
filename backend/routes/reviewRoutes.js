import express from "express";
import {
  sendReviewInvite,
  getReviewByToken,
  submitReview,
  getPGReviews,
  getAdminReviews,
} from "../controllers/reviewController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: PG review management
 */

// ──────────────────── Public routes (no auth) ────────────────────

/**
 * @swagger
 * /api/reviews/pg/{pgId}:
 *   get:
 *     summary: Get all submitted reviews for a PG
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: pgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews with average rating
 */
router.get("/pg/:pgId", getPGReviews);

/**
 * @swagger
 * /api/reviews/invite/{token}:
 *   get:
 *     summary: Get review page context by invite token
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review context (PG info, reviewer name, already submitted flag)
 *       404:
 *         description: Invalid or expired token
 */
router.get("/invite/:token", getReviewByToken);

/**
 * @swagger
 * /api/reviews/submit/{token}:
 *   post:
 *     summary: Submit a review using the invite token (public)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Review submitted successfully
 *       400:
 *         description: Already submitted or invalid rating
 *       404:
 *         description: Invalid token
 */
router.post("/submit/:token", submitReview);

// ──────────────────── Protected routes (admin) ───────────────────

/**
 * @swagger
 * /api/reviews/admin:
 *   get:
 *     summary: Get all review invites for the admin's PGs
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of review invites
 *       401:
 *         description: Not authorized
 */
router.get("/admin", protectAdmin, getAdminReviews);

/**
 * @swagger
 * /api/reviews/invite/{bookingId}:
 *   post:
 *     summary: Admin sends a review invite for a booking
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite sent
 *       400:
 *         description: Not an approved booking
 *       403:
 *         description: Not authorised
 *       404:
 *         description: Booking not found
 */
router.post("/invite/:bookingId", protectAdmin, sendReviewInvite);

export default router;
