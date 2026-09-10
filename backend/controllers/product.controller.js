import asyncHandler from "../middleware/asyncHandler.js";
import Product  from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import Store    from "../models/storeModel.js";
import { generateSlug } from "../utils/slug.js";
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateVariant,
  validateImageReorder,
  validatePublishRequirements,
  MAX_IMAGES,
} from "../validators/product.validator.js";
import { uploadImage, deleteImage } from "../services/cloudinary.service.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

const validationError = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed.",
    code:    "VALIDATION_ERROR",
    errors,
  });

/**
 * Resolve the authenticated seller's store.
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
 * Generate a unique product slug scoped to the store.
 * Appends -2, -3, … on collision.
 */
async function uniqueProductSlug(storeId, baseName, excludeId = null) {
  const base = generateSlug(baseName);
  let slug   = base;
  let n      = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q = { storeId, slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Product.findOne(q).lean();
    if (!exists) return slug;
    n++;
    slug = `${base}-${n}`;
  }
}

/**
 * Verify that every categoryId in the array belongs to the given store.
 * Returns the first invalid ID found (or null if all valid).
 */
async function findInvalidCategoryId(storeId, categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return null;
  for (const id of categoryIds) {
    const cat = await Category.findOne({ _id: id, storeId }).lean();
    if (!cat) return id;
  }
  return null;
}

/**
 * Compute the stock status label for seller dashboard display.
 */
