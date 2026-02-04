import asyncHandler from "../middleware/asyncHandler.js";
import Admin from "../models/adminModel.js";
import generateToken from "../utils/generateToken.js";
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
          body: `Your OTP for STHALS.IN verification is: ${otp}. This OTP is valid for 10 minutes.`,
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

  if (admin) {
    const otp = admin.generateVerificationToken();
    await admin.save();

    // In real implementation, send OTP via email service
    console.log(`Email OTP for ${email}: ${otp}`);

    res.json({ message: "OTP sent successfully" });
  } else {
    res.status(404);
    throw new Error("Admin not found with this email");
  }
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

  if (admin) {
    const resetToken = admin.generatePasswordResetToken();
    await admin.save();

    // In real implementation, send reset token via email
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ message: "Password reset token sent to your email" });
  } else {
    res.status(404);
    throw new Error("Admin not found with this email");
  }
});

// @desc    Reset password
// @route   POST /api/admins/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body;

  const admin = await Admin.findOne({
    email,
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (admin) {
    admin.password = newPassword;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    res.json({ message: "Password reset successful" });
  } else {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }
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
  forgotPassword,
  resetPassword,
};
