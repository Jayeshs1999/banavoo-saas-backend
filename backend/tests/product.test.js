/**
 * Product & Category validator tests — Banavoo SaaS Step 4
 * Run: node backend/tests/product.test.js
 */

import assert from "assert";
import {
  validateCreateCategory,
  validateUpdateCategory,
} from "../validators/category.validator.js";
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateVariant,
  validateImageReorder,
  validatePublishRequirements,
} from "../validators/product.validator.js";

// ── Test runner ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const ok    = (v, m) => assert.ok(v, m);
const notOk = (v, m) => assert.ok(!v, m);
function hasError(errors, key) { assert.ok(errors[key], `Expected error for "${key}", got none`); }
function noError(errors, key)  { assert.ok(!errors[key], `Unexpected error for "${key}": ${errors[key]}`); }

// ─────────────────────────────────────────────────────────────────────────────
// ── validateCreateCategory ────────────────────────────────────────────────────

console.log("\n── validateCreateCategory ────────────────────────────────────");

test("valid minimal category", () => {
  const { valid } = validateCreateCategory({ name: "Jewelry" });
  ok(valid);
});

test("valid full category", () => {
  const { valid } = validateCreateCategory({
    name:        "Handmade Bags",
    description: "Artisan crafted bags",
    sortOrder:   2,
    isActive:    true,
  });
  ok(valid);
});

test("empty name is rejected", () => {
  const { valid, errors } = validateCreateCategory({ name: "" });
  notOk(valid);
  hasError(errors, "name");
});

test("name too long (>100) is rejected", () => {
  const { valid, errors } = validateCreateCategory({ name: "a".repeat(101) });
  notOk(valid);
  hasError(errors, "name");
});

test("HTML in name is rejected", () => {
  const { valid, errors } = validateCreateCategory({ name: "<script>alert(1)</script>" });
  notOk(valid);
  hasError(errors, "name");
});

test("description too long is rejected", () => {
  const { valid, errors } = validateCreateCategory({ name: "Bags", description: "d".repeat(501) });
  notOk(valid);
  hasError(errors, "description");
});

test("negative sortOrder is rejected", () => {
  const { valid, errors } = validateCreateCategory({ name: "Bags", sortOrder: -1 });
  notOk(valid);
  hasError(errors, "sortOrder");
});

test("non-integer sortOrder is rejected", () => {
  const { valid, errors } = validateCreateCategory({ name: "Bags", sortOrder: 1.5 });
  notOk(valid);
  hasError(errors, "sortOrder");
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateUpdateCategory ────────────────────────────────────────────────────

console.log("\n── validateUpdateCategory ────────────────────────────────────");

test("empty update body is valid", () => {
  const { valid } = validateUpdateCategory({});
  ok(valid);
});

test("storeId in body is rejected", () => {
  const { valid, errors } = validateUpdateCategory({ storeId: "abc" });
  notOk(valid);
  hasError(errors, "storeId");
});

test("slug in body is rejected", () => {
  const { valid, errors } = validateUpdateCategory({ slug: "new-slug" });
  notOk(valid);
  hasError(errors, "slug");
});

test("isActive must be boolean", () => {
  const { valid, errors } = validateUpdateCategory({ isActive: "yes" });
  notOk(valid);
  hasError(errors, "isActive");
});

test("valid update", () => {
  const { valid } = validateUpdateCategory({ name: "Updated Name", isActive: false, sortOrder: 3 });
  ok(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateCreateProduct ─────────────────────────────────────────────────────

console.log("\n── validateCreateProduct ─────────────────────────────────────");

const BASE_PRODUCT = {
  name:        "Handmade Blue Mug",
  productType: "simple",
  pricing:     { price: 799, compareAtPrice: 999, currency: "INR" },
};

test("valid simple product", () => {
  const { valid } = validateCreateProduct(BASE_PRODUCT);
  ok(valid);
});

test("name is required", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, name: "" });
  notOk(valid);
  hasError(errors, "name");
});

test("name too short (< 2 chars)", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, name: "A" });
  notOk(valid);
  hasError(errors, "name");
});

