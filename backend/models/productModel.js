import mongoose from "mongoose";

/**
 * Product model — Banavoo SaaS Step 4
 *
 * Every product belongs to exactly one Store (multi-tenant).
 * Slugs are unique per store. SKUs are unique per store.
 * Supports: simple products and variable products (with variants).
 */

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const imageSchema = new mongoose.Schema(
  {
    url:       { type: String, required: true },
    publicId:  { type: String, required: true },
    alt:       { type: String, default: "" },
    sortOrder: { type: Number, default: 0  },
  },
  { _id: true }
);

const variantOptionSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    sku:             { type: String, default: "", trim: true, uppercase: true },
    options:         { type: [variantOptionSchema], default: [] },
    price:           { type: Number, default: null, min: 0 },
    compareAtPrice:  { type: Number, default: null, min: 0 },
    quantity:        { type: Number, default: 0,    min: 0 },
    image: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

// ── Main schema ────────────────────────────────────────────────────────────────

const productSchema = new mongoose.Schema(
  {
    storeId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
    },

    categoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "Category",
      },
    ],

    name: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 2,
      maxlength: 200,
    },

    slug: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
    },

    shortDescription: {
      type:    String,
      default: "",
      trim:    true,
      maxlength: 300,
    },

    description: {
      type:    String,
      default: "",
      trim:    true,
      maxlength: 10000,
    },

    images: { type: [imageSchema], default: [] },

    productType: {
      type:    String,
      enum:    ["simple", "variable"],
      default: "simple",
    },

    pricing: {
      price:          { type: Number, required: true, min: 0 },
      compareAtPrice: { type: Number, default: null,  min: 0 },
      costPrice:      { type: Number, default: null,  min: 0 }, // never exposed publicly
      currency:       { type: String, default: "INR" },
    },

    inventory: {
      trackInventory:    { type: Boolean, default: true  },
      quantity:          { type: Number,  default: 0, min: 0 },
      lowStockThreshold: { type: Number,  default: 5, min: 0 },
      allowBackorder:    { type: Boolean, default: false },
    },

    variants: { type: [variantSchema], default: [] },

    sku: {
      type:      String,
      default:   "",
      trim:      true,
      uppercase: true,
    },

    status: {
      type:    String,
      enum:    ["draft", "published", "archived"],
      default: "draft",
    },

    isFeatured: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true  },

    seo: {
      title:       { type: String, default: "", maxlength: 70  },
      description: { type: String, default: "", maxlength: 170 },
    },

    shipping: {
      weight: { type: Number, default: null, min: 0 }, // grams
      length: { type: Number, default: null, min: 0 }, // cm
      width:  { type: Number, default: null, min: 0 },
      height: { type: Number, default: null, min: 0 },
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// slug + sku scoped to store (not global)
productSchema.index({ storeId: 1, slug:      1 }, { unique: true });
productSchema.index({ storeId: 1, status:    1 });
productSchema.index({ storeId: 1, categoryIds: 1 });
productSchema.index({ storeId: 1, createdAt: -1 });
// Sparse index for SKU — allows empty-string SKUs on multiple products
productSchema.index(
  { storeId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $gt: "" } } }
);

// ── Virtual: public availability flag ─────────────────────────────────────────
productSchema.virtual("inStock").get(function () {
  if (this.productType === "variable") {
    return this.variants.some(
      (v) =>
        v.isActive &&
        (v.quantity > 0 || /* check base product allows backorder for variant */ false)
    );
  }
  if (!this.inventory.trackInventory) return true;
  return this.inventory.allowBackorder || this.inventory.quantity > 0;
});

productSchema.set("toJSON",   { virtuals: true });
productSchema.set("toObject", { virtuals: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
