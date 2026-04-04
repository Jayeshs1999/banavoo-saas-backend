import asyncHandler from "../middleware/asyncHandler.js";
import Booking from "../models/bookingModel.js";
import PG from "../models/pgModel.js";
import User from "../models/userModel.js";

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

  // Calculate total price
  const totalPrice = bed.price * stayDays;

  // Create booking
  const booking = new Booking({
    userId: req.user._id,
    pgId,
    roomId,
    bedId,
    joinDate: new Date(joinDate),
    stayDays,
    totalPrice,
    notes: notes || "",
    paymentMethod: paymentMethod || "cash",
    status: "pending",
  });

  const createdBooking = await booking.save();

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
    .populate("pgId", "name location photos onlinePayment")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: bookings,
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

  booking.status = "cancelled";
  await booking.save();

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
    .populate("pgId", "name location")
    .populate("userId", "firstName lastName email mobile")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: bookings,
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

  const booking = await Booking.findById(req.params.id).populate("pgId");

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

  booking.status = status;
  if (status === "approved") {
    booking.paymentStatus = "pending";
  }

  await booking.save();

  const updatedBooking = await Booking.findById(booking._id)
    .populate("pgId", "name location")
    .populate("userId", "firstName lastName email mobile");

  res.json({
    success: true,
    message: `Booking ${status} successfully`,
    data: updatedBooking,
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
};
