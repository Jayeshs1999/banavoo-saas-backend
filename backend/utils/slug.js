/**
 * Slug utilities — Banavoo SaaS
 *
 * Pure functions — no external dependencies.
 */

// ── Reserved slugs ────────────────────────────────────────────────────────────
const RESERVED_SLUGS = new Set([
  "admin", "api", "login", "register", "signup", "seller", "dashboard",
  "support", "help", "about", "contact", "pricing", "settings", "products",
  "orders", "checkout", "cart", "account", "auth", "www", "mail", "cdn",
  "static", "assets", "store", "stores", "banavoo", "app", "dev", "staging",
  "test", "me",
]);

/**
 * Convert a store name to a URL-safe slug.
 * - Lowercase
 * - Replace non-alphanumeric characters (except hyphens) with hyphens
 * - Collapse consecutive hyphens into one
 * - Strip leading/trailing hyphens
 *
 * @param {string} name
 * @returns {string}
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // non-alphanumeric → hyphen
    .replace(/-+/g, "-")           // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");      // strip leading/trailing hyphens
}

/**
 * Check whether a slug is in the reserved list.
 *
 * @param {string} slug  (already normalised / lowercased)
 * @returns {boolean}
 */
export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
