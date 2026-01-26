import express from "express";
import {
  createPG,
  getPGs,
  getPGById,
  updatePG,
  deletePG,
  searchPGs,
  getAdminPGs,
} from "../controllers/pgController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: PGs
 *   description: PG management
 */

/**
 * @swagger
 * /api/pgs:
 *   post:
 *     summary: Create a new PG
 *     tags: [PGs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - structure
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the PG
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of photo URLs
 *                 default: []
 *               structure:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - name
 *                     - beds
 *                     - price
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                       description: Room name
 *                     beds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - id
 *                           - price
 *                         properties:
 *                           id:
 *                             type: string
 *                           allocated:
 *                             type: boolean
 *                             default: false
 *                           price:
 *                             type: number
 *                             minimum: 0
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                     pricingPeriod:
 *                       type: string
 *                       enum: [day, month]
 *                       default: month
 *               onlinePayment:
 *                 type: boolean
 *                 default: false
 *               location:
 *                 type: object
 *                 required:
 *                   - subcity
 *                   - city
 *                   - state
 *                   - country
 *                 properties:
 *                   subcity:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                     default: India
 *     responses:
 *       201:
 *         description: PG created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 */
router.post("/", protectAdmin, createPG);

/**
 * @swagger
 * /api/pgs:
 *   get:
 *     summary: Get all PGs
 *     tags: [PGs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all PGs
 *       401:
 *         description: Not authorized
 */
router.get("/", protectAdmin, getPGs);

/**
 * @swagger
 * /api/pgs/admin:
 *   get:
 *     summary: Get PGs for authenticated admin
 *     tags: [PGs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admin's PGs
 *       401:
 *         description: Not authorized
 */
router.get("/admin", protectAdmin, getAdminPGs);

/**
 * @swagger
 * /api/pgs/{id}:
 *   get:
 *     summary: Get PG by ID
 *     tags: [PGs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PG ID
 *     responses:
 *       200:
 *         description: PG details
 *       401:
 *         description: Not authorized
 *       404:
 *         description: PG not found
 */
router.get("/:id", protectAdmin, getPGById);

/**
 * @swagger
 * /api/pgs/{id}:
 *   put:
 *     summary: Update PG
 *     tags: [PGs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PG ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               structure:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     beds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           allocated:
 *                             type: boolean
 *                           price:
 *                             type: number
 *                     price:
 *                       type: number
 *                     pricingPeriod:
 *                       type: string
 *                       enum: [day, month]
 *               onlinePayment:
 *                 type: boolean
 *               location:
 *                 type: object
 *                 properties:
 *                   subcity:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *     responses:
 *       200:
 *         description: PG updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 *       404:
 *         description: PG not found
 */
router.put("/:id", protectAdmin, updatePG);

/**
 * @swagger
 * /api/pgs/{id}:
 *   delete:
 *     summary: Delete PG
 *     tags: [PGs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PG ID
 *     responses:
 *       200:
 *         description: PG deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: PG not found
 */
router.delete("/:id", protectAdmin, deletePG);

/**
 * @swagger
 * /api/pgs/search:
 *   get:
 *     summary: Search PGs by location
 *     tags: [PGs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City to search
 *       - in: query
 *         name: subcity
 *         schema:
 *           type: string
 *         description: Subcity to search
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State to search
 *     responses:
 *       200:
 *         description: Search results
 *       401:
 *         description: Not authorized
 */
router.get("/search", protectAdmin, searchPGs);

export default router;
