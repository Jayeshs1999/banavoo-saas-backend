import express from "express";
import multer from "multer";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getSellerCategories,
  getSellerCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  deleteCategoryImage,
} from "../controllers/category.controller.js";

const router = express.Router();

// ── Multer — memory storage for category images ───────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPEG, PNG, and WebP images are allowed."), allowed.includes(file.mimetype));
  },
});

// All routes require authentication + seller role
router.use(protect, requireRole("seller", "admin"));

router.route("/")
  .get(getSellerCategories)
  .post(createCategory);

router.route("/:id")
  .get(getSellerCategory)
  .patch(updateCategory)
  .delete(deleteCategory);

router.post(  "/:id/image", upload.single("image"), uploadCategoryImage);
router.delete("/:id/image", deleteCategoryImage);

export default router;
