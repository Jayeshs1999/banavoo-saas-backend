/**
 * Cloudinary service — Banavoo SaaS
 *
 * Lazy-initialised: the v2 client is created on first use so that the module
 * can be imported safely even before process.env is populated (e.g. in tests).
 *
 * Uses cloudinary v1 (already in package.json) with a manual stream approach
 * so multer memoryStorage buffers can be uploaded without writing to disk.
 *
 * Usage:
 *   import { uploadImage, deleteImage } from '../services/cloudinary.service.js';
 *
 *   const result = await uploadImage(req.file.buffer, {
 *     folder:   'banavoo/stores/logos',
 *     publicId: `store-${storeId}-logo`,
 *     width:    400,
 *     height:   400,
 *   });
 *   // result = { url: string, publicId: string }
 *
 *   await deleteImage(store.logo.publicId);
 */

import { v2 as cloudinaryV2 } from "cloudinary";
import { Readable } from "stream";

/** @type {import('cloudinary').v2 | null} */
let _cloudinary = null;

/**
 * Return an initialised Cloudinary v2 instance.
 * Throws a clear error when credentials are missing.
 */
function getCloudinary() {
  if (_cloudinary) return _cloudinary;

  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      "Cloudinary credentials are not configured. " +
        "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file."
    );
  }

  cloudinaryV2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure:     true,
  });

  _cloudinary = cloudinaryV2;
  return _cloudinary;
}

/**
 * Convert a Buffer to a Node.js Readable stream.
 * @param {Buffer} buffer
 * @returns {Readable}
 */
function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null); // signal EOF
  return readable;
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload a Buffer to Cloudinary via a streaming pipe.
 *
 * @param {Buffer} buffer          - Raw file data from req.file.buffer (memoryStorage)
 * @param {object} [options]
 * @param {string} [options.folder]   - Cloudinary folder  (e.g. "banavoo/logos")
 * @param {string} [options.publicId] - Deterministic id    (e.g. "store-abc-logo")
 * @param {number} [options.width]    - Max width to resize to (default 1200)
 * @param {number} [options.height]   - Max height to resize to (default 1200)
 * @returns {Promise<{ url: string; publicId: string }>}
 */
export async function uploadImage(buffer, options = {}) {
  const cloud = getCloudinary();

  /** @type {import('cloudinary').UploadApiOptions} */
  const uploadOptions = {
    resource_type: "image",
    folder:        options.folder ?? "banavoo",
    overwrite:     true,
    transformation: [
      {
        width:        options.width  ?? 1200,
        height:       options.height ?? 1200,
        crop:         "limit",
        quality:      "auto",
        fetch_format: "auto",
      },
    ],
  };

  if (options.publicId) {
    uploadOptions.public_id = options.publicId;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloud.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(new Error(error.message || "Cloudinary upload failed"));
        if (!result) return reject(new Error("Cloudinary returned no result"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    bufferToStream(buffer).pipe(uploadStream);
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete an image from Cloudinary by its public_id.
 * Silently ignores "not found" so duplicate deletes are safe.
 *
 * @param {string} publicId
 * @returns {Promise<void>}
 */
export async function deleteImage(publicId) {
  if (!publicId) return;

  const cloud = getCloudinary();
  const result = await cloud.uploader.destroy(publicId, { resource_type: "image" });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(
      `Cloudinary delete failed for publicId "${publicId}": ${result.result}`
    );
  }
}
