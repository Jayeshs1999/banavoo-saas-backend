import express from "express";
import {
  getDashboardStats,
  getAdminsList,
  getPGsList,
  getLocationStats,
} from "../controllers/superAdminController.js";
import { superAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected and require super admin role
router.use(superAdmin);

// Dashboard statistics
router.get("/dashboard", getDashboardStats);

// Admins list
router.get("/admins", getAdminsList);

// PGs list with statistics
router.get("/pgs", getPGsList);

// Location-based statistics
router.get("/location-stats", getLocationStats);

export default router;
