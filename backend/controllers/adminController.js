import asyncHandler from "../middleware/asyncHandler.js";
import Admin from "../models/adminModel.js";
import generateToken from "../utils/generateToken.js";
import { sendWelcomeEmail, sendEmailVerificationOtp, sendPasswordResetOtpEmail } from "../utils/emailService.js";
import { setPreRegOtp, verifyPreRegOtp as checkPreRegOtp, generateOtp } from "../utils/otpStore.js";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

// Initialize Twilio client only if credentials are available
const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// @desc    Auth admin & get token
// @route   POST /api/admins/auth
// @access  Public
const authAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email }).select("+password");

  if (admin && (await admin.matchPassword(password))) {
    const token = generateToken(res, admin._id, "admin");

    res.json({
      _id: admin._id,
      pgName: admin.pgName,
      ownerName: admin.ownerName,
      email: admin.email,
      mobile: admin.mobile,
      address: admin.address,
      role: admin.role,
      token: token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Register admin
// @route   POST /api/admins/register
// @access  Public
const registerAdmin = asyncHandler(async (req, res) => {
  const { pgName, ownerName, email, mobile, password, address } = req.body;

  const adminExists = await Admin.findOne({
    $or: [{ email }, { mobile }],
  });

  if (adminExists) {
    res.status(400);
    throw new Error("Admin with this email or mobile already exists");
  }

  const admin = await Admin.create({
    pgName,
    ownerName,
    email,
    mobile,
    password,
    address,
  });

  if (admin) {
    const token = generateToken(res, admin._id, "admin");

    // Send welcome email to the newly registered admin
    try {
      await sendWelcomeEmail(admin.email, admin.ownerName);
      console.log("Welcome email sent successfully to:", admin.email);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't throw error to prevent registration failure, just log it
    }

    res.status(201).json({
      _id: admin._id,
      pgName: admin.pgName,
      ownerName: admin.ownerName,
      email: admin.email,
      mobile: admin.mobile,
      role: admin.role,
      token: token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid admin data");
  }
});

// @desc    Logout admin & clear cookie
// @route   POST /api/admins/logout
// @access  Public
const logoutAdmin = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged out successfully" });
});

// @desc    Get admin profile
// @route   GET /api/admins/profile
// @access  Private
const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);

  if (admin) {
    res.json({
      _id: admin._id,
      pgName: admin.pgName,
      ownerName: admin.ownerName,
      email: admin.email,
      mobile: admin.mobile,
      address: admin.address,
      role: admin.role,
      isVerified: admin.isVerified,
    });
  } else {
    res.status(404);
    throw new Error("Admin not found");
  }
});

// @desc    Update admin profile
// @route   PUT /api/admins/profile
// @access  Private
const updateAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);

  if (admin) {
    admin.pgName = req.body.pgName || admin.pgName;
    admin.ownerName = req.body.ownerName || admin.ownerName;
    admin.email = req.body.email || admin.email;
    admin.mobile = req.body.mobile || admin.mobile;
    admin.address = req.body.address || admin.address;

    if (req.body.password) {
      admin.password = req.body.password;
    }

    const updatedAdmin = await admin.save();

    res.json({
      _id: updatedAdmin._id,
      pgName: updatedAdmin.pgName,
      ownerName: updatedAdmin.ownerName,
      email: updatedAdmin.email,
      mobile: updatedAdmin.mobile,
      address: updatedAdmin.address,
      role: updatedAdmin.role,
      isVerified: updatedAdmin.isVerified,
    });
  } else {
    res.status(404);
    throw new Error("Admin not found");
  }
});

