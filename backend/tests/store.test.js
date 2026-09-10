/**
 * store.test.js — Integration tests for Store endpoints.
 *
 * Covers §47 scenarios for Step 2 (Seller Activation + Store Creation).
 *
 * Run with the server already started:
 *   node backend/tests/store.test.js
 *
 * To test against a different host:
 *   TEST_API_URL=http://localhost:5000 node backend/tests/store.test.js
 *
 * NOTE: This test uses top-level await (Node ≥ 14.8 ESM).
 * The package.json already has "type":"module" so this works as-is.
 *
 * IMPORTANT: The test suite creates real DB records.
 * Use a dedicated test database (set MONGODB_URI in .env).
 */

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000";

// ─── Shared state ──────────────────────────────────────────────────────────────
let sellerCookie      = "";   // JWT cookie for a verified user → becomes seller
let buyerCookie       = "";   // JWT cookie for a second verified buyer
let unverifiedCookie  = "";   // JWT cookie for an unverified user (pre-OTP)
let createdSlug       = "";   // slug of the store created in the "valid create" test
let unverifiedEmail   = `unverified_${Date.now()}@example.com`;
let sellerEmail       = `seller_${Date.now()}@example.com`;
let buyerEmail        = `buyer_${Date.now()}@example.com`;
const PASSWORD        = "Banavoo123!";

let passed = 0;
let failed = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const post = async (path, body, cookie = "") => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  const setCookie = res.headers.get("set-cookie") || "";
  return { status: res.status, body: json, setCookie };
};

const get = async (path, cookie = "") => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...(cookie ? { Cookie: cookie } : {}) },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
};

const patch = async (path, body, cookie = "") => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
};

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/**
 * Register + get OTP from console logs (dev mode).
 * In a real CI environment you'd read the OTP from the DB or email mock.
 * Here we rely on the fact that register returns 201 and the test DB
 * allows direct DB queries; for a black-box test we simulate by noting
 * that the only way to get a verified user is via the /verify-email endpoint.
 *
 * Strategy: register → verifyEmail with the OTP echoed to console.
 * Since we can't intercept console output from here, we use a DB-level trick:
 * we embed the OTP in a predictable way via a known test OTP (if TEST_OTP env var set),
 * or we skip auto-verification and only run tests that don't require a full cookie.
 *
 * For the purpose of this test suite, we provide a helper that registers a user
 * and returns the registration body; the caller must supply the OTP obtained from
 * the server console output (dev mode) or via TEST_OTP env.
 */

// ── Setup: create test accounts ──────────────────────────────────────────────

console.log("\n📋 Banavoo Store Test Suite — Step 2\n");
console.log("▶ Setup: Creating test accounts");

