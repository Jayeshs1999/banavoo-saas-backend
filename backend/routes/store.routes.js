import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createStore,
  getMyStore,
  getStoreBySlug,
  updateMyStore,
  checkSlug,
} from "../controllers/store.controller.js";

const router = express.Router();

// ── IMPORTANT: /me and /check-slug/:slug MUST come before /:slug ──────────────
// Otherwise Express matches "me" and "check-slug" as the :slug parameter.

router.post(   "/",                   protect, createStore);
router.get(    "/me",                 protect, getMyStore);
router.get(    "/check-slug/:slug",   protect, checkSlug);
router.get(    "/:slug",                       getStoreBySlug);
router.patch(  "/me",                 protect, updateMyStore);

export default router;
