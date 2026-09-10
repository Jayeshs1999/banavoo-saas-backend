import path from "path";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import connectDB from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { generalLimiter } from "./middleware/rateLimit.middleware.js";

// ── Load env ────────────────────────────────────────────────────────────────
dotenv.config();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB ──────────────────────────────────────────────────────
connectDB();

const app = express();

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── Body parsers ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── General rate limiter ─────────────────────────────────────────────────────
app.use(generalLimiter);

// ── Static uploads ──────────────────────────────────────────────────────────
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// ── Health check ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "Banavoo API is running 🚀", env: process.env.NODE_ENV });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Routes ──────────────────────────────────────────────────────────────────
import authRoutes  from "./routes/authRoutes.js";
import storeRoutes from "./routes/store.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import { sellerProductRouter, publicStoreRouter } from "./routes/product.routes.js";

app.use("/api/auth",             authRoutes);
app.use("/api/stores",           storeRoutes);
app.use("/api/seller/categories", categoryRoutes);
app.use("/api/seller/products",   sellerProductRouter);
app.use("/api/public/stores",     publicStoreRouter);

// ── Error handling (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Banavoo server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
