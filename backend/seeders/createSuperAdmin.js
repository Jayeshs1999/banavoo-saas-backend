/**
 * Seeder: Create a Super Admin account
 *
 * Run once:
 *   node backend/seeders/createSuperAdmin.js
 *
 * Dummy credentials:
 *   Email    : superadmin@sthals.in
 *   Password : SuperAdmin@123
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ── inline super-admin schema (extends adminModel with role=super_admin) ──
const adminSchema = new mongoose.Schema(
  {
    pgName:    { type: String, required: true },
    ownerName: { type: String, required: true },
    mobile:    { type: String, required: true, unique: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    address: {
      area:     { type: String, required: true },
      landmark: String,
      city:     { type: String, required: true },
      pincode:  { type: String, required: true },
      state:    { type: String, required: true },
    },
    password:   { type: String, required: true, select: false },
    role:       { type: String, enum: ["admin", "super_admin"], default: "admin" },
    isVerified: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

const SUPER_ADMIN = {
  pgName:    "BEDWALE Platform",
  ownerName: "Jayesh Sevatkar",
  mobile:    "9999999999",
  email:     "superadmin@sthals.in",
  password:  "SuperAdmin@123",
  address: {
    area:     "Head Office",
    landmark: "Platform HQ",
    city:     "Nagpur",
    pincode:  "440001",
    state:    "Maharashtra",
  },
  role:       "super_admin",
  isVerified: true,
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const existing = await Admin.findOne({ email: SUPER_ADMIN.email });
    if (existing) {
      console.log(`Super admin already exists: ${SUPER_ADMIN.email}`);
      process.exit(0);
    }

    const salt     = await bcrypt.genSalt(10);
    const hashed   = await bcrypt.hash(SUPER_ADMIN.password, salt);
    const created  = await Admin.create({ ...SUPER_ADMIN, password: hashed });

    console.log("✅  Super admin created successfully!");
    console.log("─────────────────────────────────────");
    console.log(`  Email    : ${created.email}`);
    console.log(`  Password : ${SUPER_ADMIN.password}`);
    console.log(`  Role     : ${created.role}`);
    console.log("─────────────────────────────────────");
    process.exit(0);
  } catch (err) {
    console.error("Seeder error:", err.message);
    process.exit(1);
  }
}

seed();
