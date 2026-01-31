import jwt from "jsonwebtoken";
import asyncHandler from "./asyncHandler.js";
import User from "../models/userModel.js";
import Admin from "../models/adminModel.js";

// Protect middleware for user authentication
const protectUser = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in cookies or Authorization header
  token =
    req.cookies.jwt || req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's a user token
      if (decoded.userId) {
        req.user = await User.findById(decoded.userId).select("-password");
        if (!req.user) {
          res.status(401);
          throw new Error("User not found");
        }
      } else {
        res.status(401);
        throw new Error("Invalid token");
      }

      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

// Protect middleware for admin authentication
const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in cookies or Authorization header
  token =
    req.cookies.jwt || req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's an admin token
      if (decoded.adminId) {
        req.admin = await Admin.findById(decoded.adminId).select("-password");
        if (!req.admin) {
          res.status(401);
          throw new Error("Admin not found");
        }
      } else {
        res.status(401);
        throw new Error("Invalid token");
      }

      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

// Middleware to check if user is admin
const admin = (req, res, next) => {
  if (req.admin && req.admin.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as admin");
  }
};

// Middleware to check if user is super admin
const superAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === "super_admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as super admin");
  }
};

export { protectUser, protectAdmin, admin, superAdmin };