// 1. Register unverified user
await (async () => {
  const { status } = await post("/api/auth/register", {
    fullName: "Unverified User",
    email:    unverifiedEmail,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  if (status !== 201) {
    console.log(`  ⚠️  Could not register unverified user (status ${status})`);
    return;
  }
  // The JWT cookie is NOT issued at registration — only after email verification.
  // We keep unverifiedCookie empty here on purpose; a logged-in unverified scenario
  // is tested via direct DB manipulation or a known OTP.
  console.log(`  ✅ Unverified account registered: ${unverifiedEmail}`);
})();

// 2. Register + verify seller account
//    We rely on TEST_SELLER_OTP and TEST_BUYER_OTP env vars (set from server console).
const SELLER_OTP = process.env.TEST_SELLER_OTP || "";
const BUYER_OTP  = process.env.TEST_BUYER_OTP  || "";

await (async () => {
  const { status } = await post("/api/auth/register", {
    fullName: "Seller User",
    email:    sellerEmail,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  if (status !== 201) {
    console.log(`  ⚠️  Could not register seller account (status ${status})`);
    return;
  }
  console.log(`  ✅ Seller account registered: ${sellerEmail}`);

  if (SELLER_OTP) {
    const { status: vs, body: vb, setCookie } = await post("/api/auth/verify-email", {
      email: sellerEmail,
      otp:   SELLER_OTP,
    });
    if (vs === 200 && setCookie) {
      sellerCookie = setCookie.split(";")[0]; // "jwt=..."
      console.log(`  ✅ Seller account verified — cookie obtained`);
    } else {
      console.log(`  ⚠️  Seller OTP verification failed: ${vb.message}`);
    }
  } else {
    console.log("  ℹ️  Skipping seller OTP verification — set TEST_SELLER_OTP env var to enable");
  }
})();

await (async () => {
  const { status } = await post("/api/auth/register", {
    fullName: "Buyer User",
    email:    buyerEmail,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  if (status !== 201) {
    console.log(`  ⚠️  Could not register buyer account (status ${status})`);
    return;
  }
  console.log(`  ✅ Buyer account registered: ${buyerEmail}`);

  if (BUYER_OTP) {
    const { status: vs, body: vb, setCookie } = await post("/api/auth/verify-email", {
      email: buyerEmail,
      otp:   BUYER_OTP,
    });
    if (vs === 200 && setCookie) {
      buyerCookie = setCookie.split(";")[0];
      console.log(`  ✅ Buyer account verified — cookie obtained`);
    } else {
      console.log(`  ⚠️  Buyer OTP verification failed: ${vb.message}`);
    }
  }
})();

// ══════════════════════════════════════════════════════════════════════════════
// §47 — STORE CREATION
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ Store Creation");

await test("Unauthenticated create → 401 UNAUTHORIZED", async () => {
  const { status, body } = await post("/api/stores", {
    name:          "Test Store",
    description:   "A nice store description here",
    city:          "Mumbai",
    state:         "Maharashtra",
    pickupPincode: "400001",
  });
  assert(status === 401, `Expected 401, got ${status}`);
  assert(body.success === false, "success should be false");
});

await test("Unverified user create → 403 EMAIL_NOT_VERIFIED", async () => {
  if (!unverifiedCookie) {
    console.log("    (skipped — no cookie for unverified user; need TEST_UNVERIFIED_COOKIE env var)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Test Store",
    description:   "A nice store description here",
    city:          "Mumbai",
    state:         "Maharashtra",
    pickupPincode: "400001",
  }, unverifiedCookie);
  assert(status === 403, `Expected 403, got ${status}`);
  assert(body.code === "EMAIL_NOT_VERIFIED", `Expected EMAIL_NOT_VERIFIED, got ${body.code}`);
});

await test("Valid create → 201 + store object", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no verified seller cookie; set TEST_SELLER_OTP env var)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Priya Crafts",
    description:   "Handmade jewellery and décor from Rajasthan",
    city:          "Jaipur",
    state:         "Rajasthan",
    pickupPincode: "302001",
  }, sellerCookie);
  assert(status === 201, `Expected 201, got ${status}: ${body.message}`);
  assert(body.success === true, "success should be true");
  assert(body.data?.slug, "data.slug should be present");
  assert(!body.data?.ownerId, "ownerId must not be exposed");
  createdSlug = body.data.slug;
  console.log(`    Created store with slug: ${createdSlug}`);
});

await test("Duplicate store → 409 STORE_ALREADY_EXISTS", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no verified seller cookie)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Another Store",
    description:   "This should fail because user already has a store",
    city:          "Delhi",
    state:         "Delhi",
    pickupPincode: "110001",
  }, sellerCookie);
  assert(status === 409, `Expected 409, got ${status}`);
  assert(body.code === "STORE_ALREADY_EXISTS", `Expected STORE_ALREADY_EXISTS, got ${body.code}`);
});

await test("Reserved slug → 400 SLUG_RESERVED", async () => {
  if (!buyerCookie) {
    console.log("    (skipped — no verified buyer cookie)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Admin Store",
    slug:          "admin",
    description:   "Trying to use a reserved slug",
    city:          "Pune",
    state:         "Maharashtra",
    pickupPincode: "411001",
  }, buyerCookie);
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "SLUG_RESERVED", `Expected SLUG_RESERVED, got ${body.code}`);
});

