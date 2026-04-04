import { cloudinary } from "../config/cloudinary.js";

/**
 * Upload single image to Cloudinary
 * @route POST /api/upload
 * @access Private (Admin only)
 */
const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Return the Cloudinary URL and public_id
    res.status(200).json({
      success: true,
      imageUrl: req.file.path, // Cloudinary URL
      publicId: req.file.filename, // Cloudinary public_id
      secureUrl: req.file.path, // Secure HTTPS URL
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ message: "Server error during upload", error: error.message });
  }
};

/**
 * Upload multiple images to Cloudinary
 * @route POST /api/upload/multiple
 * @access Private (Admin only)
 */
const uploadMultipleImages = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No image files provided" });
    }

    const uploadedImages = req.files.map((file) => ({
      imageUrl: file.path,
      publicId: file.filename,
      secureUrl: file.path,
    }));

    res.status(200).json({
      success: true,
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ message: "Server error during upload", error: error.message });
  }
};

/**
 * Delete image from Cloudinary
 * @route DELETE /api/upload/:publicId
 * @access Private (Admin only)
 */
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ message: "Server error during deletion", error: error.message });
  }
};

export { uploadImage, uploadMultipleImages, deleteImage };
