import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PG",
      required: [true, "PG ID is required"],
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking ID is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Stored so the review page can show context without auth
    reviewerName: {
      type: String,
      required: [true, "Reviewer name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    rating: {
      type: Number,
      required: false,
      min: [1, "Minimum rating is 1"],
      max: [5, "Maximum rating is 5"],
      default: null,
    },
    comment: {
      type: String,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      default: "",
    },
    // One-time token sent via email; cleared after use
    inviteToken: {
      type: String,
      required: true,
      unique: true,
    },
    inviteUsed: {
      type: Boolean,
      default: false,
    },
    // When the admin sent the invite
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    // When the user submitted the review
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Each booking gets at most one review
reviewSchema.index({ bookingId: 1 }, { unique: true });
reviewSchema.index({ pgId: 1 });
reviewSchema.index({ inviteToken: 1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
