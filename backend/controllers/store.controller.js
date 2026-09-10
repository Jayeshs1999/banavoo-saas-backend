import asyncHandler from "../middleware/asyncHandler.js";
import Store from "../models/storeModel.js";
import User from "../models/userModel.js";
import { generateSlug, isReservedSlug } from "../utils/slug.js";
import {
  validateCreateStore,
  validateUpdateStore,
} from "../validators/store.validator.js";

// ── Helper ────────────────────────────────────────────────────────────────────
const validationError = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed.",
    code:    "VALIDATION_ERROR",
    errors,
  });

/**
 * Return a public-safe store object (omits ownerId and internal fields).
 */
function toPublicStore(store) {
  return {
    id:            store._id,
    name:          store.name,
    slug:          store.slug,
    description:   store.description,
    city:          store.city,
    state:         store.state,
    pickupPincode: store.pickupPincode,
    logo:          store.logo,
    banner:        store.banner,
    theme:         store.theme,
    status:        store.status,
    createdAt:     store.createdAt,
    updatedAt:     store.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Create a new store and promote user to seller
 * @route  POST /api/stores
 * @access Private (authenticated + emailVerified)
 */
export const createStore = asyncHandler(async (req, res) => {
  const user = req.user;

  // Must have verified email
  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      code:    "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before creating a store.",
    });
  }

  // One store per user
  const existing = await Store.findOne({ ownerId: user._id });
  if (existing) {
    return res.status(409).json({
      success: false,
      code:    "STORE_ALREADY_EXISTS",
      message: "You already have a store.",
    });
  }

  // Validate input
  const { valid, errors } = validateCreateStore(req.body);
  if (!valid) return validationError(res, errors);

  const { name, description, city, state, pickupPincode } = req.body;

  // Resolve slug: use provided (if any) or generate from name
  let slug = req.body.slug
    ? String(req.body.slug).trim().toLowerCase()
    : generateSlug(name.trim());

  // If name-generated slug is empty (all special chars), fall back to a safe default
  if (!slug) slug = `store-${Date.now()}`;

  // Reserved check
  if (isReservedSlug(slug)) {
    return res.status(400).json({
      success: false,
      code:    "SLUG_RESERVED",
      message: `The slug "${slug}" is reserved and cannot be used.`,
    });
  }

  // Uniqueness check
  const slugTaken = await Store.findOne({ slug });
  if (slugTaken) {
    return res.status(409).json({
      success: false,
      code:    "SLUG_ALREADY_EXISTS",
      message: `The slug "${slug}" is already taken. Please choose another name.`,
    });
  }

  // ── Atomic creation ──────────────────────────────────────────────────────
  let store;
  try {
    store = await Store.create({
      ownerId:       user._id,
      name:          name.trim(),
      slug,
      description:   description.trim(),
      city:          city.trim(),
      state:         state.trim(),
      pickupPincode: pickupPincode.trim(),
      status:        "active",
    });
  } catch (err) {
    // Handle duplicate key at DB level (race condition)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      if (field === "slug") {
        return res.status(409).json({
          success: false,
          code:    "SLUG_ALREADY_EXISTS",
          message: `The slug "${slug}" is already taken.`,
        });
      }
      return res.status(409).json({
        success: false,
        code:    "STORE_ALREADY_EXISTS",
        message: "You already have a store.",
      });
    }
    throw err;
  }

  // Promote user to seller — if this fails, clean up the store
  try {
    await User.findByIdAndUpdate(user._id, { role: "seller" });
  } catch (err) {
    await Store.findByIdAndDelete(store._id);
    throw err;
  }

  return res.status(201).json({
    success: true,
    message: "Store created successfully.",
    data:    toPublicStore(store),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Get the authenticated seller's own store
 * @route  GET /api/stores/me
 * @access Private
 */
export const getMyStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  return res.json({
    success: true,
    data:    toPublicStore(store),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Get a store by slug (public)
 * @route  GET /api/stores/:slug
 * @access Public
 */
export const getStoreBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  const store = await Store.findOne({ slug, status: "active" });

  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "Store not found.",
    });
  }

  // Return public-safe object (toPublicStore already excludes ownerId)
  return res.json({
    success: true,
    data:    toPublicStore(store),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Update the authenticated seller's own store
 * @route  PATCH /api/stores/me
 * @access Private
 */
export const updateMyStore = asyncHandler(async (req, res) => {
  const { valid, errors } = validateUpdateStore(req.body);
  if (!valid) return validationError(res, errors);

  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  // Apply allowed updates only (slug/ownerId/status are never touched)
  const allowedFields = ["name", "description", "city", "state", "pickupPincode"];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      store[field] = typeof req.body[field] === "string"
        ? req.body[field].trim()
        : req.body[field];
    }
  }

  await store.save();

  return res.json({
    success: true,
    message: "Store updated successfully.",
    data:    toPublicStore(store),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Check if a slug is available
 * @route  GET /api/stores/check-slug/:slug
 * @access Private
 */
export const checkSlug = asyncHandler(async (req, res) => {
  const slug = generateSlug(String(req.params.slug));

  if (!slug) {
    return res.json({ slug: "", available: false });
  }

  if (isReservedSlug(slug)) {
    return res.json({ slug, available: false, reason: "reserved" });
  }

  const taken = await Store.findOne({ slug });
  return res.json({ slug, available: !taken });
});
