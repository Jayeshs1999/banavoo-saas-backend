import path from "path";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

// ── Load env ────────────────────────────────────────────────────────────────
dotenv.config();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB ──────────────────────────────────────────────────────
connectDB();

const app = express();

// ── Body parsers ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── CORS ────────────────────────────────────────────────────────────────────
// TODO: Replace the allowed origins list with your own domains
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      // "https://your-production-domain.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Static uploads ──────────────────────────────────────────────────────────
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// ── Health check ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "API is running 🚀", env: process.env.NODE_ENV });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Routes ──────────────────────────────────────────────────────────────────
import authRoutes from "./routes/authRoutes.js";
app.use("/api/auth", authRoutes);

// TODO: Add more route modules here, for example:
//   import userRoutes from "./routes/userRoutes.js";
//   app.use("/api/users", userRoutes);

// ── Error handling (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
