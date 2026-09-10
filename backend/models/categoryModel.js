import mongoose from "mongoose";

/**
 * Category model — Banavoo SaaS Step 4
 *
 * Every category belongs to exactly one Store (multi-tenant).
 * Slugs are unique per store, NOT globally.
 */
const categorySchema = new mongoose.Schema(
  {
    storeId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
    },

    name: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 1,
      maxlength: 100,
    },

    slug: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
    },

    description: {
      type:    String,
      default: "",
      trim:    true,
      maxlength: 500,
    },

    image: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },

    isActive:  { type: Boolean, default: true  },
    sortOrder: { type: Number,  default: 0     },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// slug uniqueness is scoped to a store (not global)
categorySchema.index({ storeId: 1, slug: 1 }, { unique: true });
categorySchema.index({ storeId: 1, isActive: 1, sortOrder: 1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;
