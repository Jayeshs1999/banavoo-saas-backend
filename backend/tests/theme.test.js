/**
 * Theme & branding validator tests — Banavoo SaaS Step 3
 *
 * Run: node --experimental-vm-modules backend/tests/theme.test.js
 */

import assert from "assert";
import {
  validateTheme,
  validateHomepage,
  validateSocialLinks,
  validateSeo,
  validateContactSettings,
  validateFullStoreUpdate,
} from "../validators/theme.validator.js";

// ── Simple test runner ────────────────────────────────────────────────────────
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

function ok(result, msg) {
  assert.ok(result, msg);
}
function notOk(result, msg) {
  assert.ok(!result, msg);
}
function hasError(errors, key) {
  assert.ok(errors[key], `Expected error for "${key}" but found none`);
}
function noError(errors, key) {
  assert.ok(!errors[key], `Expected no error for "${key}" but got: ${errors[key]}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ── validateTheme ─────────────────────────────────────────────────────────────

console.log("\n── validateTheme ─────────────────────────────────────────────");

test("valid full theme", () => {
  const { valid } = validateTheme({
    template: "minimal",
    colors: {
      primary:    "#111827",
      secondary:  "#ffffff",
      accent:     "#F59E0B",
      text:       "#333333",
      background: "#fff",
    },
    typography: { headingFont: "Poppins", bodyFont: "Inter" },
    buttons:    { style: "pill", size: "large" },
    layout:     { containerWidth: "wide", productColumns: 4 },
  });
  ok(valid, "valid theme should pass");
});

test("valid partial theme (only colors)", () => {
  const { valid } = validateTheme({ colors: { primary: "#abc" } });
  ok(valid, "partial theme patch should be valid");
});

test("invalid template value", () => {
  const { valid, errors } = validateTheme({ template: "neon" });
  notOk(valid);
  hasError(errors, "theme.template");
});

test("invalid hex color — missing hash", () => {
  const { valid, errors } = validateTheme({ colors: { primary: "111827" } });
  notOk(valid);
  hasError(errors, "theme.colors.primary");
});

test("invalid hex color — CSS injection attempt", () => {
  const { valid, errors } = validateTheme({ colors: { background: "red; color: evil" } });
  notOk(valid);
  hasError(errors, "theme.colors.background");
});

test("invalid heading font", () => {
  const { valid, errors } = validateTheme({ typography: { headingFont: "Comic Sans" } });
  notOk(valid);
  hasError(errors, "theme.typography.headingFont");
});

test("invalid button style", () => {
  const { valid, errors } = validateTheme({ buttons: { style: "sharp" } });
  notOk(valid);
  hasError(errors, "theme.buttons.style");
});

test("invalid productColumns — out of range (too high)", () => {
  const { valid, errors } = validateTheme({ layout: { productColumns: 10 } });
  notOk(valid);
  hasError(errors, "theme.layout.productColumns");
});

test("invalid productColumns — not an integer", () => {
  const { valid, errors } = validateTheme({ layout: { productColumns: "four" } });
  notOk(valid);
  hasError(errors, "theme.layout.productColumns");
});

test("undefined theme passes (no-op)", () => {
  const { valid } = validateTheme(undefined);
  ok(valid, "undefined theme should be a no-op");
});

test("theme is not an object", () => {
  const { valid } = validateTheme("dark");
  notOk(valid);
});

test("3-digit hex is valid", () => {
  const { valid } = validateTheme({ colors: { primary: "#abc" } });
  ok(valid);
});

test("6-digit hex is valid", () => {
  const { valid } = validateTheme({ colors: { primary: "#aabbcc" } });
  ok(valid);
});

test("7-digit hex is invalid", () => {
  const { valid, errors } = validateTheme({ colors: { primary: "#aabbccd" } });
  notOk(valid);
  hasError(errors, "theme.colors.primary");
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateHomepage ──────────────────────────────────────────────────────────

console.log("\n── validateHomepage ──────────────────────────────────────────");

test("valid homepage", () => {
  const { valid } = validateHomepage({
    hero: {
      enabled:    true,
      title:      "Handmade with love",
      subtitle:   "Shop unique Indian crafts",
      buttonText: "Shop Now",
      buttonUrl:  "https://example.com",
    },
    about: { heading: "Our Story", description: "We make things." },
  });
  ok(valid);
});

test("hero title too long", () => {
  const { valid, errors } = validateHomepage({ hero: { title: "a".repeat(121) } });
  notOk(valid);
  hasError(errors, "homepage.hero.title");
});

test("hero subtitle too long", () => {
  const { valid, errors } = validateHomepage({ hero: { subtitle: "b".repeat(201) } });
  notOk(valid);
  hasError(errors, "homepage.hero.subtitle");
});

test("hero button URL invalid", () => {
  const { valid, errors } = validateHomepage({ hero: { buttonUrl: "not a url" } });
  notOk(valid);
  hasError(errors, "homepage.hero.buttonUrl");
});

test("hero button URL empty string is allowed", () => {
  const { valid } = validateHomepage({ hero: { buttonUrl: "" } });
  ok(valid);
});

test("about description too long", () => {
  const { valid, errors } = validateHomepage({ about: { description: "x".repeat(601) } });
  notOk(valid);
  hasError(errors, "homepage.about.description");
});

test("undefined homepage passes", () => {
  const { valid } = validateHomepage(undefined);
  ok(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateSocialLinks ────────────────────────────────────────────────────────

console.log("\n── validateSocialLinks ───────────────────────────────────────");

test("valid social links", () => {
  const { valid } = validateSocialLinks({
    instagram: "https://instagram.com/banavoo",
    facebook:  "https://facebook.com/banavoo",
    youtube:   "https://youtube.com/banavoo",
    whatsapp:  "9876543210",
  });
  ok(valid);
});

test("valid whatsapp wa.me link", () => {
  const { valid } = validateSocialLinks({ whatsapp: "https://wa.me/919876543210" });
  ok(valid);
});

test("invalid instagram URL", () => {
  const { valid, errors } = validateSocialLinks({ instagram: "banavoo.insta" });
  notOk(valid);
  hasError(errors, "socialLinks.instagram");
});

test("invalid whatsapp — letters in phone number", () => {
  const { valid, errors } = validateSocialLinks({ whatsapp: "nineninenine" });
  notOk(valid);
  hasError(errors, "socialLinks.whatsapp");
});

test("empty strings are ignored", () => {
  const { valid } = validateSocialLinks({ instagram: "", whatsapp: "" });
  ok(valid);
});

test("undefined socialLinks passes", () => {
  const { valid } = validateSocialLinks(undefined);
  ok(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateSeo ───────────────────────────────────────────────────────────────

console.log("\n── validateSeo ───────────────────────────────────────────────");

test("valid SEO", () => {
  const { valid } = validateSeo({
    title:       "Priya Handmade — Artisan Crafts from Jaipur",
    description: "Unique handmade products by Priya Sharma.",
  });
  ok(valid);
});

test("SEO title too long (> 70 chars)", () => {
  const { valid, errors } = validateSeo({ title: "a".repeat(71) });
  notOk(valid);
  hasError(errors, "seo.title");
});

test("SEO description too long (> 170 chars)", () => {
  const { valid, errors } = validateSeo({ description: "b".repeat(171) });
  notOk(valid);
  hasError(errors, "seo.description");
});

test("exactly 70 chars title is valid", () => {
  const { valid } = validateSeo({ title: "a".repeat(70) });
  ok(valid);
});

test("exactly 170 chars description is valid", () => {
  const { valid } = validateSeo({ description: "b".repeat(170) });
  ok(valid);
});

test("undefined SEO passes", () => {
  const { valid } = validateSeo(undefined);
  ok(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateContactSettings ────────────────────────────────────────────────────

console.log("\n── validateContactSettings ───────────────────────────────────");

test("valid contact settings", () => {
  const { valid } = validateContactSettings({ showEmail: true, showPhone: false });
  ok(valid);
});

test("invalid — showEmail is a string", () => {
  const { valid, errors } = validateContactSettings({ showEmail: "yes" });
  notOk(valid);
  hasError(errors, "contactSettings.showEmail");
});

test("invalid — showPhone is a number", () => {
  const { valid, errors } = validateContactSettings({ showPhone: 1 });
  notOk(valid);
  hasError(errors, "contactSettings.showPhone");
});

test("undefined contactSettings passes", () => {
  const { valid } = validateContactSettings(undefined);
  ok(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── validateFullStoreUpdate ────────────────────────────────────────────────────

console.log("\n── validateFullStoreUpdate ────────────────────────────────────");

test("valid full update", () => {
  const { valid } = validateFullStoreUpdate({
    theme:           { colors: { primary: "#111827" } },
    homepage:        { hero: { title: "Welcome" } },
    socialLinks:     { instagram: "https://instagram.com/test" },
    seo:             { title: "My Store" },
    contactSettings: { showEmail: false },
  });
  ok(valid);
});

test("multiple errors from different sub-objects", () => {
  const { valid, errors } = validateFullStoreUpdate({
    theme:       { colors: { primary: "bad" } },
    seo:         { title: "a".repeat(80) },
    socialLinks: { whatsapp: "notaphone" },
  });
  notOk(valid);
  hasError(errors, "theme.colors.primary");
  hasError(errors, "seo.title");
  hasError(errors, "socialLinks.whatsapp");
});

test("empty body passes (all optional)", () => {
  const { valid } = validateFullStoreUpdate({});
  ok(valid);
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
