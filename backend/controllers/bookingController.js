import asyncHandler from "../middleware/asyncHandler.js";
import Booking from "../models/bookingModel.js";
import PG from "../models/pgModel.js";
import User from "../models/userModel.js";
import Admin from "../models/adminModel.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import {
  sendBookingNotificationEmail,
  sendBookingCancellationEmail,
  sendBookingConfirmationToUser,
  sendBookingApprovalEmail,
  sendBookingRejectionEmail,
} from "../utils/emailService.js";
import {
  calculatePriceByPeriod,
  validateBookingDates,
} from "../utils/priceCalculator.js";

/**
 * @desc    Create a new booking (for users)
 * @route   POST /api/bookings
 * @access  Private (User only)
 */
const createBooking = asyncHandler(async (req, res) => {
  const { pgId, roomId, bedId, joinDate, stayDays, notes, paymentMethod } =
    req.body;

  // Validate required fields
  if (!pgId || !roomId || !bedId || !joinDate || !stayDays) {
    return res.status(400).json({
      success: false,
      message: "PG ID, Room ID, Bed ID, Join Date, and Stay Days are required",
    });
  }

  // Validate stay days
  if (stayDays < 1 || stayDays > 365) {
    return res.status(400).json({
      success: false,
      message: "Stay days must be between 1 and 365",
    });
  }

  // Check if PG exists
  const pg = await PG.findById(pgId);
  if (!pg) {
    return res.status(404).json({
      success: false,
      message: "PG not found",
    });
  }

  // Find the room and bed
  const room = pg.structure.find((r) => r._id.toString() === roomId);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found in this PG",
    });
  }

  const bed = room.beds.find((b) => b._id.toString() === bedId);
  if (!bed) {
    return res.status(404).json({
      success: false,
      message: "Bed not found in this room",
    });
  }

  // Check if bed is available
  if (bed.allocated) {
    return res.status(400).json({
      success: false,
      message: "This bed is already allocated",
    });
  }

  // Calculate check-out date based on join date and stay days
  const checkInDate = new Date(joinDate);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + stayDays);

  // Calculate total price using the price calculator
  // The pricing is based on the room's pricing period (day or month)
  const { totalPrice } = calculatePriceByPeriod({
    checkIn: checkInDate,
    checkOut: checkOutDate,
    price: bed.price,
    pricingPeriod: room.pricingPeriod || "month",
  });

  // Create booking
  const booking = new Booking({
    userId: req.user._id,
    pgId,
    roomId,
    bedId,
    joinDate: checkInDate,
    stayDays,
    totalPrice,
    notes: notes || "",
    paymentMethod: paymentMethod || "cash",
    status: "pending",
  });

  const createdBooking = await booking.save();

  // Get admin email for notification
  const admin = await Admin.findById(pg.adminId).select(
    "email pgName ownerName mobile",
  );

  // Get room and bed details for email
  const roomName = room.name;
  const bedIndex = room.beds.findIndex((b) => b._id.toString() === bedId) + 1;

  // Send email notification to admin
  if (admin && admin.email) {
    const userName = req.user.firstName
      ? `${req.user.firstName} ${req.user.lastName || ""}`
      : req.user.email;
    sendBookingNotificationEmail(admin.email, pg.name, userName, {
      roomName,
      bedNumber: bedIndex,
      joinDate,
      stayDays,
      totalPrice,
      paymentMethod: paymentMethod || "cash",
      notes: notes || "",
    });
  }

  // Send confirmation email to user
  const user = req.user;
  const userEmail = user.email;
  if (userEmail) {
    sendBookingConfirmationToUser(userEmail, user.firstName || userEmail, {
      pgName: pg.name,
      roomName,
      bedNumber: bedIndex,
      joinDate,
      stayDays,
      totalPrice,
      paymentMethod: paymentMethod || "cash",
      adminName: admin?.ownerName || "PG Admin",
      adminPhone: admin?.mobile || "Not available",
    });
  }

  // Populate the booking with PG and user details
  const populatedBooking = await Booking.findById(createdBooking._id)
    .populate("pgId", "name location photos")
    .populate("userId", "firstName lastName email mobile");

  res.status(201).json({
    success: true,
    message: "Booking request created successfully",
    data: populatedBooking,
  });
});

