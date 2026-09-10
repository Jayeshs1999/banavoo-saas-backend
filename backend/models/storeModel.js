import mongoose from "mongoose";

/**
 * Store model — Banavoo SaaS Step 3
 *
 * Extended with full theme, branding, homepage, socialLinks, seo, contactSettings.
 * One store per seller — ownerId and slug are both unique.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
const imageField = {
  url:      { type: String, default: null },
  publicId: { type: String, default: null },
};

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

    // ── Branding ──────────────────────────────────────────────────────────────
    logo:    { ...imageField },
    banner:  { ...imageField },
    favicon: { ...imageField },

    // ── Full theme ────────────────────────────────────────────────────────────
    theme: {
      template: { type: String, enum: ["classic", "minimal", "artisan"], default: "classic" },

      colors: {
        primary:    { type: String, default: "#111827" },
        secondary:  { type: String, default: "#FFFFFF" },
        accent:     { type: String, default: "#F59E0B" },
        text:       { type: String, default: "#111827" },
        background: { type: String, default: "#FFFFFF" },
      },

      typography: {
        headingFont: {
          type:    String,
          enum:    ["Inter", "Poppins", "Playfair Display", "Lora", "Roboto", "Montserrat"],
          default: "Inter",
        },
        bodyFont: {
          type:    String,
          enum:    ["Inter", "Poppins", "Playfair Display", "Lora", "Roboto", "Montserrat"],
          default: "Inter",
        },
      },

      buttons: {
        style: { type: String, enum: ["rounded", "square", "pill"], default: "rounded" },
        size:  { type: String, enum: ["small", "medium", "large"],  default: "medium"  },
      },

      layout: {
        containerWidth:  { type: String, enum: ["narrow", "wide", "full"], default: "wide" },
        productColumns:  { type: Number, min: 2, max: 6, default: 4 },
      },
    },

    // ── Homepage section configuration ────────────────────────────────────────
    homepage: {
      hero: {
        enabled:     { type: Boolean, default: true  },
        title:       { type: String,  default: ""    },
        subtitle:    { type: String,  default: ""    },
        buttonText:  { type: String,  default: "Shop Now" },
        buttonUrl:   { type: String,  default: ""    },
        image:       { ...imageField },
      },
      featuredProducts: { enabled: { type: Boolean, default: true } },
      categories:       { enabled: { type: Boolean, default: true } },
      about: {
        enabled:     { type: Boolean, default: true  },
        heading:     { type: String,  default: ""    },
        description: { type: String,  default: ""    },
        image:       { ...imageField },
      },
      whyUs:   { enabled: { type: Boolean, default: false } },
      contact: { enabled: { type: Boolean, default: true  } },
    },

    // ── Social links ──────────────────────────────────────────────────────────
    socialLinks: {
      instagram: { type: String, default: "" },
      facebook:  { type: String, default: "" },
      youtube:   { type: String, default: "" },
      whatsapp:  { type: String, default: "" },
    },

    // ── Contact visibility settings ───────────────────────────────────────────
    contactSettings: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
    },

    // ── SEO ───────────────────────────────────────────────────────────────────
    seo: {
      title:       { type: String, default: "", maxlength: 70  },
      description: { type: String, default: "", maxlength: 170 },
    },

    status: {
      type:    String,
      enum:    ["draft", "active", "suspended", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
storeSchema.index({ ownerId: 1 }, { unique: true });
storeSchema.index({ slug: 1 },    { unique: true });

const Store = mongoose.model("Store", storeSchema);
export default Store;
