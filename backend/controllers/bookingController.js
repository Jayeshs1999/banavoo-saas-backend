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
  sendBookingRescheduledToUser,
  sendBookingRescheduledToAdmin,
  sendBookingCancellationConfirmationToUser,
} from "../utils/emailService.js";
import {
  calculatePriceByPeriod,
  validateBookingDates,
} from "../utils/priceCalculator.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build bed summary string for emails  e.g. "Room A – Bed 1, Bed 2"
// ─────────────────────────────────────────────────────────────────────────────
function bedSummaryText(beds) {
  if (!beds || beds.length === 0) return "N/A";
  // Group by room
  const byRoom = {};
  for (const b of beds) {
    const rn = b.roomName || b.roomId;
    if (!byRoom[rn]) byRoom[rn] = [];
    byRoom[rn].push(`Bed #${b.bedNumber || b.bedId}`);
  }
  return Object.entries(byRoom)
    .map(([room, bedList]) => `${room} – ${bedList.join(", ")}`)
    .join(" | ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve beds from the new multi-bed payload OR from legacy single-bed
// Returns an array of { roomId, bedId } pairs.
// ─────────────────────────────────────────────────────────────────────────────
function resolveBedPairs(body) {
  // New multi-bed format: body.beds = [{ roomId, bedId }, ...]
  if (Array.isArray(body.beds) && body.beds.length > 0) {
    return body.beds.map((b) => ({ roomId: b.roomId, bedId: b.bedId }));
  }
  // Legacy single-bed format
  if (body.roomId && body.bedId) {
    return [{ roomId: body.roomId, bedId: body.bedId }];
  }
  return [];
}

/**
 * @desc    Create a new booking (for users) — supports multiple beds
 * @route   POST /api/bookings
 * @access  Private (User only)
 */
const createBooking = asyncHandler(async (req, res) => {
  const { pgId, joinDate, stayDays, notes, paymentMethod } = req.body;

  const bedPairs = resolveBedPairs(req.body);

  if (!pgId || !joinDate || !stayDays || bedPairs.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "PG ID, at least one Bed, Join Date, and Stay Days are required",
    });
  }

  if (stayDays < 1 || stayDays > 365) {
    return res.status(400).json({
      success: false,
      message: "Stay days must be between 1 and 365",
    });
  }

  // Check if PG exists
  const pg = await PG.findById(pgId);
  if (!pg) {
    return res.status(404).json({ success: false, message: "PG not found" });
  }

  const checkInDate = new Date(joinDate);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + stayDays);

  // Validate + price each bed
  const resolvedBeds = [];
  let totalPrice = 0;

  for (const pair of bedPairs) {
    const room = pg.structure.find(
      (r) => r._id.toString() === pair.roomId,
    );
    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room ${pair.roomId} not found in this PG`,
      });
    }

    const bed = room.beds.find((b) => b._id.toString() === pair.bedId);
    if (!bed) {
      return res.status(404).json({
        success: false,
        message: `Bed ${pair.bedId} not found in room ${room.name}`,
      });
    }

    if (bed.allocated) {
      return res.status(400).json({
        success: false,
        message: `Bed #${room.beds.findIndex((b) => b._id.toString() === pair.bedId) + 1} in ${room.name} is already allocated`,
      });
    }

    const { totalPrice: bedTotal } = calculatePriceByPeriod({
      checkIn: checkInDate,
      checkOut: checkOutDate,
      price: bed.price,
      pricingPeriod: room.pricingPeriod || "month",
    });

    const bedIndex =
      room.beds.findIndex((b) => b._id.toString() === pair.bedId) + 1;

    resolvedBeds.push({
      roomId: pair.roomId,
      bedId: pair.bedId,
      roomName: room.name,
      bedNumber: bedIndex,
      bedPrice: bed.price,
      pricingPeriod: room.pricingPeriod || "month",
      totalPrice: bedTotal,
    });

    totalPrice += bedTotal;
  }

  // Create booking — write legacy fields from first bed for backward compat
  const booking = new Booking({
    userId: req.user._id,
    pgId,
    beds: resolvedBeds,
    // legacy scalar fields kept for backward compat
    roomId: resolvedBeds[0].roomId,
    bedId: resolvedBeds[0].bedId,
    joinDate: checkInDate,
    stayDays,
    totalPrice,
    notes: notes || "",
    paymentMethod: paymentMethod || "cash",
    status: "pending",
  });

  const createdBooking = await booking.save();

  // Get admin for notification email
  const admin = await Admin.findById(pg.adminId).select(
    "email pgName ownerName mobile",
  );

  const userName = req.user.firstName
    ? `${req.user.firstName} ${req.user.lastName || ""}`
    : req.user.email;

  const bedsSummary = bedSummaryText(resolvedBeds);

  // Send email notification to admin
  if (admin && admin.email) {
    sendBookingNotificationEmail(admin.email, pg.name, userName, {
      bedsSummary,
      bedCount: resolvedBeds.length,
      joinDate,
      stayDays,
      totalPrice,
      paymentMethod: paymentMethod || "cash",
      notes: notes || "",
    });
  }

  // Send confirmation email to user
  if (req.user.email) {
    sendBookingConfirmationToUser(req.user.email, req.user.firstName || req.user.email, {
      pgName: pg.name,
      bedsSummary,
      bedCount: resolvedBeds.length,
      joinDate,
      stayDays,
      totalPrice,
      paymentMethod: paymentMethod || "cash",
      adminName: admin?.ownerName || "PG Admin",
      adminPhone: admin?.mobile || "Not available",
    });
  }

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

  const enrichedBookings = bookings.map((booking) => {
    const pg = booking.pgId;
    const pricingPeriod =
      (pg?.structure?.find(
        (r) =>
          r.id === booking.roomId || r._id?.toString() === booking.roomId,
      )?.pricingPeriod) || "month";

    const checkInDate = new Date(booking.joinDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + booking.stayDays);
    const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const months = Math.max(1, Math.ceil(days / 30));
    const unitCount = pricingPeriod === "day" ? days : months;

    // Resolve beds array — works for both new multi-bed and legacy single-bed
    const beds = normalizeBeds(booking, pg?.structure);

    return {
      ...booking.toObject(),
      beds,
      adminContact: pg?.adminId
        ? {
            name: pg.adminId.ownerName || "PG Admin",
            phone: pg.adminId.mobile || "Not available",
            email: pg.adminId.email || "Not available",
            pgName: pg.adminId.pgName || pg.name,
          }
        : null,
      // legacy single-bed fields kept for older clients
      bedPrice: beds[0]?.bedPrice || 0,
      pricingPeriod,
      priceBreakdown: {
        unitCount,
        unitLabel:
          pricingPeriod === "day"
            ? days === 1 ? "day" : "days"
            : months === 1 ? "month" : "months",
      },
    };
  });

  res.json({ success: true, data: enrichedBookings });
});

