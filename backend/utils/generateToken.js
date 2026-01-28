import jwt from "jsonwebtoken";

const generateToken = (res, userId, userType) => {
  const payload = userType === "admin" ? { adminId: userId } : { userId };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  // Set JWT as HTTP Only cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development", // use https in production
    sameSite: "strict", // prevent CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Return token for frontend use
  return token;
};

export default generateToken;
