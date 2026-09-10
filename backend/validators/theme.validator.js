/**
 * Theme & branding validators — Banavoo SaaS Step 3
 *
 * All validators return { valid: boolean, errors: Record<string, string> }
 * so controllers can call them uniformly.
 */

// ── Allowed values ─────────────────────────────────────────────────────────────

export const ALLOWED_TEMPLATES = ["classic", "minimal", "artisan"];
export const ALLOWED_FONTS     = ["Inter", "Poppins", "Playfair Display", "Lora", "Roboto", "Montserrat"];
export const ALLOWED_BTN_STYLES = ["rounded", "square", "pill"];
export const ALLOWED_BTN_SIZES  = ["small", "medium", "large"];
export const ALLOWED_LAYOUTS    = ["narrow", "wide", "full"];

/** Accept only 3- or 6-digit hex colours, e.g. #fff or #1a2b3c */
const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// ── Helpers ────────────────────────────────────────────────────────────────────

function isHex(val) {
  return typeof val === "string" && HEX_RE.test(val.trim());
}

function isEnum(val, allowed) {
  return typeof val === "string" && allowed.includes(val);
}

function isUrl(val) {
  if (!val) return true; // optional
  try {
    const u = new URL(val);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ── validateTheme ─────────────────────────────────────────────────────────────

/**
 * Validate the theme sub-object.
 * Only fields that are present in the body are validated (partial PATCH support).
 */
export function validateTheme(theme) {
  const errors = {};

  if (theme === undefined || theme === null) return { valid: true, errors };
  if (typeof theme !== "object" || Array.isArray(theme)) {
    return { valid: false, errors: { theme: "Theme must be an object." } };
  }

  // template
  if (theme.template !== undefined && !isEnum(theme.template, ALLOWED_TEMPLATES)) {
    errors["theme.template"] = `Template must be one of: ${ALLOWED_TEMPLATES.join(", ")}.`;
  }

  // colors
  if (theme.colors !== undefined) {
    const c = theme.colors;
    for (const key of ["primary", "secondary", "accent", "text", "background"]) {
      if (c[key] !== undefined && !isHex(c[key])) {
        errors[`theme.colors.${key}`] = `Color "${key}" must be a valid hex color (e.g. #1a2b3c).`;
      }
    }
  }

  // typography
  if (theme.typography !== undefined) {
    const t = theme.typography;
    if (t.headingFont !== undefined && !isEnum(t.headingFont, ALLOWED_FONTS)) {
      errors["theme.typography.headingFont"] = `Heading font must be one of: ${ALLOWED_FONTS.join(", ")}.`;
    }
    if (t.bodyFont !== undefined && !isEnum(t.bodyFont, ALLOWED_FONTS)) {
      errors["theme.typography.bodyFont"] = `Body font must be one of: ${ALLOWED_FONTS.join(", ")}.`;
    }
  }

  // buttons
  if (theme.buttons !== undefined) {
    const b = theme.buttons;
    if (b.style !== undefined && !isEnum(b.style, ALLOWED_BTN_STYLES)) {
      errors["theme.buttons.style"] = `Button style must be one of: ${ALLOWED_BTN_STYLES.join(", ")}.`;
    }
    if (b.size !== undefined && !isEnum(b.size, ALLOWED_BTN_SIZES)) {
      errors["theme.buttons.size"] = `Button size must be one of: ${ALLOWED_BTN_SIZES.join(", ")}.`;
    }
  }

  // layout
  if (theme.layout !== undefined) {
    const l = theme.layout;
    if (l.containerWidth !== undefined && !isEnum(l.containerWidth, ALLOWED_LAYOUTS)) {
      errors["theme.layout.containerWidth"] = `Container width must be one of: ${ALLOWED_LAYOUTS.join(", ")}.`;
    }
    if (l.productColumns !== undefined) {
      const n = Number(l.productColumns);
      if (!Number.isInteger(n) || n < 2 || n > 6) {
        errors["theme.layout.productColumns"] = "Product columns must be an integer between 2 and 6.";
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateHomepage ───────────────────────────────────────────────────────────

export function validateHomepage(homepage) {
  const errors = {};

  if (homepage === undefined || homepage === null) return { valid: true, errors };
  if (typeof homepage !== "object" || Array.isArray(homepage)) {
    return { valid: false, errors: { homepage: "Homepage must be an object." } };
  }

  const { hero, about } = homepage;

  if (hero !== undefined) {
    if (hero.title !== undefined) {
      const t = String(hero.title).trim();
      if (t.length > 120) errors["homepage.hero.title"] = "Hero title must be 120 characters or fewer.";
    }
    if (hero.subtitle !== undefined) {
      const s = String(hero.subtitle).trim();
      if (s.length > 200) errors["homepage.hero.subtitle"] = "Hero subtitle must be 200 characters or fewer.";
    }
    if (hero.buttonText !== undefined) {
      const b = String(hero.buttonText).trim();
      if (b.length > 40) errors["homepage.hero.buttonText"] = "Button text must be 40 characters or fewer.";
    }
    if (hero.buttonUrl !== undefined && hero.buttonUrl !== "" && !isUrl(hero.buttonUrl)) {
      errors["homepage.hero.buttonUrl"] = "Button URL must be a valid URL.";
    }
  }

  if (about !== undefined) {
    if (about.heading !== undefined) {
      const h = String(about.heading).trim();
      if (h.length > 100) errors["homepage.about.heading"] = "About heading must be 100 characters or fewer.";
    }
    if (about.description !== undefined) {
      const d = String(about.description).trim();
      if (d.length > 600) errors["homepage.about.description"] = "About description must be 600 characters or fewer.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateSocialLinks ────────────────────────────────────────────────────────

export function validateSocialLinks(socialLinks) {
  const errors = {};

  if (socialLinks === undefined || socialLinks === null) return { valid: true, errors };
  if (typeof socialLinks !== "object" || Array.isArray(socialLinks)) {
    return { valid: false, errors: { socialLinks: "Social links must be an object." } };
  }

  const SOCIAL_URL_PREFIXES = {
    instagram: ["https://instagram.com/", "https://www.instagram.com/"],
    facebook:  ["https://facebook.com/",  "https://www.facebook.com/"],
    youtube:   ["https://youtube.com/",   "https://www.youtube.com/"],
    // whatsapp: accept either phone number or wa.me link
    whatsapp:  null,
  };

  for (const [key] of Object.entries(SOCIAL_URL_PREFIXES)) {
    const val = socialLinks[key];
    if (val === undefined || val === "") continue;

    // whatsapp: accept digits-only phone number or https://wa.me/... link
    if (key === "whatsapp") {
      const clean = String(val).trim();
      const isPhone = /^\+?[0-9]{7,15}$/.test(clean);
      const isWaMe  = /^https:\/\/wa\.me\/[0-9]+$/.test(clean);
      if (!isPhone && !isWaMe) {
        errors[`socialLinks.${key}`] =
          "WhatsApp must be a phone number (e.g. 9876543210) or a wa.me link.";
      }
      continue;
    }

    if (!isUrl(val)) {
      errors[`socialLinks.${key}`] = `${key} must be a valid URL.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateSeo ────────────────────────────────────────────────────────────────

export function validateSeo(seo) {
  const errors = {};

  if (seo === undefined || seo === null) return { valid: true, errors };
  if (typeof seo !== "object" || Array.isArray(seo)) {
    return { valid: false, errors: { seo: "SEO must be an object." } };
  }

  if (seo.title !== undefined) {
    const t = String(seo.title).trim();
    if (t.length > 70) errors["seo.title"] = "SEO title must be 70 characters or fewer.";
  }
  if (seo.description !== undefined) {
    const d = String(seo.description).trim();
    if (d.length > 170) errors["seo.description"] = "SEO description must be 170 characters or fewer.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateContactSettings ────────────────────────────────────────────────────

export function validateContactSettings(contactSettings) {
  const errors = {};

  if (contactSettings === undefined || contactSettings === null) return { valid: true, errors };
  if (typeof contactSettings !== "object" || Array.isArray(contactSettings)) {
    return { valid: false, errors: { contactSettings: "Contact settings must be an object." } };
  }

  for (const key of ["showEmail", "showPhone"]) {
    if (contactSettings[key] !== undefined && typeof contactSettings[key] !== "boolean") {
      errors[`contactSettings.${key}`] = `contactSettings.${key} must be a boolean.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ── validateFullStoreUpdate ────────────────────────────────────────────────────

/**
 * Combined validator for the full branding PATCH endpoint.
 * Each sub-validator is independent — all errors are merged.
 */
export function validateFullStoreUpdate(body) {
  const allErrors = {};

  const sub = [
    validateTheme(body.theme),
    validateHomepage(body.homepage),
    validateSocialLinks(body.socialLinks),
    validateSeo(body.seo),
    validateContactSettings(body.contactSettings),
  ];

  for (const { errors } of sub) {
    Object.assign(allErrors, errors);
  }

  return { valid: Object.keys(allErrors).length === 0, errors: allErrors };
}