/**
 * @desc    Get booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private (User only — can only access own bookings)
 */
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("pgId", "name location photos onlinePayment structure")
    .populate("userId", "firstName lastName email mobile");

  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (booking.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this booking",
    });
  }

  res.json({ success: true, data: booking });
});

/**
 * @desc    Cancel a booking (for users)
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private (User only — can only cancel own bookings)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (booking.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to cancel this booking",
    });
  }

  if (booking.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Booking is already cancelled",
    });
  }

  const pg = await PG.findById(booking.pgId).select("name adminId");
  booking.status = "cancelled";
  await booking.save();

  const admin = await Admin.findById(pg.adminId).select("email pgName");
  const userName = req.user.firstName
    ? `${req.user.firstName} ${req.user.lastName || ""}`
    : req.user.email;

  if (admin && admin.email) {
    sendBookingCancellationEmail(admin.email, pg.name, userName, {
      joinDate: booking.joinDate,
      stayDays: booking.stayDays,
      totalPrice: booking.totalPrice,
    });
  }

  if (req.user.email) {
    sendBookingCancellationConfirmationToUser(req.user.email, userName, {
      pgName: pg.name,
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
  const adminPGs = await PG.find({ adminId: req.admin._id });
  const pgIds = adminPGs.map((pg) => pg._id);

  const bookings = await Booking.find({ pgId: { $in: pgIds } })
    .populate("pgId", "name location structure")
    .populate("userId", "firstName lastName email mobile")
    .sort({ createdAt: -1 });

  const enrichedBookings = bookings.map((booking) => {
    const pg = booking.pgId;
    const beds = normalizeBeds(booking, pg?.structure);

    // For price breakdown, use first bed's pricing period
    const pricingPeriod = beds[0]?.pricingPeriod || "month";
    const checkInDate = new Date(booking.joinDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + booking.stayDays);
    const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
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
      beds,
      // legacy scalar fields for old clients
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
      // Derived helpers (first bed only, for backward compat)
      roomName: beds[0]?.roomName || "Unknown",
      bedNumber: beds[0]?.bedNumber || "N/A",
      bedPrice: beds[0]?.bedPrice || 0,
      pricingPeriod,
      priceBreakdown: {
        unitCount,
        unitLabel:
          pricingPeriod === "day"
            ? days === 1 ? "day" : "days"
            : months === 1 ? "month" : "months",
      },
    };
  });

  res.json({ success: true, data: enrichedBookings });
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

  res.json({ success: true, data: bookings });
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
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  const pg = await PG.findOne({ _id: booking.pgId._id, adminId: req.admin._id });
  if (!pg) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this booking",
    });
  }

  const beds = normalizeBeds(booking, pg.structure);

  if (status === "approved") {
    booking.status = status;
    booking.paymentStatus = "pending";

    // Allocate every bed in this booking
    let pgDirty = false;
    for (const bedItem of beds) {
      const room = pg.structure?.find(
        (r) => r.id === bedItem.roomId || r._id.toString() === bedItem.roomId,
      );
      if (room) {
        const bed = room.beds?.find(
          (b) => b.id === bedItem.bedId || b._id.toString() === bedItem.bedId,
        );
        if (bed && !bed.allocated) {
          bed.allocated = true;
          pgDirty = true;
        }
      }
    }
    if (pgDirty) await pg.save();

  } else if (status === "rejected" || status === "cancelled") {
    booking.status = status;

    // Deallocate each bed if no other approved booking holds it
    let pgDirty = false;
    for (const bedItem of beds) {
      const room = pg.structure?.find(
        (r) => r.id === bedItem.roomId || r._id.toString() === bedItem.roomId,
      );
      if (room) {
        const bed = room.beds?.find(
          (b) => b.id === bedItem.bedId || b._id.toString() === bedItem.bedId,
        );
        if (bed && bed.allocated) {
          const otherApproved = await Booking.countDocuments({
            pgId: booking.pgId._id,
            $or: [
              { roomId: bedItem.roomId, bedId: bedItem.bedId },
              { "beds.roomId": bedItem.roomId, "beds.bedId": bedItem.bedId },
            ],
            status: "approved",
            _id: { $ne: booking._id },
          });
          if (otherApproved === 0) {
            bed.allocated = false;
            pgDirty = true;
          }
        }
      }
    }
    if (pgDirty) await pg.save();
  } else {
    booking.status = status;
  }

  await booking.save();

  // Send email to user
  const user = booking.userId;
  const userEmail = user?.email;
  if (userEmail && (status === "approved" || status === "rejected")) {
    const admin = await Admin.findById(pg.adminId).select(
      "email ownerName mobile pgName",
    );
    const bedsSummary = bedSummaryText(beds);

    const bookingDetails = {
      pgName: pg.name,
      bedsSummary,
      bedCount: beds.length,
      // legacy single-bed helpers kept for email templates
      roomName: beds[0]?.roomName || "Unknown",
      bedNumber: beds[0]?.bedNumber || "N/A",
      joinDate: booking.joinDate,
      stayDays: booking.stayDays,
      totalPrice: booking.totalPrice,
      paymentMethod: booking.paymentMethod,
      adminName: admin?.ownerName || "PG Admin",
      adminPhone: admin?.mobile || "Not available",
    };

    if (status === "approved") {
      sendBookingApprovalEmail(userEmail, user.firstName || userEmail, bookingDetails);
    } else {
      sendBookingRejectionEmail(userEmail, user.firstName || userEmail, bookingDetails);
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

  if (booking.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  if (booking.paymentStatus === "paid") {
    return res.status(400).json({ success: false, message: "Booking already paid" });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Payment gateway not configured. Please contact support.",
    });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await razorpay.orders.create({
    amount: Math.round(booking.totalPrice * 100),
    currency: "INR",
    receipt: `booking_${booking._id}`,
    notes: {
      bookingId: booking._id.toString(),
      pgName: booking.pgId?.name || "",
    },
  });

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
 * @desc    Verify Razorpay payment and mark booking as paid
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

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  booking.razorpayOrderId   = razorpay_order_id;
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  booking.paymentStatus     = "paid";
  booking.paymentMethod     = "online";
  booking.status            = "approved";

  // Auto-allocate all beds on successful payment
  const pg = await PG.findById(booking.pgId);
  if (pg) {
    const beds = normalizeBeds(booking, pg.structure);
    let pgDirty = false;
    for (const bedItem of beds) {
      const room = pg.structure?.find(
        (r) => r.id === bedItem.roomId || r._id.toString() === bedItem.roomId,
      );
      if (room) {
        const bed = room.beds?.find(
          (b) => b.id === bedItem.bedId || b._id.toString() === bedItem.bedId,
        );
        if (bed && !bed.allocated) {
          bed.allocated = true;
          pgDirty = true;
        }
      }
    }
    if (pgDirty) await pg.save();
  }

  await booking.save();

  res.json({
    success: true,
    message: "Payment verified and booking confirmed",
    data: booking,
  });
});

/**
 * @desc    Reschedule a pending booking's join date (User only)
 * @route   PUT /api/bookings/:id/reschedule
 * @access  Private (User only)
 */
