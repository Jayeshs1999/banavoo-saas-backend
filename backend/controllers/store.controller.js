import asyncHandler from "../middleware/asyncHandler.js";
import Store from "../models/storeModel.js";
import User from "../models/userModel.js";
import { generateSlug, isReservedSlug } from "../utils/slug.js";
import {
  validateCreateStore,
  validateUpdateStore,
} from "../validators/store.validator.js";
import {
  validateTheme,
  validateHomepage,
  validateSocialLinks,
  validateSeo,
  validateContactSettings,
  validateFullStoreUpdate,
} from "../validators/theme.validator.js";
import { uploadImage, deleteImage } from "../services/cloudinary.service.js";

// ── Helper ────────────────────────────────────────────────────────────────────
const validationError = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed.",
    code:    "VALIDATION_ERROR",
    errors,
  });

/**
 * Return a public-safe store object.
 * Omits ownerId and all internal Mongoose fields.
 * Now includes the full Step 3 fields: favicon, theme, homepage, socialLinks,
 * contactSettings, seo.
 */
function toPublicStore(store) {
  return {
    id:              store._id,
    name:            store.name,
    slug:            store.slug,
    description:     store.description,
    city:            store.city,
    state:           store.state,
    pickupPincode:   store.pickupPincode,

    // Branding
    logo:            store.logo,
    banner:          store.banner,
    favicon:         store.favicon,

    // Theme
    theme:           store.theme,

    // Homepage
    homepage:        store.homepage,

    // Social & contact
    socialLinks:     store.socialLinks,
    contactSettings: store.contactSettings,

    // SEO
    seo:             store.seo,

    status:          store.status,
    createdAt:       store.createdAt,
    updatedAt:       store.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Step 2 handlers (unchanged) ───────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Create a new store and promote user to seller
 * @route  POST /api/stores
 * @access Private (authenticated + emailVerified)
 */
export const createStore = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      code:    "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before creating a store.",
    });
  }

  const existing = await Store.findOne({ ownerId: user._id });
  if (existing) {
    return res.status(409).json({
      success: false,
      code:    "STORE_ALREADY_EXISTS",
      message: "You already have a store.",
    });
  }

  const { valid, errors } = validateCreateStore(req.body);
  if (!valid) return validationError(res, errors);

  const { name, description, city, state, pickupPincode } = req.body;

  let slug = req.body.slug
    ? String(req.body.slug).trim().toLowerCase()
    : generateSlug(name.trim());

  if (!slug) slug = `store-${Date.now()}`;

  if (isReservedSlug(slug)) {
    return res.status(400).json({
      success: false,
      code:    "SLUG_RESERVED",
      message: `The slug "${slug}" is reserved and cannot be used.`,
    });
  }

  const slugTaken = await Store.findOne({ slug });
  if (slugTaken) {
    return res.status(409).json({
      success: false,
      code:    "SLUG_ALREADY_EXISTS",
      message: `The slug "${slug}" is already taken. Please choose another name.`,
    });
  }

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
  return res.json({ success: true, data: toPublicStore(store) });
});

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
  return res.json({ success: true, data: toPublicStore(store) });
});

/**
 * @desc   Update basic store info (name, description, location)
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

/**
 * @desc   Check if a slug is available
 * @route  GET /api/stores/check-slug/:slug
 * @access Private
 */
export const checkSlug = asyncHandler(async (req, res) => {
  const slug = generateSlug(String(req.params.slug));
  if (!slug) return res.json({ slug: "", available: false });
  if (isReservedSlug(slug)) return res.json({ slug, available: false, reason: "reserved" });
  const taken = await Store.findOne({ slug });
  return res.json({ slug, available: !taken });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Step 3 handlers — Theme ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Get only the theme object of the seller's store
 * @route  GET /api/stores/me/theme
 * @access Private
 */
export const getTheme = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ ownerId: req.user._id }).select("theme");
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }
  return res.json({ success: true, data: store.theme });
});

/**
 * @desc   Update the theme of the seller's store (partial PATCH supported)
 * @route  PATCH /api/stores/me/theme
 * @access Private
 */