/**
 * @desc    Get user's bookings
 * @route   GET /api/bookings/my-bookings
 * @access  Private (User only)
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ userId: req.user._id })
    .populate({
      path: "pgId",
      select: "name location photos onlinePayment adminId structure",
      populate: {
        path: "adminId",
        select: "mobile email ownerName pgName",
      },
    })
    .sort({ createdAt: -1 });

  // Enrich bookings with admin contact info and price breakdown
  const enrichedBookings = bookings.map((booking) => {
    const pg = booking.pgId;
    // Find room and bed for price breakdown
    const room = pg?.structure?.find(
      (r) => r.id === booking.roomId || r._id.toString() === booking.roomId,
    );
    const bed = room?.beds?.find(
      (b) => b.id === booking.bedId || b._id.toString() === booking.bedId,
    );

    // Calculate pricing breakdown based on room's pricing period
    const pricingPeriod = room?.pricingPeriod || "month";
    const checkInDate = new Date(booking.joinDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + booking.stayDays);
    const days = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );
    const months = Math.max(1, Math.ceil(days / 30));
    const unitCount = pricingPeriod === "day" ? days : months;

    return {
      ...booking.toObject(),
      adminContact: pg?.adminId
        ? {
            name: pg.adminId.ownerName || "PG Admin",
            phone: pg.adminId.mobile || "Not available",
            email: pg.adminId.email || "Not available",
            pgName: pg.adminId.pgName || pg.name,
          }
        : null,
      bedPrice: bed?.price || 0,
      pricingPeriod,
      priceBreakdown: {
        unitCount,
        unitLabel:
          pricingPeriod === "day"
            ? days === 1
              ? "day"
              : "days"
            : months === 1
              ? "month"
              : "months",
      },
    };
  });

  res.json({
    success: true,
    data: enrichedBookings,
  });
});

/**
 * @desc    Get booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private (User only - can only access own bookings)
 */
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("pgId", "name location photos onlinePayment structure")
    .populate("userId", "firstName lastName email mobile");

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  // Check if user owns this booking
  if (booking.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this booking",
    });
  }

  res.json({
    success: true,
    data: booking,
  });
});

/**
 * @desc    Cancel a booking (for users)
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private (User only - can only cancel own bookings)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  // Check if user owns this booking
  if (booking.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to cancel this booking",
    });
  }

  // Only pending or approved bookings can be cancelled
  if (booking.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Booking is already cancelled",
    });
  }

  // Get PG details for notification
  const pg = await PG.findById(booking.pgId).select("name adminId");

  booking.status = "cancelled";
  await booking.save();

  // Get admin email for notification
  const admin = await Admin.findById(pg.adminId).select("email pgName");

  // Send cancellation email notification to admin
  if (admin && admin.email) {
    const userName = req.user.firstName
      ? `${req.user.firstName} ${req.user.lastName || ""}`
      : req.user.email;
    sendBookingCancellationEmail(admin.email, pg.name, userName, {
      joinDate: booking.joinDate,
      stayDays: booking.stayDays,
      totalPrice: booking.totalPrice,
    });
  }

  res.json({
    success: true,
    message: "Booking cancelled successfully",
    data: booking,
  });
});

/**
 * @desc    Get bookings for admin's PGs
 * @route   GET /api/bookings/admin
 * @access  Private (Admin only)
 */
