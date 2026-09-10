import jwt from "jsonwebtoken";
import asyncHandler from "./asyncHandler.js";
import User from "../models/userModel.js";

/**
 * protect — verifies the JWT from the Authorization header or cookie.
 * Attaches the decoded user to req.user.
 *
 * Usage:
 *   router.get("/me", protect, getProfile);
 */
const protect = asyncHandler(async (req, res, next) => {
  let token =
    req.cookies?.jwt || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401);
    throw new Error("Not authorized — no token");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.userId).select("-password");

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized — user not found");
  }

  next();
});

/**
 * requireRole — restricts access to users with a specific role.
 *
 * Usage:
 *   router.delete("/resource", protect, requireRole("admin"), deleteHandler);
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    res.status(403);
    throw new Error(`Role '${req.user?.role}' is not allowed to access this resource`);
  }
  next();
};

export { protect, requireRole };