export const updateTheme = asyncHandler(async (req, res) => {
  const { valid, errors } = validateTheme(req.body.theme ?? req.body);
  if (!valid) return validationError(res, errors);

  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  // Accept either { theme: { ... } } or the theme object directly
  const incoming = req.body.theme ?? req.body;

  if (incoming.template !== undefined) store.theme.template = incoming.template;

  if (incoming.colors) {
    for (const key of ["primary", "secondary", "accent", "text", "background"]) {
      if (incoming.colors[key] !== undefined) store.theme.colors[key] = incoming.colors[key];
    }
  }

  if (incoming.typography) {
    if (incoming.typography.headingFont !== undefined)
      store.theme.typography.headingFont = incoming.typography.headingFont;
    if (incoming.typography.bodyFont !== undefined)
      store.theme.typography.bodyFont = incoming.typography.bodyFont;
  }

  if (incoming.buttons) {
    if (incoming.buttons.style !== undefined) store.theme.buttons.style = incoming.buttons.style;
    if (incoming.buttons.size  !== undefined) store.theme.buttons.size  = incoming.buttons.size;
  }

  if (incoming.layout) {
    if (incoming.layout.containerWidth  !== undefined)
      store.theme.layout.containerWidth = incoming.layout.containerWidth;
    if (incoming.layout.productColumns  !== undefined)
      store.theme.layout.productColumns = Number(incoming.layout.productColumns);
  }

  store.markModified("theme");
  await store.save();

  return res.json({
    success: true,
    message: "Theme updated successfully.",
    data:    store.theme,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Step 3 handlers — Branding (image uploads) ────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Upload / replace the store logo
 * @route  POST /api/stores/me/logo
 * @access Private
 */
export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      code:    "NO_FILE",
      message: "Please upload an image file.",
    });
  }

  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  // Delete old logo from Cloudinary if present
  if (store.logo?.publicId) {
    await deleteImage(store.logo.publicId).catch(() => {});
  }

  const result = await uploadImage(req.file.buffer, {
    folder:   "banavoo/logos",
    publicId: `store-${store._id}-logo`,
    width:    400,
    height:   400,
  });

  store.logo = { url: result.url, publicId: result.publicId };
  await store.save();

  return res.json({
    success: true,
    message: "Logo uploaded successfully.",
    data:    store.logo,
  });
});

/**
 * @desc   Delete the store logo
 * @route  DELETE /api/stores/me/logo
 * @access Private
 */
export const deleteLogo = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  if (store.logo?.publicId) {
    await deleteImage(store.logo.publicId).catch(() => {});
  }

  store.logo = { url: null, publicId: null };
  await store.save();

  return res.json({ success: true, message: "Logo removed." });
});

/**
 * @desc   Upload / replace the store banner
 * @route  POST /api/stores/me/banner
 * @access Private
 */
export const uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      code:    "NO_FILE",
      message: "Please upload an image file.",
    });
  }

  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  if (store.banner?.publicId) {
    await deleteImage(store.banner.publicId).catch(() => {});
  }

  const result = await uploadImage(req.file.buffer, {
    folder:   "banavoo/banners",
    publicId: `store-${store._id}-banner`,
    width:    1600,
    height:   600,
  });

  store.banner = { url: result.url, publicId: result.publicId };
  await store.save();

  return res.json({
    success: true,
    message: "Banner uploaded successfully.",
    data:    store.banner,
  });
});

/**
 * @desc   Delete the store banner
 * @route  DELETE /api/stores/me/banner
 * @access Private
 */
export const deleteBanner = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  if (store.banner?.publicId) {
    await deleteImage(store.banner.publicId).catch(() => {});
  }

  store.banner = { url: null, publicId: null };
  await store.save();

  return res.json({ success: true, message: "Banner removed." });
});

/**
 * @desc   Upload / replace the store favicon
 * @route  POST /api/stores/me/favicon
 * @access Private
 */
export const uploadFavicon = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      code:    "NO_FILE",
      message: "Please upload an image file.",
    });
  }

  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  if (store.favicon?.publicId) {
    await deleteImage(store.favicon.publicId).catch(() => {});
  }

  const result = await uploadImage(req.file.buffer, {
    folder:   "banavoo/favicons",
    publicId: `store-${store._id}-favicon`,
    width:    64,
    height:   64,
  });

  store.favicon = { url: result.url, publicId: result.publicId };
  await store.save();

  return res.json({
    success: true,
    message: "Favicon uploaded successfully.",
    data:    store.favicon,
  });
});

/**
 * @desc   Delete the store favicon
 * @route  DELETE /api/stores/me/favicon
 * @access Private
 */
