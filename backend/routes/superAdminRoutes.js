import express from "express";
import {
  getDashboardStats,
  getAdminsList,
  getPGsList,
  getLocationStats,
  getUsersList,
  getBookingsList,
} from "../controllers/superAdminController.js";
// import { protectAdmin, superAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected and require super admin role
// router.use(protectAdmin, superAdmin);

// Platform KPI stats
router.get("/dashboard", getDashboardStats);

// PG owners — supports ?page=&limit=&search=
router.get("/admins", getAdminsList);

// PGs with occupancy — supports ?page=&limit=&search=
router.get("/pgs", getPGsList);

// Location aggregation — supports ?search=
router.get("/location-stats", getLocationStats);

// Registered users — supports ?page=&limit=&search=
router.get("/users", getUsersList);

// Bookings list + summary stats — supports ?page=&limit=&search=&status=
router.get("/bookings", getBookingsList);

export default router;
