import express from "express";
import {
  createContactMessage,
  getContactMessages,
  getContactMessageById,
  updateContactStatus,
  deleteContactMessage,
} from "../controllers/contactController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Contact message management
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Send contact message
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Contact message sent successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", createContactMessage);

/**
 * @swagger
 * /api/contact:
 *   get:
 *     summary: Get all contact messages
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contact messages
 *       401:
 *         description: Not authorized
 */
router.get("/", getContactMessages);

/**
 * @swagger
 * /api/contact/{id}:
 *   get:
 *     summary: Get contact message by ID
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact message ID
 *     responses:
 *       200:
 *         description: Contact message details
 *       404:
 *         description: Contact message not found
 */
router.get("/:id", getContactMessageById);

/**
 * @swagger
 * /api/contact/{id}/status:
 *   put:
 *     summary: Update contact message status
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact message ID
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
 *                 enum: [pending, read, replied]
 *     responses:
 *       200:
 *         description: Contact message status updated
 *       404:
 *         description: Contact message not found
 */
router.put("/:id/status", updateContactStatus);

/**
 * @swagger
 * /api/contact/{id}:
 *   delete:
 *     summary: Delete contact message
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact message ID
 *     responses:
 *       200:
 *         description: Contact message deleted
 *       404:
 *         description: Contact message not found
 */
router.delete("/:id", deleteContactMessage);

export default router;
