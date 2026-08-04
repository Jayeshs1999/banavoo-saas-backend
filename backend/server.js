import path from "path";
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import pgRoutes from "./routes/pgRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./swagger.js";

import cookieParser from "cookie-parser";

dotenv.config();
const port = process.env.PORT || 5000;

connectDB(); //connect to mongoDB

const app = express();

//body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cookie parser middleware
app.use(cookieParser());

// CORS middleware
import cors from "cors";
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://192.168.0.147:3000",
      "https://dormitory-alpha.vercel.app",
      "https://www.sthals.in",
      "https://www.bedwale.in"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// API Routes
app.use("/api/admins", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pgs", pgRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/reviews", reviewRoutes);

// Swagger UI setup
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 20px }
  `,
    customSiteTitle: "Dormitory Management API Documentation",
    customfavIcon: "/favicon.ico",
  }),
);

// Swagger JSON endpoint
app.get("/api-docs-json", (req, res) => {
  res.json(swaggerSpecs);
});

// Serve uploaded images
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.get("/", (req, res) => {
  res.send("Dormitory Management API is running 🚀");
});

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