test("name too long (> 200 chars)", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, name: "a".repeat(201) });
  notOk(valid);
  hasError(errors, "name");
});

test("HTML in name is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, name: "<b>Mug</b>" });
  notOk(valid);
  hasError(errors, "name");
});

test("price is required", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, pricing: {} });
  notOk(valid);
  hasError(errors, "pricing.price");
});

test("negative price is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, pricing: { price: -10 } });
  notOk(valid);
  hasError(errors, "pricing.price");
});

test("compareAtPrice < price is rejected", () => {
  const { valid, errors } = validateCreateProduct({
    ...BASE_PRODUCT,
    pricing: { price: 999, compareAtPrice: 500 },
  });
  notOk(valid);
  hasError(errors, "pricing.compareAtPrice");
});

test("compareAtPrice === price is valid", () => {
  const { valid } = validateCreateProduct({
    ...BASE_PRODUCT,
    pricing: { price: 999, compareAtPrice: 999 },
  });
  ok(valid);
});

test("invalid productType is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, productType: "digital" });
  notOk(valid);
  hasError(errors, "productType");
});

test("invalid status is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, status: "live" });
  notOk(valid);
  hasError(errors, "status");
});

test("invalid categoryIds (not array) is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, categoryIds: "abc" });
  notOk(valid);
  hasError(errors, "categoryIds");
});

test("invalid category ObjectId is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, categoryIds: ["not-an-objectid"] });
  notOk(valid);
  hasError(errors, "categoryIds");
});

test("valid inventory config", () => {
  const { valid } = validateCreateProduct({
    ...BASE_PRODUCT,
    inventory: { trackInventory: true, quantity: 10, lowStockThreshold: 5, allowBackorder: false },
  });
  ok(valid);
});

test("negative quantity is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, inventory: { quantity: -5 } });
  notOk(valid);
  hasError(errors, "inventory.quantity");
});

test("non-integer quantity is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, inventory: { quantity: 2.5 } });
  notOk(valid);
  hasError(errors, "inventory.quantity");
});

test("SEO title > 70 chars is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, seo: { title: "a".repeat(71) } });
  notOk(valid);
  hasError(errors, "seo.title");
});