const getAdminBookings = asyncHandler(async (req, res) => {
  // Find all PGs owned by the admin
  const adminPGs = await PG.find({ adminId: req.admin._id });
  const pgIds = adminPGs.map((pg) => pg._id);

  const bookings = await Booking.find({ pgId: { $in: pgIds } })
    .populate("pgId", "name location structure")
    .populate("userId", "firstName lastName email mobile")
    .sort({ createdAt: -1 });

  // Enrich bookings with room and bed details
  const enrichedBookings = bookings.map((booking) => {
    const pg = booking.pgId;
    // Use custom 'id' field for lookup, fallback to _id for backward compatibility
    const room = pg.structure?.find(
      (r) => r.id === booking.roomId || r._id.toString() === booking.roomId,
    );
    const bed = room?.beds?.find(
      (b) => b.id === booking.bedId || b._id.toString() === booking.bedId,
    );
    const bedIndex =
      room?.beds?.findIndex(
        (b) => b.id === booking.bedId || b._id.toString() === booking.bedId,
      ) + 1;

    // Calculate pricing breakdown based on room's pricing period
    const pricingPeriod = room?.pricingPeriod || "month";
    const checkInDate = new Date(booking.joinDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + booking.stayDays);
    const days = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );
    const months = Math.max(1, Math.ceil(days / 30));
    const unitCount = pricingPeriod === "day" ? days : months;

    return {
      _id: booking._id,
      pgId: {
        _id: pg._id,
        name: pg.name,
        location: pg.location,
      },
      userId: booking.userId,
      roomId: booking.roomId,
      bedId: booking.bedId,
      joinDate: booking.joinDate,
      stayDays: booking.stayDays,
      status: booking.status,
      totalPrice: booking.totalPrice,
      paymentMethod: booking.paymentMethod,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      // Added details
      roomName: room?.name || "Unknown",
      bedNumber: bedIndex || "N/A",
      bedPrice: bed?.price || 0,
      pricingPeriod,
      priceBreakdown: {
        unitCount,
        unitLabel:
          pricingPeriod === "day"
            ? days === 1
              ? "day"
              : "days"
            : months === 1
              ? "month"
              : "months",
      },
    };
  });

  res.json({
    success: true,
    data: enrichedBookings,
  });
});

/**
 * @desc    Get bookings for a specific PG
 * @route   GET /api/bookings/pg/:pgId
 * @access  Private (Admin only)
 */
const getPGBookings = asyncHandler(async (req, res) => {
  const pg = await PG.findOne({ _id: req.params.pgId, adminId: req.admin._id });

  if (!pg) {
    return res.status(404).json({
      success: false,
      message: "PG not found or not authorized",
    });
  }

  const bookings = await Booking.find({ pgId: req.params.pgId })
    .populate("pgId", "name location")
    .populate("userId", "firstName lastName email mobile")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: bookings,
  });
});

