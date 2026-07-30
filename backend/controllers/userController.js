import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { sendUserWelcomeEmail, sendPasswordResetOtpEmail, sendEmailVerificationOtp } from "../utils/emailService.js";
import { setPreRegOtp, verifyPreRegOtp as checkPreRegOtp, generateOtp } from "../utils/otpStore.js";

/**
 * @desc    Auth user & get token
 * @route   POST /api/users/auth
 * @access  Public
 */
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (user && (await user.matchPassword(password))) {
    const token = generateToken(res, user._id, "user");

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      address: user.address,
      role: user.role,
      token: token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

/**
 * @desc    Register user
 * @route   POST /api/users/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, mobile, password, address } = req.body;

  const userExists = await User.findOne({
    $or: [{ email }, { mobile }],
  });

  if (userExists) {
    res.status(400);
    throw new Error("User with this email or mobile already exists");
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    mobile,
    password,
    address,
  });

  if (user) {
    const token = generateToken(res, user._id, "user");

    // Fire-and-forget — user-specific welcome email
    sendUserWelcomeEmail(user.email, user.firstName, user.lastName).catch((err) =>
      console.error("User welcome email failed:", err.message),
    );

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      address: user.address,
      role: user.role,
      token: token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      address: user.address,
      role: user.role,
      isVerified: user.isVerified,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    user.mobile = req.body.mobile || user.mobile;
    user.address = req.body.address || user.address;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      address: updatedUser.address,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/users/logout
 * @access  Public
 */
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged out successfully" });
});

// @desc    Forgot password — send OTP to registered email
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("No account found with this email address");
  }

  const otp = user.generatePasswordResetToken();
  await user.save();

  await sendPasswordResetOtpEmail(email, user.firstName, otp);

  res.json({ message: "Password reset code sent to your email" });
});

// @desc    Reset password using OTP
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({
    email,
    passwordResetToken: otp,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset code. Please request a new one.");
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ message: "Password reset successful" });
});

// @desc    Send email OTP for verification
// @route   POST /api/users/send-email-otp
// @access  Public
const sendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found with this email");
  }

  const otp = user.generateVerificationToken();
  await user.save();

  await sendEmailVerificationOtp(email, user.firstName, otp);

  res.json({ message: "OTP sent successfully" });
});

// @desc    Verify email OTP
// @route   POST /api/users/verify-email-otp
// @access  Public
const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (user && user.verificationToken === otp) {
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } else {
    res.status(400);
    throw new Error("Invalid OTP");
  }
});

// @desc    Send pre-registration email OTP (no account required)
// @route   POST /api/users/send-prereg-otp
// @access  Public
const sendPreRegOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400); throw new Error("Email is required"); }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) { res.status(400); throw new Error("An account with this email already exists"); }

  const otp = generateOtp();
  setPreRegOtp(email, otp);
  await sendEmailVerificationOtp(email, "there", otp);
  res.json({ message: "OTP sent to your email" });
});

// @desc    Verify pre-registration email OTP
// @route   POST /api/users/verify-prereg-otp
// @access  Public
const verifyPreRegOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) { res.status(400); throw new Error("Email and OTP are required"); }

  const valid = checkPreRegOtp(email, otp);
  if (!valid) { res.status(400); throw new Error("Invalid or expired OTP"); }

  res.json({ message: "Email verified", verified: true });
});

export {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp,
  sendPreRegOtp,
  verifyPreRegOtp,
};