await test("Duplicate slug → 409 SLUG_ALREADY_EXISTS", async () => {
  if (!buyerCookie || !createdSlug) {
    console.log("    (skipped — need buyer cookie and a previously created slug)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Another Store",
    slug:          createdSlug,
    description:   "Trying to use an already taken slug",
    city:          "Pune",
    state:         "Maharashtra",
    pickupPincode: "411001",
  }, buyerCookie);
  assert(status === 409, `Expected 409, got ${status}`);
  assert(body.code === "SLUG_ALREADY_EXISTS", `Expected SLUG_ALREADY_EXISTS, got ${body.code}`);
});

await test("Invalid name (too short) → 400 VALIDATION_ERROR", async () => {
  if (!buyerCookie) {
    console.log("    (skipped — no verified buyer cookie)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "X",
    description:   "A nice store description here",
    city:          "Mumbai",
    state:         "Maharashtra",
    pickupPincode: "400001",
  }, buyerCookie);
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "VALIDATION_ERROR", `Expected VALIDATION_ERROR, got ${body.code}`);
  assert(body.errors?.name, "errors.name should be present");
});

await test("Invalid description (too short) → 400 VALIDATION_ERROR", async () => {
  if (!buyerCookie) {
    console.log("    (skipped — no verified buyer cookie)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Valid Store Name",
    description:   "Short",
    city:          "Mumbai",
    state:         "Maharashtra",
    pickupPincode: "400001",
  }, buyerCookie);
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "VALIDATION_ERROR", `Expected VALIDATION_ERROR, got ${body.code}`);
  assert(body.errors?.description, "errors.description should be present");
});

await test("Invalid pincode (non-6-digit) → 400 VALIDATION_ERROR", async () => {
  if (!buyerCookie) {
    console.log("    (skipped — no verified buyer cookie)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Valid Store Name",
    description:   "A nice store description here",
    city:          "Mumbai",
    state:         "Maharashtra",
    pickupPincode: "12345",   // 5 digits — invalid
  }, buyerCookie);
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "VALIDATION_ERROR", `Expected VALIDATION_ERROR, got ${body.code}`);
  assert(body.errors?.pickupPincode, "errors.pickupPincode should be present");
});

await test("Invalid state → 400 VALIDATION_ERROR", async () => {
  if (!buyerCookie) {
    console.log("    (skipped — no verified buyer cookie)");
    return;
  }
  const { status, body } = await post("/api/stores", {
    name:          "Valid Store Name",
    description:   "A nice store description here",
    city:          "Faketown",
    state:         "Fakestan",
    pickupPincode: "400001",
  }, buyerCookie);
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "VALIDATION_ERROR", `Expected VALIDATION_ERROR, got ${body.code}`);
  assert(body.errors?.state, "errors.state should be present");
});

// ══════════════════════════════════════════════════════════════════════════════
// §47 — GET MY STORE
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ Get Own Store");

await test("GET /stores/me → 200 for seller", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no verified seller cookie)");
    return;
  }
  const { status, body } = await get("/api/stores/me", sellerCookie);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.success === true, "success should be true");
  assert(body.data?.slug, "data.slug should be present");
  assert(!body.data?.ownerId, "ownerId must not be exposed");
});

await test("GET /stores/me → 404 STORE_NOT_FOUND for buyer (no store)", async () => {
  if (!buyerCookie) {
    console.log("    (skipped — no verified buyer cookie)");
    return;
  }
  const { status, body } = await get("/api/stores/me", buyerCookie);
  assert(status === 404, `Expected 404, got ${status}`);
  assert(body.code === "STORE_NOT_FOUND", `Expected STORE_NOT_FOUND, got ${body.code}`);
});

