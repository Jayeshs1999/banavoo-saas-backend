import asyncHandler from "../middleware/asyncHandler.js";
import Category from "../models/categoryModel.js";
import Product  from "../models/productModel.js";
import Store    from "../models/storeModel.js";
import { generateSlug } from "../utils/slug.js";
import {
  validateCreateCategory,
  validateUpdateCategory,
} from "../validators/category.validator.js";
import { deleteImage } from "../services/cloudinary.service.js";

// ── Helper ─────────────────────────────────────────────────────────────────────

const validationError = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed.",
    code:    "VALIDATION_ERROR",
    errors,
  });

/**
 * Resolve the authenticated seller's store.
 * Returns null (and sends a 404 response) if the seller has no store.
 */
async function resolveStore(req, res) {
  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store. Create a store first.",
    });
    return null;
  }
  return store;
}

/**
 * Generate a unique slug within a store, appending -2, -3, … if needed.
 */
async function uniqueCategorySlug(storeId, baseName, excludeId = null) {
  const base = generateSlug(baseName);
  let slug = base;
  let n    = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q = { storeId, slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Category.findOne(q);
    if (!exists) return slug;
    n++;
    slug = `${base}-${n}`;
  }
}

/**
 * Return public-safe category object.
 */
function toPublicCategory(cat) {
  return {
    id:          cat._id,
    name:        cat.name,
    slug:        cat.slug,
    description: cat.description,
    image:       cat.image,
    isActive:    cat.isActive,
    sortOrder:   cat.sortOrder,
    createdAt:   cat.createdAt,
    updatedAt:   cat.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Seller category endpoints ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Create a category for the seller's store
 * @route  POST /api/seller/categories
 * @access Private (seller)
 */
export const createCategory = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const { valid, errors } = validateCreateCategory(req.body);
  if (!valid) return validationError(res, errors);

  const name = String(req.body.name).trim();
  const slug = await uniqueCategorySlug(store._id, name);

  const category = await Category.create({
    storeId:     store._id,
    name,
    slug,
    description: req.body.description ? String(req.body.description).trim() : "",
    image:       req.body.image ?? { url: null, publicId: null },
    isActive:    req.body.isActive  !== undefined ? req.body.isActive  : true,
    sortOrder:   req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : 0,
  });

  return res.status(201).json({
    success: true,
    message: "Category created.",
    data:    toPublicCategory(category),
  });
});

/**
 * @desc   List all categories for the seller's store
 * @route  GET /api/seller/categories
 * @access Private (seller)
 */
