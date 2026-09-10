import jwt from "jsonwebtoken";
import asyncHandler from "./asyncHandler.js";
import User from "../models/userModel.js";

/**
 * protect — verifies the JWT from the HTTP-only cookie or Authorization header.
 * Attaches the full User document (minus passwordHash) to req.user.
 *
 * Usage:
 *   router.get("/me", protect, getMe);
 */
const protect = asyncHandler(async (req, res, next) => {
  let token =
    req.cookies?.jwt || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHENTICATED",
      message: "Not authorized — no token.",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Not authorized — invalid or expired token.",
    });
  }

  const user = await User.findById(decoded.userId).select("-passwordHash");
  if (!user) {
    return res.status(401).json({
      success: false,
      code: "USER_NOT_FOUND",
      message: "Not authorized — user not found.",
    });
  }

  if (user.status === "suspended") {
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_SUSPENDED",
      message: "Your account has been suspended.",
    });
  }

  req.user = user;
  next();
});

/**
 * requireRole — restricts access to users with a specific role.
 * Must be used AFTER protect.
 *
 * Usage:
 *   router.delete("/resource", protect, requireRole("admin"), deleteHandler);
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN",
      message: `Role '${req.user?.role}' is not allowed to access this resource.`,
    });
  }
  next();
};

export { protect, requireRole };