function stockStatus(product) {
  if (product.productType === "variable") {
    const activeVariants = product.variants.filter((v) => v.isActive);
    const totalQty = activeVariants.reduce((s, v) => s + (v.quantity || 0), 0);
    if (totalQty === 0)    return "out_of_stock";
    const minThreshold = 5;
    if (totalQty <= minThreshold) return "low_stock";
    return "in_stock";
  }
  if (!product.inventory.trackInventory) return "in_stock";
  const { quantity, lowStockThreshold } = product.inventory;
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

/**
 * Strip sensitive/internal fields for seller view.
 */
function toSellerProduct(product) {
  const p = product.toObject ? product.toObject() : product;
  return {
    id:               p._id,
    storeId:          p.storeId,
    name:             p.name,
    slug:             p.slug,
    shortDescription: p.shortDescription,
    description:      p.description,
    images:           p.images,
    productType:      p.productType,
    pricing: {
      price:          p.pricing.price,
      compareAtPrice: p.pricing.compareAtPrice,
      costPrice:      p.pricing.costPrice, // sellers CAN see their own cost price
      currency:       p.pricing.currency,
    },
    inventory:    p.inventory,
    variants:     p.variants,
    categoryIds:  p.categoryIds,
    sku:          p.sku,
    status:       p.status,
    isFeatured:   p.isFeatured,
    isActive:     p.isActive,
    seo:          p.seo,
    shipping:     p.shipping,
    stockStatus:  stockStatus(p),
    inStock:      p.inStock ?? false,
    createdAt:    p.createdAt,
    updatedAt:    p.updatedAt,
  };
}

/**
 * Strip ALL private fields for the public storefront.
 */
function toPublicProduct(product) {
  const p = product.toObject ? product.toObject() : product;
  return {
    id:               p._id,
    name:             p.name,
    slug:             p.slug,
    shortDescription: p.shortDescription,
    description:      p.description,
    images:           p.images,
    productType:      p.productType,
    pricing: {
      price:          p.pricing.price,
      compareAtPrice: p.pricing.compareAtPrice,
      // costPrice intentionally omitted
      currency:       p.pricing.currency,
    },
    inventory: {
      trackInventory: p.inventory.trackInventory,
      // quantity intentionally not exposed raw
      allowBackorder: p.inventory.allowBackorder,
    },
    variants: p.variants.filter((v) => v.isActive).map((v) => ({
      _id:           v._id,
      name:          v.name,
      options:       v.options,
      price:         v.price,
      compareAtPrice: v.compareAtPrice,
      quantity:      undefined, // not exposed publicly
      image:         v.image,
      isActive:      v.isActive,
    })),
    categoryIds: p.categoryIds,
    sku:         p.sku,
    isFeatured:  p.isFeatured,
    seo:         p.seo,
    inStock:     p.inStock ?? false,
    createdAt:   p.createdAt,
    updatedAt:   p.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Seller product endpoints ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Create a new product
 * @route  POST /api/seller/products
 * @access Private (seller)
 */
export const createProduct = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const { valid, errors } = validateCreateProduct(req.body);
  if (!valid) return validationError(res, errors);

  // Validate category ownership
  const badCat = await findInvalidCategoryId(store._id, req.body.categoryIds);
  if (badCat) {
    return res.status(400).json({
      success: false,
      code:    "INVALID_CATEGORY",
      message: `Category "${badCat}" does not belong to your store.`,
    });
  }

  // Generate slug
  const slug = await uniqueProductSlug(store._id, req.body.name.trim());

  // Normalize SKU
  const sku = req.body.sku ? String(req.body.sku).trim().toUpperCase() : "";

  // Check SKU uniqueness within store
  if (sku) {
    const skuExists = await Product.findOne({ storeId: store._id, sku }).lean();
    if (skuExists) {
      return res.status(409).json({
        success: false,
        code:    "SKU_EXISTS",
        message: `SKU "${sku}" is already in use in your store.`,
      });
    }
  }

  const product = await Product.create({
    storeId:          store._id,
    name:             req.body.name.trim(),
    slug,
    shortDescription: req.body.shortDescription ? String(req.body.shortDescription).trim() : "",
    description:      req.body.description      ? String(req.body.description).trim()      : "",
    categoryIds:      req.body.categoryIds ?? [],
    productType:      req.body.productType ?? "simple",
    pricing: {
      price:          Number(req.body.pricing.price),
      compareAtPrice: req.body.pricing.compareAtPrice != null ? Number(req.body.pricing.compareAtPrice) : null,
      costPrice:      req.body.pricing.costPrice      != null ? Number(req.body.pricing.costPrice)      : null,
      currency:       req.body.pricing.currency ?? "INR",
    },
    inventory: {
      trackInventory:    req.body.inventory?.trackInventory    ?? true,
      quantity:          req.body.inventory?.quantity          != null ? Number(req.body.inventory.quantity) : 0,
      lowStockThreshold: req.body.inventory?.lowStockThreshold != null ? Number(req.body.inventory.lowStockThreshold) : 5,
      allowBackorder:    req.body.inventory?.allowBackorder    ?? false,
    },
    sku,
    status:     req.body.status     ?? "draft",
    isFeatured: req.body.isFeatured ?? false,
    seo: {
      title:       req.body.seo?.title       ? String(req.body.seo.title).trim()       : "",
      description: req.body.seo?.description ? String(req.body.seo.description).trim() : "",
    },
    shipping: {
      weight: req.body.shipping?.weight ?? null,
      length: req.body.shipping?.length ?? null,
      width:  req.body.shipping?.width  ?? null,
      height: req.body.shipping?.height ?? null,
    },
  });

  return res.status(201).json({
    success: true,
    message: "Product created.",
    data:    toSellerProduct(product),
  });
});

/**
 * @desc   List seller's products with search/filter/sort/pagination
 * @route  GET /api/seller/products
 * @access Private (seller)
 */
export const getSellerProducts = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const {
    page     = 1,
    limit    = 20,
    search,
    category,
    status,
    featured,
    sort     = "-createdAt",
  } = req.query;

  const filter = { storeId: store._id };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku:  { $regex: search, $options: "i" } },
    ];
  }

  if (status && ["draft", "published", "archived"].includes(status)) {
    filter.status = status;
  }

  if (category) {
    const cat = await Category.findOne({ storeId: store._id, slug: category }).lean();
    if (cat) filter.categoryIds = cat._id;
    else     filter.categoryIds = null; // returns empty
  }

  if (featured === "true")  filter.isFeatured = true;
  if (featured === "false") filter.isFeatured = false;

  const sortMap = {
    "-createdAt": { createdAt: -1 },
    "createdAt":  { createdAt:  1 },
    "name":       { name:  1 },
    "-name":      { name: -1 },
    "price":      { "pricing.price":  1 },
    "-price":     { "pricing.price": -1 },
  };
  const sortBy = sortMap[sort] ?? sortMap["-createdAt"];

  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const limitNum = Math.min(100, parseInt(limit, 10) || 20);
  const skip     = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: {
      products:   products.map(toSellerProduct),
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
 * @desc   Get a single product (seller, with ownership check)
 * @route  GET /api/seller/products/:id
 * @access Private (seller)
 */
export const getSellerProduct = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
  if (!product) {
    return res.status(404).json({
      success: false,
      code:    "PRODUCT_NOT_FOUND",
      message: "Product not found.",
    });
  }

  return res.json({ success: true, data: toSellerProduct(product) });
});