// @desc    Send mobile OTP
// @route   POST /api/admins/send-mobile-otp
// @access  Public
const sendMobileOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  const admin = await Admin.findOne({ mobile });

  if (admin) {
    const otp = admin.generateVerificationToken();
    await admin.save();

    if (client && process.env.TWILIO_PHONE_NUMBER) {
      try {
        // Send OTP via Twilio
        const message = await client.messages.create({
          body: `Your OTP for Bedwale.in verification is: ${otp}. This OTP is valid for 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: mobile,
        });

        console.log(`OTP sent to ${mobile}: ${otp}`);
        console.log(`Message SID: ${message.sid}`);

        res.json({ message: "OTP sent successfully" });
      } catch (error) {
        console.error("Error sending OTP via Twilio:", error);
        res.status(500);
        throw new Error("Failed to send OTP. Please try again later.");
      }
    } else {
      // Fallback to console log when Twilio is not configured
      console.log(`Mobile OTP for ${mobile}: ${otp} (Twilio not configured)`);
      console.log(
        "Please configure Twilio credentials in .env file to send actual SMS",
      );

      res.json({
        message:
          "OTP generated successfully (Twilio not configured - check console for OTP)",
      });
    }
  } else {
    res.status(404);
    throw new Error("Admin not found with this mobile number");
  }
});

// @desc    Verify mobile OTP
// @route   POST /api/admins/verify-mobile-otp
// @access  Public
const verifyMobileOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  const admin = await Admin.findOne({ mobile });

  if (admin && admin.verificationToken === otp) {
    admin.isVerified = true;
    admin.verificationToken = undefined;
    await admin.save();

    res.json({ message: "Mobile number verified successfully" });
  } else {
    res.status(400);
    throw new Error("Invalid OTP");
  }
});

// @desc    Send email OTP
// @route   POST /api/admins/send-email-otp
// @access  Public
const sendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin) {
    res.status(404);
    throw new Error("Admin not found with this email");
  }

  const otp = admin.generateVerificationToken(); // sets verificationTokenExpires
  await admin.save();

  await sendEmailVerificationOtp(email, admin.ownerName, otp);

  res.json({ message: "OTP sent successfully" });
});

// @desc    Verify email OTP
// @route   POST /api/admins/verify-email-otp
// @access  Public
const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const admin = await Admin.findOne({ email });

  if (admin && admin.verificationToken === otp) {
    admin.isVerified = true;
    admin.verificationToken = undefined;
    await admin.save();

    res.json({ message: "Email verified successfully" });
  } else {
    res.status(400);
    throw new Error("Invalid OTP");
  }
});

// @desc    Forgot password
// @route   POST /api/admins/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin) {
    res.status(404);
    throw new Error("No account found with this email address");
  }

  const otp = admin.generatePasswordResetToken();
  await admin.save();

  await sendPasswordResetOtpEmail(email, admin.ownerName, otp);

  res.json({ message: "Password reset code sent to your email" });
});

// @desc    Reset password
// @route   POST /api/admins/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const admin = await Admin.findOne({
    email,
    passwordResetToken: otp,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!admin) {
    res.status(400);
    throw new Error("Invalid or expired reset code. Please request a new one.");
  }

  admin.password = newPassword;
  admin.passwordResetToken = undefined;
  admin.passwordResetExpires = undefined;
  await admin.save();

  res.json({ message: "Password reset successful" });
});

// @desc    Send pre-registration email OTP (no account required)
// @route   POST /api/admins/send-prereg-otp
// @access  Public
const sendPreRegOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400); throw new Error("Email is required"); }

  // Block if email already registered
  const exists = await Admin.findOne({ email: email.toLowerCase() });
  if (exists) { res.status(400); throw new Error("An account with this email already exists"); }

  const otp = generateOtp();
  setPreRegOtp(email, otp);
  await sendEmailVerificationOtp(email, "there", otp);
  res.json({ message: "OTP sent to your email" });
});

// @desc    Verify pre-registration email OTP
// @route   POST /api/admins/verify-prereg-otp
// @access  Public
const verifyPreRegOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) { res.status(400); throw new Error("Email and OTP are required"); }

  const valid = checkPreRegOtp(email, otp);
  if (!valid) { res.status(400); throw new Error("Invalid or expired OTP"); }

  res.json({ message: "Email verified", verified: true });
});

export {
  authAdmin,
  registerAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  sendMobileOtp,
  verifyMobileOtp,
  sendEmailOtp,
  verifyEmailOtp,
  sendPreRegOtp,
  verifyPreRegOtp,
  forgotPassword,
  resetPassword,
};