export const getSellerCategories = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const { search, status, sort = "sortOrder", page = 1, limit = 50 } = req.query;

  const filter = { storeId: store._id };

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (status === "active")   filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  const sortMap = {
    sortOrder: { sortOrder: 1, createdAt: -1 },
    name:      { name: 1 },
    "-name":   { name: -1 },
    newest:    { createdAt: -1 },
    oldest:    { createdAt: 1 },
  };
  const sortBy = sortMap[sort] ?? sortMap.sortOrder;

  const pageNum   = Math.max(1, parseInt(page, 10)  || 1);
  const limitNum  = Math.min(100, parseInt(limit, 10) || 50);
  const skip      = (pageNum - 1) * limitNum;

  const [categories, total] = await Promise.all([
    Category.find(filter).sort(sortBy).skip(skip).limit(limitNum).lean(),
    Category.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: {
      categories: categories.map(toPublicCategory),
      pagination: {
        page:       pageNum,
        limit:      limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

/**
 * @desc   Get a single category by ID (seller only, ownership enforced)
 * @route  GET /api/seller/categories/:id
 * @access Private (seller)
 */
export const getSellerCategory = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const category = await Category.findOne({ _id: req.params.id, storeId: store._id });
  if (!category) {
    return res.status(404).json({
      success: false,
      code:    "CATEGORY_NOT_FOUND",
      message: "Category not found.",
    });
  }

  return res.json({ success: true, data: toPublicCategory(category) });
});

/**
 * @desc   Update a category (name regenerates slug)
 * @route  PATCH /api/seller/categories/:id
 * @access Private (seller)
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const { valid, errors } = validateUpdateCategory(req.body);
  if (!valid) return validationError(res, errors);

  const category = await Category.findOne({ _id: req.params.id, storeId: store._id });
  if (!category) {
    return res.status(404).json({
      success: false,
      code:    "CATEGORY_NOT_FOUND",
      message: "Category not found.",
    });
  }

  // If name changes, re-generate slug
  if (req.body.name !== undefined) {
    const newName = String(req.body.name).trim();
    if (newName !== category.name) {
      category.name = newName;
      category.slug = await uniqueCategorySlug(store._id, newName, category._id);
    }
  }

  if (req.body.description !== undefined) category.description = String(req.body.description).trim();
  if (req.body.isActive     !== undefined) category.isActive    = req.body.isActive;
  if (req.body.sortOrder    !== undefined) category.sortOrder   = Number(req.body.sortOrder);
  if (req.body.image        !== undefined) category.image       = req.body.image;

  await category.save();

  return res.json({
    success: true,
    message: "Category updated.",
    data:    toPublicCategory(category),
  });
});

/**
 * @desc   Delete a category (blocked if products use it)
 * @route  DELETE /api/seller/categories/:id
 * @access Private (seller)
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const category = await Category.findOne({ _id: req.params.id, storeId: store._id });
  if (!category) {
    return res.status(404).json({
      success: false,
      code:    "CATEGORY_NOT_FOUND",
      message: "Category not found.",
    });
  }

  // Block deletion if products reference this category
  const productCount = await Product.countDocuments({
    storeId:     store._id,
    categoryIds: category._id,
    status:      { $ne: "archived" },
  });

  if (productCount > 0) {
    return res.status(409).json({
      success: false,
      code:    "CATEGORY_IN_USE",
      message: `Cannot delete category — ${productCount} product${productCount === 1 ? " is" : "s are"} using it. Deactivate the category instead.`,
      data:    { productCount },
    });
  }

  // Delete Cloudinary image if present
  if (category.image?.publicId) {
    await deleteImage(category.image.publicId).catch(() => {});
  }

  await category.deleteOne();

  return res.json({ success: true, message: "Category deleted." });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Category image upload ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

import { uploadImage } from "../services/cloudinary.service.js";

/**
 * @desc   Upload / replace category image
 * @route  POST /api/seller/categories/:id/image
 * @access Private (seller)
 */
export const uploadCategoryImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, code: "NO_FILE", message: "Please upload an image." });
  }

  const store = await resolveStore(req, res);
  if (!store) return;

  const category = await Category.findOne({ _id: req.params.id, storeId: store._id });
  if (!category) {
    return res.status(404).json({ success: false, code: "CATEGORY_NOT_FOUND", message: "Category not found." });
  }

  if (category.image?.publicId) {
    await deleteImage(category.image.publicId).catch(() => {});
  }

  const result = await uploadImage(req.file.buffer, {
    folder:   "banavoo/categories",
    publicId: `cat-${category._id}`,
    width:    600,
    height:   600,
  });

  category.image = { url: result.url, publicId: result.publicId };
  await category.save();

  return res.json({ success: true, message: "Category image uploaded.", data: category.image });
});

/**
 * @desc   Delete category image
 * @route  DELETE /api/seller/categories/:id/image
 * @access Private (seller)
 */
export const deleteCategoryImage = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const category = await Category.findOne({ _id: req.params.id, storeId: store._id });
  if (!category) {
    return res.status(404).json({ success: false, code: "CATEGORY_NOT_FOUND", message: "Category not found." });
  }

  if (category.image?.publicId) {
    await deleteImage(category.image.publicId).catch(() => {});
  }

  category.image = { url: null, publicId: null };
  await category.save();

  return res.json({ success: true, message: "Category image removed." });
});
