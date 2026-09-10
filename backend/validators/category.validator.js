/**
 * Category validators — Banavoo SaaS Step 4
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Strip tags: reject any HTML/script-like content */
const HTML_RE = /<[^>]*>/;

function hasHtml(str) {
  return HTML_RE.test(str);
}

// ── validateCreateCategory ────────────────────────────────────────────────────

/**
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateCreateCategory(body) {
  const errors = {};

  // name — required
  const name = (body.name ?? "").trim();
  if (!name) {
    errors.name = "Category name is required.";
  } else if (name.length < 1) {
    errors.name = "Category name must be at least 1 character.";
  } else if (name.length > 100) {
    errors.name = "Category name must be 100 characters or fewer.";
  } else if (hasHtml(name)) {
    errors.name = "Category name must not contain HTML.";
  }

  // description — optional
  if (body.description !== undefined) {
    const desc = String(body.description).trim();
    if (desc.length > 500) {
      errors.description = "Description must be 500 characters or fewer.";
    } else if (hasHtml(desc)) {
      errors.description = "Description must not contain HTML.";
    }
  }

  // sortOrder — optional, must be a non-negative integer if provided
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isInteger(n) || n < 0) {
      errors.sortOrder = "Sort order must be a non-negative integer.";
    }
  }

  // image — optional, if provided must have url + publicId
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== "object") {
      errors.image = "Image must be an object with url and publicId.";
    } else {
      if (body.image.url !== undefined && typeof body.image.url !== "string") {
        errors["image.url"] = "Image URL must be a string.";
      }
      if (body.image.publicId !== undefined && typeof body.image.publicId !== "string") {
        errors["image.publicId"] = "Image publicId must be a string.";
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateUpdateCategory ────────────────────────────────────────────────────

/**
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateUpdateCategory(body) {
  const errors = {};

  // Reject forbidden fields
  if ("storeId" in body) errors.storeId = "storeId cannot be changed.";
  if ("slug"    in body) errors.slug    = "Slug cannot be changed directly — it follows the name.";

  // name — optional
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      errors.name = "Category name cannot be empty.";
    } else if (name.length > 100) {
      errors.name = "Category name must be 100 characters or fewer.";
    } else if (hasHtml(name)) {
      errors.name = "Category name must not contain HTML.";
    }
  }

  // description — optional
  if (body.description !== undefined) {
    const desc = String(body.description).trim();
    if (desc.length > 500) {
      errors.description = "Description must be 500 characters or fewer.";
    } else if (hasHtml(desc)) {
      errors.description = "Description must not contain HTML.";
    }
  }

  // isActive — optional boolean
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    errors.isActive = "isActive must be a boolean.";
  }

  // sortOrder — optional
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isInteger(n) || n < 0) {
      errors.sortOrder = "Sort order must be a non-negative integer.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