/**
 * @desc   Update a product
 * @route  PATCH /api/seller/products/:id
 * @access Private (seller)
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const { valid, errors } = validateUpdateProduct(req.body);
  if (!valid) return validationError(res, errors);

  const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
  if (!product) {
    return res.status(404).json({
      success: false,
      code:    "PRODUCT_NOT_FOUND",
      message: "Product not found.",
    });
  }

  // Validate categories if provided
  if (req.body.categoryIds !== undefined) {
    const badCat = await findInvalidCategoryId(store._id, req.body.categoryIds);
    if (badCat) {
      return res.status(400).json({
        success: false,
        code:    "INVALID_CATEGORY",
        message: `Category "${badCat}" does not belong to your store.`,
      });
    }
    product.categoryIds = req.body.categoryIds;
  }

  // Publishing gate
  if (req.body.status === "published" && product.status !== "published") {
    const publishErrors = validatePublishRequirements(product);
    if (publishErrors.length > 0) {
      return res.status(422).json({
        success: false,
        code:    "CANNOT_PUBLISH",
        message: "Product cannot be published.",
        errors:  publishErrors,
      });
    }
  }

  // Apply scalar fields
  const textFields = ["name", "shortDescription", "description"];
  for (const f of textFields) {
    if (req.body[f] !== undefined) product[f] = String(req.body[f]).trim();
  }

  if (req.body.productType !== undefined) product.productType = req.body.productType;
  if (req.body.status      !== undefined) product.status      = req.body.status;
  if (req.body.isFeatured  !== undefined) product.isFeatured  = Boolean(req.body.isFeatured);
  if (req.body.isActive    !== undefined) product.isActive    = Boolean(req.body.isActive);

  // SKU
  if (req.body.sku !== undefined) {
    const newSku = String(req.body.sku).trim().toUpperCase();
    if (newSku !== product.sku) {
      if (newSku) {
        const skuExists = await Product.findOne({ storeId: store._id, sku: newSku, _id: { $ne: product._id } }).lean();
        if (skuExists) {
          return res.status(409).json({
            success: false,
            code:    "SKU_EXISTS",
            message: `SKU "${newSku}" is already in use in your store.`,
          });
        }
      }
      product.sku = newSku;
    }
  }

  // Pricing
  if (req.body.pricing !== undefined) {
    const p = req.body.pricing;
    if (p.price          !== undefined) product.pricing.price          = Number(p.price);
    if (p.compareAtPrice !== undefined) product.pricing.compareAtPrice = p.compareAtPrice != null ? Number(p.compareAtPrice) : null;
    if (p.costPrice      !== undefined) product.pricing.costPrice      = p.costPrice      != null ? Number(p.costPrice)      : null;
    if (p.currency       !== undefined) product.pricing.currency       = String(p.currency);
    product.markModified("pricing");
  }

  // Inventory
  if (req.body.inventory !== undefined) {
    const inv = req.body.inventory;
    if (inv.trackInventory    !== undefined) product.inventory.trackInventory    = Boolean(inv.trackInventory);
    if (inv.quantity          !== undefined) product.inventory.quantity          = Number(inv.quantity);
    if (inv.lowStockThreshold !== undefined) product.inventory.lowStockThreshold = Number(inv.lowStockThreshold);
    if (inv.allowBackorder    !== undefined) product.inventory.allowBackorder    = Boolean(inv.allowBackorder);
    product.markModified("inventory");
  }

  // SEO
  if (req.body.seo !== undefined) {
    if (req.body.seo.title       !== undefined) product.seo.title       = String(req.body.seo.title).trim();
    if (req.body.seo.description !== undefined) product.seo.description = String(req.body.seo.description).trim();
    product.markModified("seo");
  }

  // Shipping
  if (req.body.shipping !== undefined) {
    for (const dim of ["weight", "length", "width", "height"]) {
      if (req.body.shipping[dim] !== undefined)
        product.shipping[dim] = req.body.shipping[dim] != null ? Number(req.body.shipping[dim]) : null;
    }
    product.markModified("shipping");
  }

  await product.save();

  return res.json({
    success: true,
    message: "Product updated.",
    data:    toSellerProduct(product),
  });
});

/**
 * @desc   Archive a product (soft delete)
 * @route  PATCH /api/seller/products/:id/archive
 * @access Private (seller)
 */
