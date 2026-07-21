import asyncHandler from "../middleware/asyncHandler.js";
import Message from "../models/messageModel.js";
import Booking from "../models/bookingModel.js";
import PG from "../models/pgModel.js";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

/**
 * Assert that the caller is a legitimate participant of the booking.
 * Returns { booking, senderType } or throws 403.
 */
const assertParticipant = async (req) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate("pgId", "adminId name")
    .populate("userId", "firstName lastName email");

  if (!booking) {
    const e = new Error("Booking not found");
    e.statusCode = 404;
    throw e;
  }

  // req.user  → user participant
  // req.admin → admin participant
  if (req.user) {
    if (booking.userId._id.toString() !== req.user._id.toString()) {
      const e = new Error("Not authorized");
      e.statusCode = 403;
      throw e;
    }
    return { booking, senderType: "user" };
  }

  if (req.admin) {
    if (booking.pgId.adminId.toString() !== req.admin._id.toString()) {
      const e = new Error("Not authorized");
      e.statusCode = 403;
      throw e;
    }
    return { booking, senderType: "admin" };
  }

  const e = new Error("Not authorized");
  e.statusCode = 403;
  throw e;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Fetch all messages for a booking (both sides use same endpoint)
// @route   GET /api/chat/:bookingId/messages?after=<isoDate>
// @access  Private (user or admin participant)
// ─────────────────────────────────────────────────────────────────────────────
const getMessages = asyncHandler(async (req, res) => {
  const { booking, senderType } = await assertParticipant(req);

  const filter = { bookingId: booking._id };

  // Support polling — only fetch messages newer than `after`
  if (req.query.after) {
    filter.createdAt = { $gt: new Date(req.query.after) };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: 1 })
    .limit(200);

  // Mark unread messages (sent by the other side) as read
  const otherType = senderType === "user" ? "admin" : "user";
  await Message.updateMany(
    { bookingId: booking._id, senderType: otherType, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({
    success: true,
    data: messages,
    meta: {
      bookingId: booking._id,
      pgName: booking.pgId?.name,
      userName: `${booking.userId?.firstName} ${booking.userId?.lastName}`.trim(),
      senderType,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Send a message
// @route   POST /api/chat/:bookingId/messages
// @access  Private (user or admin participant)
// ─────────────────────────────────────────────────────────────────────────────
const sendMessage = asyncHandler(async (req, res) => {
  const { booking, senderType } = await assertParticipant(req);

  const { text } = req.body;
  if (!text || !text.trim()) {
    res.status(400);
    throw new Error("Message text is required");
  }

  const senderId = senderType === "user" ? req.user._id : req.admin._id;

  const message = await Message.create({
    bookingId: booking._id,
    senderId,
    senderType,
    text: text.trim(),
  });

  res.status(201).json({ success: true, data: message });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get unread message count for the caller (across all their bookings)
// @route   GET /api/chat/unread-count
// @access  Private (user or admin)
// ─────────────────────────────────────────────────────────────────────────────
const getUnreadCount = asyncHandler(async (req, res) => {
  let bookingIds = [];

  if (req.user) {
    const bookings = await Booking.find({ userId: req.user._id }).select("_id");
    bookingIds = bookings.map((b) => b._id);
    const count = await Message.countDocuments({
      bookingId: { $in: bookingIds },
      senderType: "admin", // messages FROM admin TO user
      readAt: null,
    });
    return res.json({ success: true, unreadCount: count });
  }

  if (req.admin) {
    // Find all PGs belonging to this admin, then their bookings
    const pgs = await PG.find({ adminId: req.admin._id }).select("_id");
    const pgIds = pgs.map((p) => p._id);
    const bookings = await Booking.find({ pgId: { $in: pgIds } }).select("_id");
    bookingIds = bookings.map((b) => b._id);
    const count = await Message.countDocuments({
      bookingId: { $in: bookingIds },
      senderType: "user", // messages FROM user TO admin
      readAt: null,
    });
    return res.json({ success: true, unreadCount: count });
  }

  res.json({ success: true, unreadCount: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get list of conversations (bookings with at least one message)
//          for the currently logged-in user/admin
// @route   GET /api/chat/conversations
// @access  Private (user or admin)
// ─────────────────────────────────────────────────────────────────────────────
const getConversations = asyncHandler(async (req, res) => {
  let bookingIds = [];

  if (req.user) {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate("pgId", "name photos adminId")
      .sort({ updatedAt: -1 });

    const results = await Promise.all(
      bookings.map(async (b) => {
        const lastMsg = await Message.findOne({ bookingId: b._id })
          .sort({ createdAt: -1 });
        const unread = await Message.countDocuments({
          bookingId: b._id,
          senderType: "admin",
          readAt: null,
        });
        return {
          bookingId: b._id,
          pgName: b.pgId?.name ?? "—",
          pgPhoto: b.pgId?.photos?.[0] ?? null,
          status: b.status,
          lastMessage: lastMsg ? { text: lastMsg.text, createdAt: lastMsg.createdAt } : null,
          unread,
        };
      })
    );

    return res.json({ success: true, data: results });
  }

  if (req.admin) {
    const pgs = await PG.find({ adminId: req.admin._id }).select("_id name photos");
    const pgIds = pgs.map((p) => p._id);
    const bookings = await Booking.find({ pgId: { $in: pgIds } })
      .populate("userId", "firstName lastName email")
      .populate("pgId", "name photos")
      .sort({ updatedAt: -1 });

    const results = await Promise.all(
      bookings.map(async (b) => {
        const lastMsg = await Message.findOne({ bookingId: b._id })
          .sort({ createdAt: -1 });
        const unread = await Message.countDocuments({
          bookingId: b._id,
          senderType: "user",
          readAt: null,
        });
        return {
          bookingId: b._id,
          pgName: b.pgId?.name ?? "—",
          pgPhoto: b.pgId?.photos?.[0] ?? null,
          userName: `${b.userId?.firstName ?? ""} ${b.userId?.lastName ?? ""}`.trim() || "—",
          userEmail: b.userId?.email ?? "—",
          status: b.status,
          lastMessage: lastMsg ? { text: lastMsg.text, createdAt: lastMsg.createdAt } : null,
          unread,
        };
      })
    );

    return res.json({ success: true, data: results });
  }

  res.json({ success: true, data: [] });
});

export { getMessages, sendMessage, getUnreadCount, getConversations };
