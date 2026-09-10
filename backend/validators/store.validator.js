/**
 * Store validators — Banavoo SaaS
 */

// ── Indian states & UTs ───────────────────────────────────────────────────────
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const INDIAN_STATES_SET = new Set(INDIAN_STATES);

// ── Helpers ───────────────────────────────────────────────────────────────────
const PINCODE_RE = /^\d{6}$/;
const SLUG_RE    = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

/**
 * Validate store creation payload.
 *
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateCreateStore(body) {
  const errors = {};

  // name
  const name = (body.name || "").trim();
  if (!name) {
    errors.name = "Store name is required.";
  } else if (name.length < 2) {
    errors.name = "Store name must be at least 2 characters.";
  } else if (name.length > 100) {
    errors.name = "Store name must be 100 characters or fewer.";
  }

  // description
  const description = (body.description || "").trim();
  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length < 10) {
    errors.description = "Description must be at least 10 characters.";
  } else if (description.length > 500) {
    errors.description = "Description must be 500 characters or fewer.";
  }

  // city
  const city = (body.city || "").trim();
  if (!city) {
    errors.city = "City is required.";
  } else if (city.length > 100) {
    errors.city = "City must be 100 characters or fewer.";
  }

  // state
  const state = (body.state || "").trim();
  if (!state) {
    errors.state = "State is required.";
  } else if (!INDIAN_STATES_SET.has(state)) {
    errors.state = "Please select a valid Indian state or union territory.";
  }

  // pickupPincode
  const pickupPincode = (body.pickupPincode || "").trim();
  if (!pickupPincode) {
    errors.pickupPincode = "Pickup pincode is required.";
  } else if (!PINCODE_RE.test(pickupPincode)) {
    errors.pickupPincode = "Pickup pincode must be exactly 6 digits.";
  }

  // slug (optional — if provided, must be valid format)
  if (body.slug !== undefined && body.slug !== "") {
    const slug = String(body.slug).trim().toLowerCase();
    if (slug.length < 2) {
      errors.slug = "Slug must be at least 2 characters.";
    } else if (slug.length > 60) {
      errors.slug = "Slug must be 60 characters or fewer.";
    } else if (!SLUG_RE.test(slug)) {
      errors.slug = "Slug may only contain lowercase letters, numbers, and hyphens.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate store update payload.
 * All fields are optional; slug/ownerId/status changes are explicitly rejected.
 *
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateUpdateStore(body) {
  const errors = {};

  // Reject forbidden fields
  if ("slug" in body)    errors.slug    = "Slug cannot be changed after store creation.";
  if ("ownerId" in body) errors.ownerId = "Owner cannot be changed.";
  if ("status" in body)  errors.status  = "Store status cannot be changed via this endpoint.";

  // name (optional)
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) {
      errors.name = "Store name must be at least 2 characters.";
    } else if (name.length > 100) {
      errors.name = "Store name must be 100 characters or fewer.";
    }
  }

  // description (optional)
  if (body.description !== undefined) {
    const description = String(body.description).trim();
    if (description.length < 10) {
      errors.description = "Description must be at least 10 characters.";
    } else if (description.length > 500) {
      errors.description = "Description must be 500 characters or fewer.";
    }
  }

  // city (optional)
  if (body.city !== undefined) {
    const city = String(body.city).trim();
    if (!city) {
      errors.city = "City cannot be empty.";
    } else if (city.length > 100) {
      errors.city = "City must be 100 characters or fewer.";
    }
  }

  // state (optional)
  if (body.state !== undefined) {
    const state = String(body.state).trim();
    if (!INDIAN_STATES_SET.has(state)) {
      errors.state = "Please select a valid Indian state or union territory.";
    }
  }

  // pickupPincode (optional)
  if (body.pickupPincode !== undefined) {
    const pincode = String(body.pickupPincode).trim();
    if (!PINCODE_RE.test(pincode)) {
      errors.pickupPincode = "Pickup pincode must be exactly 6 digits.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