export const archiveProduct = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, storeId: store._id },
    { status: "archived" },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({ success: false, code: "PRODUCT_NOT_FOUND", message: "Product not found." });
  }

  return res.json({ success: true, message: "Product archived.", data: toSellerProduct(product) });
});

/**
 * @desc   Duplicate a product (new draft, new slug, zero inventory)
 * @route  POST /api/seller/products/:id/duplicate
 * @access Private (seller)
 */
export const duplicateProduct = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const source = await Product.findOne({ _id: req.params.id, storeId: store._id }).lean({ virtuals: false });
  if (!source) {
    return res.status(404).json({ success: false, code: "PRODUCT_NOT_FOUND", message: "Product not found." });
  }

  const slug = await uniqueProductSlug(store._id, `${source.name} copy`);

  const copy = await Product.create({
    storeId:          store._id,
    name:             `${source.name} (Copy)`,
    slug,
    shortDescription: source.shortDescription,
    description:      source.description,
    categoryIds:      source.categoryIds,
    productType:      source.productType,
    pricing:          { ...source.pricing },
    inventory: {
      ...source.inventory,
      quantity: 0, // reset inventory on duplicate
    },
    variants:   source.variants.map((v) => ({ ...v, _id: undefined, quantity: 0 })),
    sku:        "", // seller must supply a new SKU
    status:     "draft",
    isFeatured: false,
    seo:        { ...source.seo },
    shipping:   { ...source.shipping },
    // images: intentionally omitted — seller can re-add images
  });

  return res.status(201).json({
    success: true,
    message: "Product duplicated as a draft.",
    data:    toSellerProduct(copy),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Product images ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Upload an image to a product (max 8)
 * @route  POST /api/seller/products/:id/images
 * @access Private (seller)
 */
export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, code: "NO_FILE", message: "Please upload an image." });
  }

  const store = await resolveStore(req, res);
  if (!store) return;

  const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
  if (!product) {
    return res.status(404).json({ success: false, code: "PRODUCT_NOT_FOUND", message: "Product not found." });
  }

  if (product.images.length >= MAX_IMAGES) {
    return res.status(400).json({
      success: false,
      code:    "MAX_IMAGES_REACHED",
      message: `A product can have at most ${MAX_IMAGES} images.`,
    });
  }

  const sortOrder = product.images.length; // next in sequence
  const result = await uploadImage(req.file.buffer, {
    folder:   "banavoo/products",
    publicId: `product-${product._id}-img-${Date.now()}`,
    width:    1200,
    height:   1200,
  });

  const image = {
    url:       result.url,
    publicId:  result.publicId,
    alt:       req.body.alt ? String(req.body.alt).trim() : product.name,
    sortOrder,
  };

  product.images.push(image);
  await product.save();

  return res.status(201).json({
    success: true,
    message: "Image uploaded.",
    data:    product.images,
  });
});

/**
 * @desc   Delete a product image
 * @route  DELETE /api/seller/products/:id/images/:imageId
 * @access Private (seller)
 */
export const deleteProductImage = asyncHandler(async (req, res) => {
  const store = await resolveStore(req, res);
  if (!store) return;

  const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
  if (!product) {
    return res.status(404).json({ success: false, code: "PRODUCT_NOT_FOUND", message: "Product not found." });
  }

  const imageIndex = product.images.findIndex(
    (img) => String(img._id) === String(req.params.imageId)
  );
  if (imageIndex === -1) {
    return res.status(404).json({ success: false, code: "IMAGE_NOT_FOUND", message: "Image not found." });
  }

  const image = product.images[imageIndex];

  // Delete from Cloudinary
  if (image.publicId) {
    await deleteImage(image.publicId).catch(() => {});
  }

  product.images.splice(imageIndex, 1);

  // Re-number sortOrder to be sequential
  product.images.forEach((img, i) => { img.sortOrder = i; });
  product.markModified("images");

  await product.save();

  return res.json({ success: true, message: "Image deleted.", data: product.images });
});

