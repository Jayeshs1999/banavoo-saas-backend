import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import {
  // Step 2
  createStore,
  getMyStore,
  getStoreBySlug,
  updateMyStore,
  checkSlug,
  // Step 3 — theme
  getTheme,
  updateTheme,
  // Step 3 — image uploads
  uploadLogo,
  deleteLogo,
  uploadBanner,
  deleteBanner,
  uploadFavicon,
  deleteFavicon,
  // Step 3 — full branding PATCH
  updateStoreFull,
} from "../controllers/store.controller.js";

const router = express.Router();

// ── Multer — memory storage (files never touch the disk, go straight to Cloudinary) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB hard limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."));
    }
  },
});

// ── IMPORTANT: specific /me/* sub-routes MUST come before /:slug ──────────────
// Otherwise Express matches "me" as a :slug parameter.

// ── Step 2 ────────────────────────────────────────────────────────────────────
router.post(  "/",                   protect, createStore);
router.get(   "/me",                 protect, getMyStore);
router.patch( "/me",                 protect, updateMyStore);
router.get(   "/check-slug/:slug",   protect, checkSlug);

// ── Step 3 — theme ────────────────────────────────────────────────────────────
router.get(   "/me/theme",           protect, getTheme);
router.patch( "/me/theme",           protect, updateTheme);

// ── Step 3 — full branding ────────────────────────────────────────────────────
router.patch( "/me/branding",        protect, updateStoreFull);

// ── Step 3 — image uploads (multipart/form-data field name = "image") ────────
router.post(  "/me/logo",            protect, upload.single("image"), uploadLogo);
router.delete("/me/logo",            protect, deleteLogo);
router.post(  "/me/banner",          protect, upload.single("image"), uploadBanner);
router.delete("/me/banner",          protect, deleteBanner);
router.post(  "/me/favicon",         protect, upload.single("image"), uploadFavicon);
router.delete("/me/favicon",         protect, deleteFavicon);

// ── Public slug lookup (must be last) ─────────────────────────────────────────
router.get(   "/:slug",                       getStoreBySlug);

export default router;