test("SEO description > 170 chars is rejected", () => {
  const { valid, errors } = validateCreateProduct({ ...BASE_PRODUCT, seo: { description: "b".repeat(171) } });
  notOk(valid);
  hasError(errors, "seo.description");
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateUpdateProduct ─────────────────────────────────────────────────────

console.log("\n── validateUpdateProduct ─────────────────────────────────────");

test("empty update body is valid", () => {
  const { valid } = validateUpdateProduct({});
  ok(valid);
});

test("storeId is rejected", () => {
  const { valid, errors } = validateUpdateProduct({ storeId: "abc" });
  notOk(valid);
  hasError(errors, "storeId");
});

test("ownerId is rejected", () => {
  const { valid, errors } = validateUpdateProduct({ ownerId: "abc" });
  notOk(valid);
  hasError(errors, "ownerId");
});

test("createdAt is rejected", () => {
  const { valid, errors } = validateUpdateProduct({ createdAt: new Date() });
  notOk(valid);
  hasError(errors, "createdAt");
});

test("valid partial update", () => {
  const { valid } = validateUpdateProduct({
    name:   "Updated Name",
    status: "published",
    pricing: { price: 899 },
  });
  ok(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateVariant ───────────────────────────────────────────────────────────

console.log("\n── validateVariant ───────────────────────────────────────────");

test("valid variant", () => {
  const { valid } = validateVariant({
    name:    "Blue / M",
    sku:     "KURTA-BLUE-M",
    options: [{ name: "Color", value: "Blue" }, { name: "Size", value: "M" }],
    price:   1499,
    quantity: 4,
  });
  ok(valid);
});

test("variant name is required", () => {
  const { valid, errors } = validateVariant({ options: [{ name: "Color", value: "Blue" }] });
  notOk(valid);
  hasError(errors, "name");
});

test("variant options required", () => {
  const { valid, errors } = validateVariant({ name: "Blue / M", options: [] });
  notOk(valid);
  hasError(errors, "options");
});

test("negative variant price is rejected", () => {
  const { valid, errors } = validateVariant({
    name:    "Blue",
    options: [{ name: "Color", value: "Blue" }],
    price:   -100,
  });
  notOk(valid);
  hasError(errors, "price");
});

test("negative variant quantity is rejected", () => {
  const { valid, errors } = validateVariant({
    name:     "Blue",
    options:  [{ name: "Color", value: "Blue" }],
    quantity: -1,
  });
  notOk(valid);
  hasError(errors, "quantity");
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateImageReorder ──────────────────────────────────────────────────────

console.log("\n── validateImageReorder ──────────────────────────────────────");

test("valid reorder array", () => {
  const { valid } = validateImageReorder([
    { _id: "507f1f77bcf86cd799439011", sortOrder: 0 },
    { _id: "507f1f77bcf86cd799439012", sortOrder: 1 },
  ]);
  ok(valid);
});

test("empty array is rejected", () => {
  const { valid } = validateImageReorder([]);
  notOk(valid);
});

test("invalid ObjectId is rejected", () => {
  const { valid, errors } = validateImageReorder([{ _id: "bad-id", sortOrder: 0 }]);
  notOk(valid);
  hasError(errors, "images");
});

test("more than 8 images is rejected", () => {
  const imgs = Array.from({ length: 9 }, (_, i) => ({
    _id: `507f1f77bcf86cd79943901${i}`,
    sortOrder: i,
  }));
  const { valid } = validateImageReorder(imgs);
  notOk(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validatePublishRequirements ───────────────────────────────────────────────

console.log("\n── validatePublishRequirements ───────────────────────────────");

test("product with name + price + image can be published", () => {
  const errors = validatePublishRequirements({
    name:        "Mug",
    productType: "simple",
    pricing:     { price: 799 },
    images:      [{ url: "https://res.cloudinary.com/x/image/upload/v1/test.jpg", publicId: "test" }],
    variants:    [],
    inventory:   {},
  });
  ok(errors.length === 0, "Expected no publish errors");
});

test("product without image cannot be published", () => {
  const errors = validatePublishRequirements({
    name:        "Mug",
    productType: "simple",
    pricing:     { price: 799 },
    images:      [],
    variants:    [],
  });
  ok(errors.length > 0, "Expected publish error for missing image");
});

test("product with zero price cannot be published — price = 0 is OK (free product allowed)", () => {
  // price = 0 is valid (free product)
  const errors = validatePublishRequirements({
    name:        "Free Sticker",
    productType: "simple",
    pricing:     { price: 0 },
    images:      [{ url: "https://example.com/img.jpg", publicId: "test" }],
    variants:    [],
  });
  ok(errors.length === 0, "Free product (price=0) should be publishable");
});

test("variable product without variants cannot be published", () => {
  const errors = validatePublishRequirements({
    name:        "Kurta",
    productType: "variable",
    pricing:     { price: 999 },
    images:      [{ url: "https://example.com/img.jpg", publicId: "test" }],
    variants:    [], // no active variants
  });
  ok(errors.length > 0, "Expected publish error for variable product with no variants");
});

test("variable product with active variant can be published", () => {
  const errors = validatePublishRequirements({
    name:        "Kurta",
    productType: "variable",
    pricing:     { price: 999 },
    images:      [{ url: "https://example.com/img.jpg", publicId: "test" }],
    variants:    [{ isActive: true, options: [{ name: "Size", value: "M" }] }],
  });
  ok(errors.length === 0, "Variable product with active variant should be publishable");
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
