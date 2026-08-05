import express from "express";
import {
  createGalleryPhoto,
  getGalleryPhotos,
  deleteGalleryPhoto,
  getGalleryCities,
} from "../controllers/galleryController.js";
import { protectAdmin, superAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Gallery
 *   description: PG owner visit gallery
 */

// ── Public (any visitor) ────────────────────────────────────────
router.get("/", getGalleryPhotos);
router.get("/cities", getGalleryCities);

// ── Super-admin only ────────────────────────────────────────────
router.post("/",    protectAdmin, superAdmin, upload.single("image"), createGalleryPhoto);
router.delete("/:id", protectAdmin, superAdmin, deleteGalleryPhoto);

export default router;
