import jwt from "jsonwebtoken";

/**
 * generateToken — signs a JWT and optionally sets it as an HTTP-only cookie.
 *
 * @param {import("express").Response} res  - Express response object
 * @param {string} userId  - The user's _id from MongoDB
 * @returns {string} The signed JWT
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });

  // Set HTTP-only cookie (optional — remove if using Authorization header only)
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  });

  return token;
};

export default generateToken;