/**
 * @desc   Reorder product images
 * @route  PATCH /api/seller/products/:id/images/reorder
 * @access Private (seller)
 */
export const reorderProductImages = asyncHandler(async (req, res) => {
  const { images } = req.body;
  const { valid, errors } = validateImageReorder(images);
  if (!valid) return validationError(res, errors);

  const store = await resolveStore(req, res);
  if (!store) return;

  const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
  if (!product) {
    return res.status(404).json({ success: false, code: "PRODUCT_NOT_FOUND", message: "Product not found." });
  }

  // Apply the new sort orders
  for (const { _id, sortOrder } of images) {
    const img = product.images.id(_id);
    if (img) img.sortOrder = sortOrder;
  }

  // Sort in place
  product.images.sort((a, b) => a.sortOrder - b.sortOrder);
  product.markModified("images");

  await product.save();

  return res.json({ success: true, message: "Images reordered.", data: product.images });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Variants ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Replace all variants on a variable product
 * @route  PUT /api/seller/products/:id/variants
 * @access Private (seller)
 */
export const setVariants = asyncHandler(async (req, res) => {
  const variants = req.body.variants;
  if (!Array.isArray(variants)) {
    return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "variants must be an array." });
  }

  // Validate each variant
  const allErrors = {};
  for (let i = 0; i < variants.length; i++) {
    const { valid, errors } = validateVariant(variants[i]);
    if (!valid) {
      for (const [k, v] of Object.entries(errors)) allErrors[`variants[${i}].${k}`] = v;
    }
  }
  if (Object.keys(allErrors).length > 0) return validationError(res, allErrors);

  // Check for duplicate option combinations
  const seen = new Set();
  for (const v of variants) {
    const key = [...v.options]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((o) => `${o.name.toLowerCase()}:${o.value.toLowerCase()}`)
      .join("|");
    if (seen.has(key)) {
      return res.status(409).json({
        success: false,
        code:    "DUPLICATE_VARIANT",
        message: `Duplicate variant combination: ${key}`,
      });
    }
    seen.add(key);
  }

  const store = await resolveStore(req, res);
  if (!store) return;

  const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
  if (!product) {
    return res.status(404).json({ success: false, code: "PRODUCT_NOT_FOUND", message: "Product not found." });
  }

  // Check variant SKU uniqueness within store
  const newSkus = variants.map((v) => (v.sku ? String(v.sku).trim().toUpperCase() : "")).filter(Boolean);
  for (const sku of newSkus) {
    const skuExists = await Product.findOne({
      storeId: store._id,
      "variants.sku": sku,
      _id: { $ne: product._id },
    }).lean();
    if (skuExists) {
      return res.status(409).json({
        success: false,
        code:    "SKU_EXISTS",
        message: `Variant SKU "${sku}" is already used by another product in your store.`,
      });
    }
  }

  product.variants = variants.map((v) => ({
    ...v,
    sku:      v.sku ? String(v.sku).trim().toUpperCase() : "",
    quantity: Number(v.quantity ?? 0),
    isActive: v.isActive !== false,
  }));
  product.markModified("variants");

  await product.save();

  return res.json({ success: true, message: "Variants saved.", data: toSellerProduct(product) });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Public product endpoints ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Get published products for a store (public)
 * @route  GET /api/public/stores/:storeSlug/products
 * @access Public
 */
export const getPublicProducts = asyncHandler(async (req, res) => {
  const { storeSlug } = req.params;
  const store = await Store.findOne({ slug: storeSlug.toLowerCase(), status: "active" }).lean();
  if (!store) {
    return res.status(404).json({ success: false, code: "STORE_NOT_FOUND", message: "Store not found." });
  }

  const {
    page      = 1,
    limit     = 20,
    search,
    category,
    featured,
    sort      = "-createdAt",
    minPrice,
    maxPrice,
  } = req.query;

  const filter = { storeId: store._id, status: "published" };

  if (search) filter.name = { $regex: search, $options: "i" };

  if (category) {
    const cat = await Category.findOne({ storeId: store._id, slug: category, isActive: true }).lean();
    if (cat) filter.categoryIds = cat._id;
    else     filter.categoryIds = null;
  }

  if (featured === "true") filter.isFeatured = true;

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter["pricing.price"] = {};
    if (minPrice !== undefined) filter["pricing.price"].$gte = Number(minPrice);
    if (maxPrice !== undefined) filter["pricing.price"].$lte = Number(maxPrice);
  }

  const sortMap = {
    "-createdAt": { createdAt: -1 },
    "createdAt":  { createdAt:  1 },
    "name":       { name:  1 },
    "price":      { "pricing.price":  1 },
    "-price":     { "pricing.price": -1 },
    "featured":   { isFeatured: -1, createdAt: -1 },
  };
  const sortBy  = sortMap[sort] ?? sortMap["-createdAt"];
  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const limitNum = Math.min(100, parseInt(limit, 10) || 20);
  const skip     = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: {
      products:   products.map(toPublicProduct),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

/**
 * @desc   Get a single published product by slug (public)
 * @route  GET /api/public/stores/:storeSlug/products/:productSlug
 * @access Public
 */
export const getPublicProduct = asyncHandler(async (req, res) => {
  const { storeSlug, productSlug } = req.params;

  const store = await Store.findOne({ slug: storeSlug.toLowerCase(), status: "active" }).lean();
  if (!store) {
    return res.status(404).json({ success: false, code: "STORE_NOT_FOUND", message: "Store not found." });
  }

  const product = await Product.findOne({
    storeId: store._id,
    slug:    productSlug.toLowerCase(),
    status:  "published",
  });

  if (!product) {
    return res.status(404).json({ success: false, code: "PRODUCT_NOT_FOUND", message: "Product not found." });
  }

  return res.json({ success: true, data: toPublicProduct(product) });
});

/**
 * @desc   Get published products in a category (public)
 * @route  GET /api/public/stores/:storeSlug/categories/:categorySlug/products
 * @access Public
 */
export const getPublicProductsByCategory = asyncHandler(async (req, res) => {
  const { storeSlug, categorySlug } = req.params;

  const store = await Store.findOne({ slug: storeSlug.toLowerCase(), status: "active" }).lean();
  if (!store) {
    return res.status(404).json({ success: false, code: "STORE_NOT_FOUND", message: "Store not found." });
  }

  const category = await Category.findOne({ storeId: store._id, slug: categorySlug, isActive: true }).lean();
  if (!category) {
    return res.status(404).json({ success: false, code: "CATEGORY_NOT_FOUND", message: "Category not found." });
  }

  const pageNum  = Math.max(1, parseInt(req.query.page  || "1",  10));
  const limitNum = Math.min(100, parseInt(req.query.limit || "20", 10));
  const skip     = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find({ storeId: store._id, categoryIds: category._id, status: "published" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Product.countDocuments({ storeId: store._id, categoryIds: category._id, status: "published" }),
  ]);

  return res.json({
    success: true,
    data: {
      category: {
        id:          category._id,
        name:        category.name,
        slug:        category.slug,
        description: category.description,
        image:       category.image,
      },
      products:   products.map(toPublicProduct),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

/**
 * @desc   Get active categories for a store (public)
 * @route  GET /api/public/stores/:storeSlug/categories
 * @access Public
 */
export const getPublicCategories = asyncHandler(async (req, res) => {
  const { storeSlug } = req.params;

  const store = await Store.findOne({ slug: storeSlug.toLowerCase(), status: "active" }).lean();
  if (!store) {
    return res.status(404).json({ success: false, code: "STORE_NOT_FOUND", message: "Store not found." });
  }

  const categories = await Category.find({ storeId: store._id, isActive: true })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    data: categories.map((c) => ({
      id:          c._id,
      name:        c.name,
      slug:        c.slug,
      description: c.description,
      image:       c.image,
      sortOrder:   c.sortOrder,
    })),
  });
});
