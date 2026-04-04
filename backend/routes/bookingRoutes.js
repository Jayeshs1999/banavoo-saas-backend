import express from "express";
import {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAdminBookings,
  getPGBookings,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import { protectUser, protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking (User only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pgId
 *               - roomId
 *               - bedId
 *               - joinDate
 *               - stayDays
 *             properties:
 *               pgId:
 *                 type: string
 *               roomId:
 *                 type: string
 *               bedId:
 *                 type: string
 *               joinDate:
 *                 type: string
 *                 format: date
 *               stayDays:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 365
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               paymentMethod:
 *                 type: string
 *                 enum: [online, cash]
 *                 default: cash
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 *       404:
 *         description: PG/Room/Bed not found
 */
router.post("/", protectUser, createBooking);

/**
 * @swagger
 * /api/bookings/my-bookings:
 *   get:
 *     summary: Get user's own bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bookings
 *       401:
 *         description: Not authorized
 */
router.get("/my-bookings", protectUser, getMyBookings);

/**
 * @swagger
 * /api/bookings/admin:
 *   get:
 *     summary: Get all bookings for admin's PGs
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings for admin's PGs
 *       401:
 *         description: Not authorized (Admin only)
 */
router.get("/admin", protectAdmin, getAdminBookings);

/**
 * @swagger
 * /api/bookings/pg/{pgId}:
 *   get:
 *     summary: Get bookings for a specific PG
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of bookings for the PG
 *       401:
 *         description: Not authorized
 *       404:
 *         description: PG not found
 */
router.get("/pg/:pgId", protectAdmin, getPGBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.get("/:id", protectUser, getBooking);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   put:
 *     summary: Cancel a booking (User only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.put("/:id/cancel", protectUser, cancelBooking);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   put:
 *     summary: Update booking status (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, cancelled]
 *     responses:
 *       200:
 *         description: Booking status updated
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.put("/:id/status", protectAdmin, updateBookingStatus);

export default router;
