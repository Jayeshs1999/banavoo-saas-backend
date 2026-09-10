/**
 * Product validators — Banavoo SaaS Step 4
 */

import mongoose from "mongoose";

// ── Helpers ────────────────────────────────────────────────────────────────────

const HTML_RE         = /<[^>]*>/;
const SLUG_SAFE_RE    = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const VALID_STATUSES  = ["draft", "published", "archived"];
const VALID_TYPES     = ["simple", "variable"];
const MAX_IMAGES      = 8;

function hasHtml(str) {
  return HTML_RE.test(String(str));
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ── validateCreateProduct ─────────────────────────────────────────────────────

/**
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateCreateProduct(body) {
  const errors = {};

  // name — required
  const name = (body.name ?? "").trim();
  if (!name) {
    errors.name = "Product name is required.";
  } else if (name.length < 2) {
    errors.name = "Product name must be at least 2 characters.";
  } else if (name.length > 200) {
    errors.name = "Product name must be 200 characters or fewer.";
  } else if (hasHtml(name)) {
    errors.name = "Product name must not contain HTML.";
  }

  // shortDescription — optional
  if (body.shortDescription !== undefined) {
    const sd = String(body.shortDescription).trim();
    if (sd.length > 300) errors.shortDescription = "Short description must be 300 characters or fewer.";
    else if (hasHtml(sd)) errors.shortDescription = "Short description must not contain HTML.";
  }

  // productType — optional (defaults to "simple")
  if (body.productType !== undefined && !VALID_TYPES.includes(body.productType)) {
    errors.productType = `Product type must be one of: ${VALID_TYPES.join(", ")}.`;
  }

  // categoryIds — optional, each must be valid ObjectId
  if (body.categoryIds !== undefined) {
    if (!Array.isArray(body.categoryIds)) {
      errors.categoryIds = "categoryIds must be an array.";
    } else {
      for (const id of body.categoryIds) {
        if (!isValidObjectId(id)) {
          errors.categoryIds = "One or more category IDs are invalid.";
          break;
        }
      }
    }
  }

  // pricing — required (at minimum price)
  const pricing = body.pricing ?? {};
  if (body.pricing === undefined || pricing.price === undefined) {
    errors["pricing.price"] = "Price is required.";
  } else {
    const price = Number(pricing.price);
    if (isNaN(price) || price < 0) {
      errors["pricing.price"] = "Price must be a non-negative number.";
    }
    if (pricing.compareAtPrice !== undefined && pricing.compareAtPrice !== null) {
      const cap = Number(pricing.compareAtPrice);
      if (isNaN(cap) || cap < 0) {
        errors["pricing.compareAtPrice"] = "Compare-at price must be a non-negative number.";
      } else if (cap > 0 && cap < price) {
        errors["pricing.compareAtPrice"] = "Compare-at price should be greater than or equal to the price.";
      }
    }
    if (pricing.costPrice !== undefined && pricing.costPrice !== null) {
      const cp = Number(pricing.costPrice);
      if (isNaN(cp) || cp < 0) errors["pricing.costPrice"] = "Cost price must be a non-negative number.";
    }
  }

  // inventory — optional
  if (body.inventory !== undefined) {
    const inv = body.inventory;
    if (inv.quantity !== undefined) {
      const q = Number(inv.quantity);
      if (!Number.isInteger(q) || q < 0) errors["inventory.quantity"] = "Quantity must be a non-negative integer.";
    }
    if (inv.lowStockThreshold !== undefined) {
      const t = Number(inv.lowStockThreshold);
      if (!Number.isInteger(t) || t < 0) errors["inventory.lowStockThreshold"] = "Low stock threshold must be a non-negative integer.";
    }
    if (inv.trackInventory !== undefined && typeof inv.trackInventory !== "boolean") {
      errors["inventory.trackInventory"] = "trackInventory must be a boolean.";
    }
    if (inv.allowBackorder !== undefined && typeof inv.allowBackorder !== "boolean") {
      errors["inventory.allowBackorder"] = "allowBackorder must be a boolean.";
    }
  }

  // sku — optional
  if (body.sku !== undefined && body.sku !== "") {
    const sku = String(body.sku).trim().toUpperCase();
    if (sku.length > 100) errors.sku = "SKU must be 100 characters or fewer.";
    else if (hasHtml(body.sku)) errors.sku = "SKU must not contain HTML.";
  }

  // status — optional
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.status = `Status must be one of: ${VALID_STATUSES.join(", ")}.`;
  }

  // seo — optional
  if (body.seo !== undefined) {
    if (body.seo.title !== undefined) {
      const t = String(body.seo.title).trim();
      if (t.length > 70) errors["seo.title"] = "SEO title must be 70 characters or fewer.";
    }
    if (body.seo.description !== undefined) {
      const d = String(body.seo.description).trim();
      if (d.length > 170) errors["seo.description"] = "SEO description must be 170 characters or fewer.";
    }
  }

  // shipping — optional
  if (body.shipping !== undefined) {
    for (const dim of ["weight", "length", "width", "height"]) {
      if (body.shipping[dim] !== undefined && body.shipping[dim] !== null) {
        const v = Number(body.shipping[dim]);
        if (isNaN(v) || v < 0) errors[`shipping.${dim}`] = `${dim} must be a non-negative number.`;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateUpdateProduct ─────────────────────────────────────────────────────

/**
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateUpdateProduct(body) {
  const errors = {};

  // Reject forbidden fields
  for (const f of ["storeId", "ownerId", "createdAt"]) {
    if (f in body) errors[f] = `${f} cannot be changed.`;
  }

  // Reuse create validation for shared fields — but all are optional here
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) errors.name = "Product name must be at least 2 characters.";
    else if (name.length > 200) errors.name = "Product name must be 200 characters or fewer.";
    else if (hasHtml(name)) errors.name = "Product name must not contain HTML.";
  }

  if (body.shortDescription !== undefined) {
    const sd = String(body.shortDescription).trim();
    if (sd.length > 300) errors.shortDescription = "Short description must be 300 characters or fewer.";
    else if (hasHtml(sd)) errors.shortDescription = "Short description must not contain HTML.";
  }

  if (body.productType !== undefined && !VALID_TYPES.includes(body.productType)) {
    errors.productType = `Product type must be one of: ${VALID_TYPES.join(", ")}.`;
  }

  if (body.categoryIds !== undefined) {
    if (!Array.isArray(body.categoryIds)) {
      errors.categoryIds = "categoryIds must be an array.";
    } else {
      for (const id of body.categoryIds) {
        if (!isValidObjectId(id)) { errors.categoryIds = "One or more category IDs are invalid."; break; }
      }
    }
  }

  if (body.pricing !== undefined) {
    const p = body.pricing;
    if (p.price !== undefined) {
      const price = Number(p.price);
      if (isNaN(price) || price < 0) errors["pricing.price"] = "Price must be a non-negative number.";
      if (p.compareAtPrice !== undefined && p.compareAtPrice !== null) {
        const cap = Number(p.compareAtPrice);
        if (!isNaN(cap) && !isNaN(price) && cap > 0 && cap < price) {
          errors["pricing.compareAtPrice"] = "Compare-at price should be >= price.";
        }
      }
    }
    if (p.compareAtPrice !== undefined && p.compareAtPrice !== null) {
      const cap = Number(p.compareAtPrice);
      if (isNaN(cap) || cap < 0) errors["pricing.compareAtPrice"] = "Compare-at price must be non-negative.";
    }
  }

  if (body.inventory !== undefined) {
    const inv = body.inventory;
    if (inv.quantity !== undefined) {
      const q = Number(inv.quantity);
      if (!Number.isInteger(q) || q < 0) errors["inventory.quantity"] = "Quantity must be a non-negative integer.";
    }
    if (inv.lowStockThreshold !== undefined) {
      const t = Number(inv.lowStockThreshold);
      if (!Number.isInteger(t) || t < 0) errors["inventory.lowStockThreshold"] = "Low stock threshold must be a non-negative integer.";
    }
  }

  if (body.sku !== undefined && body.sku !== "") {
    const sku = String(body.sku).trim().toUpperCase();
    if (sku.length > 100) errors.sku = "SKU must be 100 characters or fewer.";
    else if (hasHtml(body.sku)) errors.sku = "SKU must not contain HTML.";
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.status = `Status must be one of: ${VALID_STATUSES.join(", ")}.`;
  }

  if (body.seo !== undefined) {
    if (body.seo.title !== undefined && String(body.seo.title).length > 70)
      errors["seo.title"] = "SEO title must be 70 characters or fewer.";
    if (body.seo.description !== undefined && String(body.seo.description).length > 170)
      errors["seo.description"] = "SEO description must be 170 characters or fewer.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateVariant ───────────────────────────────────────────────────────────

/**
 * @param {object} variant
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateVariant(variant) {
  const errors = {};

  const name = (variant.name ?? "").trim();
  if (!name) errors.name = "Variant name is required.";
  else if (name.length > 200) errors.name = "Variant name must be 200 characters or fewer.";

  if (variant.sku !== undefined && variant.sku !== "") {
    const sku = String(variant.sku).trim().toUpperCase();
    if (sku.length > 100) errors.sku = "Variant SKU must be 100 characters or fewer.";
  }

  if (variant.price !== undefined && variant.price !== null) {
    const p = Number(variant.price);
    if (isNaN(p) || p < 0) errors.price = "Variant price must be a non-negative number.";
  }

  if (variant.quantity !== undefined) {
    const q = Number(variant.quantity);
    if (!Number.isInteger(q) || q < 0) errors.quantity = "Variant quantity must be a non-negative integer.";
  }

  if (!Array.isArray(variant.options) || variant.options.length === 0) {
    errors.options = "Variant must have at least one option.";
  } else {
    for (const opt of variant.options) {
      if (!opt.name || !opt.value) {
        errors.options = "Each option must have a name and value.";
        break;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateImageReorder ───────────────────────────────────────────────────────

/**
 * @param {Array} images  array of { _id, sortOrder }
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateImageReorder(images) {
  const errors = {};
  if (!Array.isArray(images) || images.length === 0) {
    errors.images = "Images must be a non-empty array.";
    return { valid: false, errors };
  }
  if (images.length > MAX_IMAGES) {
    errors.images = `Cannot have more than ${MAX_IMAGES} images.`;
    return { valid: false, errors };
  }
  for (const img of images) {
    if (!isValidObjectId(img._id)) { errors.images = "Invalid image ID."; break; }
    if (typeof img.sortOrder !== "number") { errors.images = "sortOrder must be a number."; break; }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validatePublish ────────────────────────────────────────────────────────────

/**
 * Before a product can be published, it must meet minimum requirements.
 * Returns an array of human-readable errors (for the publishing gate).
 *
 * @param {import('../models/productModel.js').default} product  Mongoose doc
 * @returns {string[]}  empty = can be published
 */
export function validatePublishRequirements(product) {
  const errs = [];
  if (!product.name || product.name.trim().length < 2)
    errs.push("Product must have a valid name.");
  if (product.pricing.price < 0 || product.pricing.price === undefined || product.pricing.price === null)
    errs.push("Product must have a valid price.");
  if (!product.images || product.images.length === 0)
    errs.push("Add at least one product image before publishing.");
  if (product.productType === "variable" && (!product.variants || product.variants.filter((v) => v.isActive).length === 0))
    errs.push("Variable product must have at least one active variant.");
  return errs;
}

export { MAX_IMAGES, SLUG_SAFE_RE };