/**
 * @desc    Update booking status (for admin)
 * @route   PUT /api/bookings/:id/status
 * @access  Private (Admin only)
 */
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !["approved", "rejected", "cancelled"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Must be approved, rejected, or cancelled",
    });
  }

  const booking = await Booking.findById(req.params.id)
    .populate("pgId")
    .populate("userId", "firstName lastName email");

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  // Check if admin owns the PG
  const pg = await PG.findOne({
    _id: booking.pgId._id,
    adminId: req.admin._id,
  });

  if (!pg) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this booking",
    });
  }

  // Track if we need to update bed allocation
  let bedAllocated = false;

  if (status === "approved") {
    booking.status = status;
    booking.paymentStatus = "pending";

    // Mark the bed as allocated in the PG structure
    const room = pg.structure?.find(
      (r) => r.id === booking.roomId || r._id.toString() === booking.roomId,
    );
    if (room) {
      const bed = room.beds?.find(
        (b) => b.id === booking.bedId || b._id.toString() === booking.bedId,
      );
      if (bed && !bed.allocated) {
        bed.allocated = true;
        bedAllocated = true;
      }
    }

    // Save the PG with updated bed allocation
    if (bedAllocated) {
      await pg.save();
    }
  } else if (status === "rejected" || status === "cancelled") {
    booking.status = status;

    // If the booking was previously approved, we might want to deallocate the bed
    // But only if there's no other approved booking for the same bed
    const room = pg.structure?.find(
      (r) => r.id === booking.roomId || r._id.toString() === booking.roomId,
    );
    if (room) {
      const bed = room.beds?.find(
        (b) => b.id === booking.bedId || b._id.toString() === booking.bedId,
      );
      if (bed && bed.allocated) {
        // Check if there are other approved bookings for this bed
        const otherApprovedBookings = await Booking.countDocuments({
          pgId: booking.pgId._id,
          roomId: booking.roomId,
          bedId: booking.bedId,
          status: "approved",
          _id: { $ne: booking._id },
        });

        // If no other approved bookings, deallocate the bed
        if (otherApprovedBookings === 0) {
          bed.allocated = false;
          await pg.save();
        }
      }
    }
  } else {
    booking.status = status;
  }

  await booking.save();

  // Send email notification to user about the status change
  const user = booking.userId;
  const userEmail = user?.email;
  if (userEmail && (status === "approved" || status === "rejected")) {
    // Get admin contact info for the email
    const admin = await Admin.findById(pg.adminId).select(
      "email ownerName mobile pgName",
    );

    // Get room and bed details
    const room = pg.structure?.find(
      (r) => r.id === booking.roomId || r._id.toString() === booking.roomId,
    );
    const roomName = room?.name || "Unknown";
    const bedIndex =
      room?.beds?.findIndex(
        (b) => b.id === booking.bedId || b._id.toString() === booking.bedId,
      ) + 1;

    const bookingDetails = {
      pgName: pg.name,
      roomName,
      bedNumber: bedIndex || "N/A",
      joinDate: booking.joinDate,
      stayDays: booking.stayDays,
      totalPrice: booking.totalPrice,
      paymentMethod: booking.paymentMethod,
      adminName: admin?.ownerName || "PG Admin",
      adminPhone: admin?.mobile || "Not available",
    };

    if (status === "approved") {
      sendBookingApprovalEmail(
        userEmail,
        user.firstName || userEmail,
        bookingDetails,
      );
    } else if (status === "rejected") {
      sendBookingRejectionEmail(
        userEmail,
        user.firstName || userEmail,
        bookingDetails,
      );
    }
  }

  const updatedBooking = await Booking.findById(booking._id)
    .populate("pgId", "name location")
    .populate("userId", "firstName lastName email mobile");

  res.json({
    success: true,
    message: `Booking ${status} successfully`,
    data: updatedBooking,
  });
});

/**
 * @desc    Create a Razorpay order for a booking
 * @route   POST /api/bookings/:id/create-payment-order
 * @access  Private (User only)
 */
const createPaymentOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("pgId");

  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  // Only the booking owner can initiate payment
  if (booking.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  if (booking.paymentStatus === "paid") {
    return res.status(400).json({ success: false, message: "Booking already paid" });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, message: "Payment gateway not configured. Please contact support." });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  // Amount must be in paise (₹1 = 100 paise)
  const order = await razorpay.orders.create({
    amount: Math.round(booking.totalPrice * 100),
    currency: "INR",
    receipt: `booking_${booking._id}`,
    notes: {
      bookingId: booking._id.toString(),
      pgName: booking.pgId?.name || "",
    },
  });

  // Store the order id on the booking
  booking.razorpayOrderId = order.id;
  await booking.save();

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: booking._id,
      keyId: process.env.RAZORPAY_KEY_ID,
    },
  });
});

/**
 * @desc    Verify Razorpay payment signature and mark booking as paid
 * @route   POST /api/bookings/:id/verify-payment
 * @access  Private (User only)
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment details" });
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (booking.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  // Verify the HMAC-SHA256 signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  // Mark payment as paid and booking as approved
  booking.razorpayOrderId   = razorpay_order_id;
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  booking.paymentStatus     = "paid";
  booking.paymentMethod     = "online";
  booking.status            = "approved";

  // Auto-allocate the bed on successful payment
  const pg = await PG.findById(booking.pgId);
  if (pg) {
    const room = pg.structure?.find(
      (r) => r.id === booking.roomId || r._id.toString() === booking.roomId,
    );
    if (room) {
      const bed = room.beds?.find(
        (b) => b.id === booking.bedId || b._id.toString() === booking.bedId,
      );
      if (bed && !bed.allocated) {
        bed.allocated = true;
        await pg.save();
      }
    }
  }

  await booking.save();

  res.json({
    success: true,
    message: "Payment verified and booking confirmed",
    data: booking,
  });
});

export {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAdminBookings,
  getPGBookings,
  updateBookingStatus,
  createPaymentOrder,
  verifyPayment,
};