export const deleteFavicon = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  if (store.favicon?.publicId) {
    await deleteImage(store.favicon.publicId).catch(() => {});
  }

  store.favicon = { url: null, publicId: null };
  await store.save();

  return res.json({ success: true, message: "Favicon removed." });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Step 3 handlers — Full branding PATCH ─────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Update all non-image branding fields in one request:
 *         theme, homepage text, socialLinks, seo, contactSettings.
 *         Does NOT handle file uploads — use the dedicated upload endpoints.
 * @route  PATCH /api/stores/me/branding
 * @access Private
 */
export const updateStoreFull = asyncHandler(async (req, res) => {
  const { valid, errors } = validateFullStoreUpdate(req.body);
  if (!valid) return validationError(res, errors);

  const store = await Store.findOne({ ownerId: req.user._id });
  if (!store) {
    return res.status(404).json({
      success: false,
      code:    "STORE_NOT_FOUND",
      message: "You do not have a store yet.",
    });
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  const incoming = req.body;

  if (incoming.theme) {
    const t = incoming.theme;
    if (t.template !== undefined) store.theme.template = t.template;
    if (t.colors) {
      for (const k of ["primary", "secondary", "accent", "text", "background"]) {
        if (t.colors[k] !== undefined) store.theme.colors[k] = t.colors[k];
      }
    }
    if (t.typography) {
      if (t.typography.headingFont !== undefined) store.theme.typography.headingFont = t.typography.headingFont;
      if (t.typography.bodyFont    !== undefined) store.theme.typography.bodyFont    = t.typography.bodyFont;
    }
    if (t.buttons) {
      if (t.buttons.style !== undefined) store.theme.buttons.style = t.buttons.style;
      if (t.buttons.size  !== undefined) store.theme.buttons.size  = t.buttons.size;
    }
    if (t.layout) {
      if (t.layout.containerWidth !== undefined) store.theme.layout.containerWidth = t.layout.containerWidth;
      if (t.layout.productColumns !== undefined) store.theme.layout.productColumns = Number(t.layout.productColumns);
    }
    store.markModified("theme");
  }

  // ── Homepage ──────────────────────────────────────────────────────────────
  if (incoming.homepage) {
    const h = incoming.homepage;
    if (h.hero !== undefined) {
      if (h.hero.enabled    !== undefined) store.homepage.hero.enabled    = h.hero.enabled;
      if (h.hero.title      !== undefined) store.homepage.hero.title      = String(h.hero.title).trim();
      if (h.hero.subtitle   !== undefined) store.homepage.hero.subtitle   = String(h.hero.subtitle).trim();
      if (h.hero.buttonText !== undefined) store.homepage.hero.buttonText = String(h.hero.buttonText).trim();
      if (h.hero.buttonUrl  !== undefined) store.homepage.hero.buttonUrl  = String(h.hero.buttonUrl).trim();
    }
    for (const section of ["featuredProducts", "categories", "whyUs", "contact"]) {
      if (h[section]?.enabled !== undefined) store.homepage[section].enabled = h[section].enabled;
    }
    if (h.about !== undefined) {
      if (h.about.enabled     !== undefined) store.homepage.about.enabled     = h.about.enabled;
      if (h.about.heading     !== undefined) store.homepage.about.heading     = String(h.about.heading).trim();
      if (h.about.description !== undefined) store.homepage.about.description = String(h.about.description).trim();
    }
    store.markModified("homepage");
  }

  // ── Social links ──────────────────────────────────────────────────────────
  if (incoming.socialLinks) {
    for (const k of ["instagram", "facebook", "youtube", "whatsapp"]) {
      if (incoming.socialLinks[k] !== undefined)
        store.socialLinks[k] = String(incoming.socialLinks[k]).trim();
    }
    store.markModified("socialLinks");
  }

  // ── Contact settings ──────────────────────────────────────────────────────
  if (incoming.contactSettings) {
    if (incoming.contactSettings.showEmail !== undefined)
      store.contactSettings.showEmail = incoming.contactSettings.showEmail;
    if (incoming.contactSettings.showPhone !== undefined)
      store.contactSettings.showPhone = incoming.contactSettings.showPhone;
    store.markModified("contactSettings");
  }

  // ── SEO ───────────────────────────────────────────────────────────────────
  if (incoming.seo) {
    if (incoming.seo.title       !== undefined) store.seo.title       = String(incoming.seo.title).trim();
    if (incoming.seo.description !== undefined) store.seo.description = String(incoming.seo.description).trim();
    store.markModified("seo");
  }

  await store.save();

  return res.json({
    success: true,
    message: "Store customization saved.",
    data:    toPublicStore(store),
  });
});