const rescheduleBooking = asyncHandler(async (req, res) => {
  const { joinDate } = req.body;

  if (!joinDate) {
    return res.status(400).json({ success: false, message: "New join date is required" });
  }

  const newDate = new Date(joinDate);
  if (isNaN(newDate.getTime()) || newDate < new Date()) {
    return res.status(400).json({
      success: false,
      message: "New join date must be a valid future date",
    });
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (booking.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to reschedule this booking",
    });
  }

  if (booking.status !== "pending") {
    return res.status(400).json({
      success: false,
      message:
        "Only pending bookings can be rescheduled. Cancel this booking and create a new one.",
    });
  }

  // Recalculate total price for the new dates
  const checkOutDate = new Date(newDate);
  checkOutDate.setDate(checkOutDate.getDate() + booking.stayDays);

  const pg = await PG.findById(booking.pgId);
  let newTotalPrice = 0;

  if (pg) {
    const beds = normalizeBeds(booking, pg.structure);
    for (const bedItem of beds) {
      const room = pg.structure?.find((r) => r._id.toString() === bedItem.roomId);
      if (room) {
        const bed = room.beds?.find((b) => b._id.toString() === bedItem.bedId);
        if (bed) {
          const { totalPrice: bedTotal } = calculatePriceByPeriod({
            checkIn: newDate,
            checkOut: checkOutDate,
            price: bed.price,
            pricingPeriod: room.pricingPeriod || "month",
          });
          newTotalPrice += bedTotal;
        }
      }
    }
    if (newTotalPrice > 0) booking.totalPrice = newTotalPrice;
  }

  const oldJoinDate = booking.joinDate;
  booking.joinDate = newDate;
  await booking.save();

  const updatedBooking = await Booking.findById(booking._id)
    .populate("pgId", "name location photos")
    .populate("userId", "firstName lastName email mobile");

  const pgForEmail = pg || (await PG.findById(booking.pgId));
  const admin = pgForEmail
    ? await Admin.findById(pgForEmail.adminId).select("email ownerName mobile")
    : null;

  const beds = normalizeBeds(booking, pgForEmail?.structure);
  const bedsSummary = bedSummaryText(beds);

  const rescheduleDetails = {
    pgName: pgForEmail?.name || "PG",
    bedsSummary,
    bedCount: beds.length,
    // legacy helpers for email templates
    roomName: beds[0]?.roomName || "Unknown",
    bedNumber: beds[0]?.bedNumber || "N/A",
    oldJoinDate,
    newJoinDate: newDate,
    stayDays: booking.stayDays,
    totalPrice: booking.totalPrice,
    paymentMethod: booking.paymentMethod,
  };

  const userName = req.user.firstName
    ? `${req.user.firstName} ${req.user.lastName || ""}`
    : req.user.email;

  if (req.user.email) {
    sendBookingRescheduledToUser(req.user.email, userName, rescheduleDetails);
  }

  if (admin && admin.email) {
    sendBookingRescheduledToAdmin(
      admin.email,
      pgForEmail.name,
      userName,
      rescheduleDetails,
    );
  }

  res.json({
    success: true,
    message: "Booking rescheduled successfully",
    data: updatedBooking,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: normalise beds from either the new `beds` array or the legacy
// `roomId`/`bedId` scalar fields.  Always returns a non-empty array.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeBeds(booking, structure) {
  if (booking.beds && booking.beds.length > 0) {
    // Enrich with fresh room/bed data from PG structure if available
    return booking.beds.map((b) => {
      if (b.roomName && b.bedNumber) return b; // already enriched
      if (!structure) return b;
      const room = structure.find(
        (r) => r.id === b.roomId || r._id?.toString() === b.roomId,
      );
      if (!room) return b;
      const bedIdx =
        room.beds.findIndex(
          (bd) => bd.id === b.bedId || bd._id?.toString() === b.bedId,
        ) + 1;
      const bed = room.beds.find(
        (bd) => bd.id === b.bedId || bd._id?.toString() === b.bedId,
      );
      return {
        ...b,
        roomName: b.roomName || room.name,
        bedNumber: b.bedNumber || bedIdx,
        bedPrice: b.bedPrice || bed?.price || 0,
        pricingPeriod: b.pricingPeriod || room.pricingPeriod || "month",
      };
    });
  }

  // Legacy single-bed: build a one-element array
  if (!booking.roomId || !booking.bedId) return [];
  if (!structure) {
    return [{ roomId: booking.roomId, bedId: booking.bedId }];
  }
  const room = structure.find(
    (r) => r.id === booking.roomId || r._id?.toString() === booking.roomId,
  );
  const bedIdx = room
    ? room.beds.findIndex(
        (b) => b.id === booking.bedId || b._id?.toString() === booking.bedId,
      ) + 1
    : 0;
  const bed = room?.beds.find(
    (b) => b.id === booking.bedId || b._id?.toString() === booking.bedId,
  );
  return [
    {
      roomId: booking.roomId,
      bedId: booking.bedId,
      roomName: room?.name || "Unknown",
      bedNumber: bedIdx || "N/A",
      bedPrice: bed?.price || 0,
      pricingPeriod: room?.pricingPeriod || "month",
      totalPrice: booking.totalPrice,
    },
  ];
}

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
  rescheduleBooking,
};
