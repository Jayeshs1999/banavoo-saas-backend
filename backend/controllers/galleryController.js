import asyncHandler from "../middleware/asyncHandler.js";
import Gallery from "../models/galleryModel.js";
import { cloudinary } from "../config/cloudinary.js";

/**
 * @desc  Upload a new gallery photo (admin only)
 * @route POST /api/gallery
 * @access Private (Admin)
 */
const createGalleryPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Image file is required");
  }

  const { ownerName, pgName, city, caption, visitDate } = req.body;

  if (!ownerName || !pgName || !city) {
    // Roll back the uploaded image so we don't leave orphans in Cloudinary
    await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
    res.status(400);
    throw new Error("ownerName, pgName and city are required");
  }

  const photo = await Gallery.create({
    imageUrl: req.file.path,
    publicId: req.file.filename,
    ownerName,
    pgName,
    city,
    caption: caption || "",
    visitDate: visitDate ? new Date(visitDate) : null,
    uploadedBy: req.admin._id,
  });

  res.status(201).json({ success: true, data: photo });
});

/**
 * @desc  Get all gallery photos (public, paginated)
 * @route GET /api/gallery
 * @access Public
 */
const getGalleryPhotos = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.city) {
    filter.city = { $regex: req.query.city, $options: "i" };
  }

  const [photos, total] = await Promise.all([
    Gallery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Gallery.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: photos,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + photos.length < total,
    },
  });
});

/**
 * @desc  Delete a gallery photo (admin only)
 * @route DELETE /api/gallery/:id
 * @access Private (Admin)
 */
const deleteGalleryPhoto = asyncHandler(async (req, res) => {
  const photo = await Gallery.findById(req.params.id);

  if (!photo) {
    res.status(404);
    throw new Error("Gallery photo not found");
  }

  // Remove from Cloudinary
  if (photo.publicId) {
    await cloudinary.uploader.destroy(photo.publicId).catch((err) => {
      console.warn("Cloudinary delete warning:", err.message);
    });
  }

  await photo.deleteOne();

  res.json({ success: true, message: "Photo deleted successfully" });
});

/**
 * @desc  Get distinct city names used in gallery (for filter pills)
 * @route GET /api/gallery/cities
 * @access Public
 */
const getGalleryCities = asyncHandler(async (req, res) => {
  const cities = await Gallery.distinct("city");
  res.json({ success: true, data: cities.sort() });
});

export { createGalleryPhoto, getGalleryPhotos, deleteGalleryPhoto, getGalleryCities };
