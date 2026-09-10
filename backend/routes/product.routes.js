import express from "express";
import multer from "multer";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import {
  createProduct,
  getSellerProducts,
  getSellerProduct,
  updateProduct,
  archiveProduct,
  duplicateProduct,
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
  setVariants,
  // public
  getPublicProducts,
  getPublicProduct,
  getPublicCategories,
  getPublicProductsByCategory,
} from "../controllers/product.controller.js";

// ─── Seller router ────────────────────────────────────────────────────────────
const sellerRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB for product images
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPEG, PNG, and WebP images are allowed."), allowed.includes(file.mimetype));
  },
});

sellerRouter.use(protect, requireRole("seller", "admin"));

sellerRouter.route("/")
  .get(getSellerProducts)
  .post(createProduct);

sellerRouter.route("/:id")
  .get(getSellerProduct)
  .patch(updateProduct);

sellerRouter.patch( "/:id/archive",         archiveProduct);
sellerRouter.post(  "/:id/duplicate",       duplicateProduct);

// Images — reorder MUST come before /:imageId to avoid route collision
sellerRouter.patch( "/:id/images/reorder",  reorderProductImages);
sellerRouter.post(  "/:id/images",          upload.single("image"), uploadProductImage);
sellerRouter.delete("/:id/images/:imageId", deleteProductImage);

// Variants
sellerRouter.put(   "/:id/variants",        setVariants);

// ─── Public router ────────────────────────────────────────────────────────────
const publicRouter = express.Router();

// /api/public/stores/:storeSlug/products
publicRouter.get("/:storeSlug/products",                                     getPublicProducts);
publicRouter.get("/:storeSlug/products/:productSlug",                        getPublicProduct);
publicRouter.get("/:storeSlug/categories",                                   getPublicCategories);
publicRouter.get("/:storeSlug/categories/:categorySlug/products",            getPublicProductsByCategory);

export { sellerRouter as sellerProductRouter, publicRouter as publicStoreRouter };
