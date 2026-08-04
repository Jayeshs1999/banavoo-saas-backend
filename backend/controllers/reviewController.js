import crypto from "crypto";
import asyncHandler from "../middleware/asyncHandler.js";
import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";
import PG from "../models/pgModel.js";
import { sendReviewInviteEmail } from "../utils/emailService.js";

/**
 * @desc  Admin sends a review invite for a specific booking
 * @route POST /api/reviews/invite/:bookingId
 * @access Private (Admin only)
 */
const sendReviewInvite = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate("pgId", "name adminId")
    .populate("userId", "firstName lastName email");

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  // Make sure this admin owns the PG
  if (booking.pgId.adminId.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error("Not authorised to send review invite for this booking");
  }

  // Only approved bookings can be reviewed
  if (booking.status !== "approved") {
    res.status(400);
    throw new Error("Review invites can only be sent for approved bookings");
  }

  // If a review (invite) already exists for this booking, just resend the email
  let review = await Review.findOne({ bookingId: booking._id });

  if (!review) {
    const token = crypto.randomBytes(32).toString("hex");

    review = await Review.create({
      pgId: booking.pgId._id,
      bookingId: booking._id,
      userId: booking.userId._id,
      reviewerName: `${booking.userId.firstName} ${booking.userId.lastName}`,
      inviteToken: token,
    });
  }

  const reviewUrl = `${process.env.FRONTEND_URL || "https://www.bedwale.in"}/review/${review.inviteToken}`;

  await sendReviewInviteEmail(
    booking.userId.email,
    booking.userId.firstName,
    booking.pgId.name,
    reviewUrl,
  );

  res.json({
    success: true,
    message: "Review invite sent successfully",
    data: { reviewUrl },
  });
});

/**
 * @desc  Get review page info by token (public — no auth needed)
 * @route GET /api/reviews/invite/:token
 * @access Public
 */
const getReviewByToken = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ inviteToken: req.params.token })
    .populate("pgId", "name location photos")
    .populate("bookingId", "joinDate stayDays roomId bedId");

  if (!review) {
    res.status(404);
    throw new Error("Review link is invalid or has expired");
  }

  res.json({
    success: true,
    data: {
      alreadySubmitted: review.inviteUsed,
      reviewerName: review.reviewerName,
      pg: review.pgId,
      booking: review.bookingId,
      // If already submitted, return existing rating/comment
      ...(review.inviteUsed && {
        rating: review.rating,
        comment: review.comment,
      }),
    },
  });
});

/**
 * @desc  Submit a review via token (public — no auth needed)
 * @route POST /api/reviews/submit/:token
 * @access Public
 */
const submitReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  const review = await Review.findOne({ inviteToken: req.params.token });

  if (!review) {
    res.status(404);
    throw new Error("Review link is invalid or has expired");
  }

  if (review.inviteUsed) {
    res.status(400);
    throw new Error("This review has already been submitted");
  }

  review.rating = Number(rating);
  review.comment = comment?.trim() || "";
  review.inviteUsed = true;
  review.submittedAt = new Date();
  await review.save();

  res.json({
    success: true,
    message: "Thank you! Your review has been submitted.",
    data: {
      rating: review.rating,
      comment: review.comment,
    },
  });
});

/**
 * @desc  Get all submitted reviews for a PG (public)
 * @route GET /api/reviews/pg/:pgId
 * @access Public
 */
const getPGReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({
    pgId: req.params.pgId,
    inviteUsed: true,
  })
    .select("reviewerName rating comment submittedAt")
    .sort({ submittedAt: -1 });

  const total = reviews.length;
  const avgRating =
    total > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
      : null;

  res.json({
    success: true,
    data: {
      reviews,
      total,
      avgRating: avgRating ? Number(avgRating) : null,
    },
  });
});

/**
 * @desc  Get review invites sent for admin's bookings
 * @route GET /api/reviews/admin
 * @access Private (Admin only)
 */
const getAdminReviews = asyncHandler(async (req, res) => {
  // Find all PG ids belonging to this admin
  const pgs = await PG.find({ adminId: req.admin._id }).select("_id");
  const pgIds = pgs.map((p) => p._id);

  const reviews = await Review.find({ pgId: { $in: pgIds } })
    .populate("pgId", "name")
    .populate("bookingId", "joinDate stayDays")
    .sort({ invitedAt: -1 });

  res.json({ success: true, data: reviews });
});

export {
  sendReviewInvite,
  getReviewByToken,
  submitReview,
  getPGReviews,
  getAdminReviews,
};
