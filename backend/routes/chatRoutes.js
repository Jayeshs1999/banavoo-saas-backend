import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import User from "../models/userModel.js";
import {
  getMessages,
  sendMessage,
  getUnreadCount,
  getConversations,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/unread-count",          tryBothAuth, getUnreadCount);
router.get("/conversations",         tryBothAuth, getConversations);
router.get("/:bookingId/messages",   tryBothAuth, getMessages);
router.post("/:bookingId/messages",  tryBothAuth, sendMessage);

export default router;

/* ─────────────────────────────────────────────────────────────────────────────
   tryBothAuth — verifies JWT without touching res.status().
   Sets req.user OR req.admin, then calls next().
   If neither succeeds → 401.
───────────────────────────────────────────────────────────────────────────── */
async function tryBothAuth(req, res, next) {
  const token =
    req.cookies?.jwt ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }

  try {
    if (decoded.adminId) {
      const admin = await Admin.findById(decoded.adminId).select("-password");
      if (!admin) return res.status(401).json({ message: "Admin not found" });
      req.admin = admin;
      return next();
    }

    if (decoded.userId) {
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) return res.status(401).json({ message: "User not found" });
      req.user = user;
      return next();
    }

    return res.status(401).json({ message: "Not authorized, unknown token type" });
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, lookup failed" });
  }
}