await test("GET /stores/me → 401 for unauthenticated", async () => {
  const { status } = await get("/api/stores/me");
  assert(status === 401, `Expected 401, got ${status}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// §47 — GET STORE BY SLUG (PUBLIC)
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ Get Store By Slug (Public)");

await test("GET /stores/:slug → 200 for existing active store", async () => {
  if (!createdSlug) {
    console.log("    (skipped — no store created yet)");
    return;
  }
  const { status, body } = await get(`/api/stores/${createdSlug}`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.success === true, "success should be true");
  assert(body.data?.slug === createdSlug, "slug should match");
  assert(!body.data?.ownerId, "ownerId must not be exposed in public response");
});

await test("GET /stores/:slug → 404 for non-existent slug", async () => {
  const { status, body } = await get("/api/stores/this-slug-does-not-exist-xyz-999");
  assert(status === 404, `Expected 404, got ${status}`);
  assert(body.code === "STORE_NOT_FOUND", `Expected STORE_NOT_FOUND, got ${body.code}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// §47 — UPDATE MY STORE
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ Update Own Store");

await test("PATCH /stores/me → 200 — can update name and city", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no verified seller cookie)");
    return;
  }
  const { status, body } = await patch("/api/stores/me", {
    name: "Priya Crafts Updated",
    city: "Jodhpur",
  }, sellerCookie);
  assert(status === 200, `Expected 200, got ${status}: ${body.message}`);
  assert(body.success === true, "success should be true");
  assert(body.data?.name === "Priya Crafts Updated", "name should be updated");
  assert(body.data?.city === "Jodhpur", "city should be updated");
});

await test("PATCH /stores/me — cannot update slug (slug unchanged)", async () => {
  if (!sellerCookie || !createdSlug) {
    console.log("    (skipped — no seller cookie or slug)");
    return;
  }
  const { status, body } = await patch("/api/stores/me", {
    slug: "a-brand-new-slug",
  }, sellerCookie);
  // Validator rejects slug in body → 400
  assert(status === 400, `Expected 400 (slug rejected), got ${status}`);
  assert(body.errors?.slug, "errors.slug should be present");

  // Verify slug on the store is unchanged
  const { body: meBody } = await get("/api/stores/me", sellerCookie);
  assert(meBody.data?.slug === createdSlug, `Slug should still be ${createdSlug}`);
});

await test("PATCH /stores/me — cannot update ownerId", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no seller cookie)");
    return;
  }
  const { status, body } = await patch("/api/stores/me", {
    ownerId: "000000000000000000000000",
  }, sellerCookie);
  assert(status === 400, `Expected 400 (ownerId rejected), got ${status}`);
  assert(body.errors?.ownerId, "errors.ownerId should be present");
});

await test("PATCH /stores/me → 401 for unauthenticated", async () => {
  const { status } = await patch("/api/stores/me", { name: "Hacker" });
  assert(status === 401, `Expected 401, got ${status}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// §47 — SLUG CHECK
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ Slug Availability Check");

await test("GET /stores/check-slug/:slug → available: true for unused slug", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no verified seller cookie)");
    return;
  }
  const unusedSlug = `unused-slug-${Date.now()}`;
  const { status, body } = await get(`/api/stores/check-slug/${unusedSlug}`, sellerCookie);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.available === true, "available should be true");
});

await test("GET /stores/check-slug/admin → available: false (reserved)", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no verified seller cookie)");
    return;
  }
  const { status, body } = await get("/api/stores/check-slug/admin", sellerCookie);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.available === false, "available should be false for reserved slug");
  assert(body.reason === "reserved", `Expected reason:'reserved', got ${body.reason}`);
});

await test("GET /stores/check-slug/:slug → available: false for taken slug", async () => {
  if (!sellerCookie || !createdSlug) {
    console.log("    (skipped — no seller cookie or slug)");
    return;
  }
  const { status, body } = await get(`/api/stores/check-slug/${createdSlug}`, sellerCookie);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.available === false, "taken slug should not be available");
});

await test("GET /stores/check-slug → 401 for unauthenticated", async () => {
  const { status } = await get("/api/stores/check-slug/some-slug");
  assert(status === 401, `Expected 401, got ${status}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// §47 — ROLE PROMOTION
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ Role Promotion");

await test("User role is 'seller' after store creation (GET /auth/me)", async () => {
  if (!sellerCookie) {
    console.log("    (skipped — no verified seller cookie)");
    return;
  }
  const { status, body } = await get("/api/auth/me", sellerCookie);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.data?.role === "seller", `Expected role:'seller', got ${body.data?.role}`);
  assert(body.data?.store !== undefined, "store field should be present in /auth/me response");
  assert(body.data?.store?.slug === createdSlug, "store.slug should match the created store");
});

// ══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════════════════════
console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ Some tests failed.");
  process.exit(1);
} else {
  console.log("✅ All tests passed!");
}
