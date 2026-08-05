import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },
    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
    },
    // Name/title of the PG owner met during the visit
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
      maxlength: [100, "Owner name cannot exceed 100 characters"],
    },
    // Name of the PG
    pgName: {
      type: String,
      required: [true, "PG name is required"],
      trim: true,
      maxlength: [150, "PG name cannot exceed 150 characters"],
    },
    // City where this visit happened
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
    },
    // Optional caption / extra notes
    caption: {
      type: String,
      trim: true,
      maxlength: [300, "Caption cannot exceed 300 characters"],
      default: "",
    },
    // Visit / meeting date
    visitDate: {
      type: Date,
      default: null,
    },
    // The super-admin who uploaded (for audit)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

gallerySchema.index({ city: 1 });
gallerySchema.index({ createdAt: -1 });

const Gallery = mongoose.model("Gallery", gallerySchema);

export default Gallery;
