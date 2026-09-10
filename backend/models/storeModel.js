import mongoose from "mongoose";

/**
 * Store model — Banavoo SaaS
 *
 * One store per seller (ownerId unique index enforces this).
 * Slug is a unique, URL-safe identifier used as the store's public handle.
 */
const storeSchema = new mongoose.Schema(
  {
    ownerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },
    name:        { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },

    city:          { type: String, required: true, trim: true, maxlength: 100 },
    state:         { type: String, required: true, trim: true },
    pickupPincode: { type: String, required: true, trim: true },

    logo:   {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },
    banner: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },

    theme: {
      primaryColor:   { type: String, default: "#111827" },
      secondaryColor: { type: String, default: "#FFFFFF" },
      accentColor:    { type: String, default: "#F59E0B" },
    },

    status: {
      type:    String,
      enum:    ["draft", "active", "suspended", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
storeSchema.index({ ownerId: 1 }, { unique: true });
storeSchema.index({ slug: 1 },    { unique: true });

const Store = mongoose.model("Store", storeSchema);
export default Store;
