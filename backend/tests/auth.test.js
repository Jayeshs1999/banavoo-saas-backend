/**
 * auth.test.js — Integration tests for auth endpoints.
 *
 * Run with:  node --experimental-vm-modules backend/tests/auth.test.js
 *
 * These are self-contained functional tests using Node's built-in fetch.
 * They require the server to be running at BASE_URL and a clean test DB.
 *
 * For a real test suite, use Jest + supertest.  This file demonstrates
 * the expected behaviour so CI can validate each scenario.
 */

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000";

let createdEmail = "";
let createdPassword = "Banavoo123";
let resetToken = "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const post = async (path, body, cookieHeader = "") => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json, headers: res.headers };
};

const get = async (path, cookieHeader = "") => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
    credentials: "include",
  });
  const json = await res.json();
  return { status: res.status, body: json };
};

let passed = 0;
let failed = 0;

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

// ─── Test suites ──────────────────────────────────────────────────────────────

console.log("\n📋 Auth Test Suite\n");

// ── Registration ──────────────────────────────────────────────────────────────
console.log("▶ Registration");

await test("Valid registration returns 201 + requiresEmailVerification", async () => {
  createdEmail = `test_${Date.now()}@example.com`;
  const { status, body } = await post("/api/auth/register", {
    fullName: "Priya Sharma",
    email: createdEmail,
    password: createdPassword,
    confirmPassword: createdPassword,
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(body.success === true, "success should be true");
  assert(body.data.requiresEmailVerification === true, "should require email verification");
});

await test("Duplicate email returns 409", async () => {
  const { status, body } = await post("/api/auth/register", {
    fullName: "Priya Sharma",
    email: createdEmail,
    password: createdPassword,
    confirmPassword: createdPassword,
  });
  assert(status === 409, `Expected 409, got ${status}`);
  assert(body.code === "EMAIL_EXISTS", `Expected EMAIL_EXISTS, got ${body.code}`);
});

await test("Invalid email returns 400 VALIDATION_ERROR", async () => {
  const { status, body } = await post("/api/auth/register", {
    fullName: "Test User",
    email: "not-an-email",
    password: createdPassword,
    confirmPassword: createdPassword,
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "VALIDATION_ERROR", `Expected VALIDATION_ERROR, got ${body.code}`);
  assert(body.errors?.email, "Should have email validation error");
});

await test("Weak password (no uppercase) returns 400", async () => {
  const { status, body } = await post("/api/auth/register", {
    fullName: "Test User",
    email: `weak_${Date.now()}@example.com`,
    password: "banavoo123",
    confirmPassword: "banavoo123",
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.errors?.password, "Should have password error");
});

await test("Weak password (no number) returns 400", async () => {
  const { status, body } = await post("/api/auth/register", {
    fullName: "Test User",
    email: `weak_${Date.now()}@example.com`,
    password: "Banavoo",
    confirmPassword: "Banavoo",
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.errors?.password, "Should have password error");
});

await test("Password mismatch returns 400", async () => {
  const { status, body } = await post("/api/auth/register", {
    fullName: "Test User",
    email: `mismatch_${Date.now()}@example.com`,
    password: "Banavoo123",
    confirmPassword: "Banavoo456",
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.errors?.confirmPassword, "Should have confirmPassword error");
});

await test("Missing fullName returns 400", async () => {
  const { status, body } = await post("/api/auth/register", {
    email: `missing_${Date.now()}@example.com`,
    password: "Banavoo123",
    confirmPassword: "Banavoo123",
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.errors?.fullName, "Should have fullName error");
});

// ── Login (before verification) ───────────────────────────────────────────────
console.log("\n▶ Login — unverified");

await test("Login with unverified email returns 403 EMAIL_NOT_VERIFIED", async () => {
  const { status, body } = await post("/api/auth/login", {
    email: createdEmail,
    password: createdPassword,
  });
  assert(status === 403, `Expected 403, got ${status}`);
  assert(body.code === "EMAIL_NOT_VERIFIED", `Expected EMAIL_NOT_VERIFIED, got ${body.code}`);
});

// ── OTP / verification ────────────────────────────────────────────────────────
console.log("\n▶ OTP Verification");

await test("Wrong OTP returns 400 INVALID_OTP", async () => {
  const { status, body } = await post("/api/auth/verify-email", {
    email: createdEmail,
    otp: "000000",
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "INVALID_OTP", `Expected INVALID_OTP, got ${body.code}`);
});

await test("Invalid OTP format returns 400 VALIDATION_ERROR", async () => {
  const { status, body } = await post("/api/auth/verify-email", {
    email: createdEmail,
    otp: "abc",
  });
  assert(status === 400, `Expected 400, got ${status}`);
  assert(body.code === "VALIDATION_ERROR", `Expected VALIDATION_ERROR, got ${body.code}`);
});

await test("Resend OTP cooldown enforced after immediate resend", async () => {
  // First resend should succeed
  const r1 = await post("/api/auth/resend-otp", { email: createdEmail });
  assert(r1.status === 200, `Expected 200, got ${r1.status}`);
  // Immediate second resend should hit cooldown
  const r2 = await post("/api/auth/resend-otp", { email: createdEmail });
  assert(r2.status === 429, `Expected 429 on immediate resend, got ${r2.status}`);
  assert(r2.body.code === "RESEND_COOLDOWN", `Expected RESEND_COOLDOWN, got ${r2.body.code}`);
});

// ── Login (wrong credentials) ─────────────────────────────────────────────────
console.log("\n▶ Login — credentials");

await test("Wrong password returns 401 INVALID_CREDENTIALS", async () => {
  const { status, body } = await post("/api/auth/login", {
    email: createdEmail,
    password: "WrongPassword1",
  });
  assert(status === 401, `Expected 401, got ${status}`);
  assert(body.code === "INVALID_CREDENTIALS", `Expected INVALID_CREDENTIALS, got ${body.code}`);
});

await test("Unknown email returns 401 INVALID_CREDENTIALS", async () => {
  const { status, body } = await post("/api/auth/login", {
    email: "nobody@example.com",
    password: "Banavoo123",
  });
  assert(status === 401, `Expected 401, got ${status}`);
  assert(body.code === "INVALID_CREDENTIALS", `Expected INVALID_CREDENTIALS, got ${body.code}`);
});

// ── Forgot password ────────────────────────────────────────────────────────────
console.log("\n▶ Forgot Password");

await test("Forgot password with non-existent email still returns 200", async () => {
  const { status, body } = await post("/api/auth/forgot-password", {
    email: "nobody@example.com",
  });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.success === true, "success should be true");
});

await test("Forgot password with valid email returns 200", async () => {
  const { status, body } = await post("/api/auth/forgot-password", {
    email: createdEmail,
  });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.success === true, "success should be true");
});

// ── Authentication middleware ──────────────────────────────────────────────────
console.log("\n▶ Authentication Middleware");

await test("GET /api/auth/me without token returns 401", async () => {
  const { status, body } = await get("/api/auth/me");
  assert(status === 401, `Expected 401, got ${status}`);
  assert(body.code === "UNAUTHENTICATED", `Expected UNAUTHENTICATED, got ${body.code}`);
});

await test("GET /api/auth/me with invalid JWT returns 401", async () => {
  const { status, body } = await get("/api/auth/me", "jwt=invalid.token.here");
  assert(status === 401, `Expected 401, got ${status}`);
  assert(body.code === "INVALID_TOKEN", `Expected INVALID_TOKEN, got ${body.code}`);
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
if (failed > 0) process.exit(1);
