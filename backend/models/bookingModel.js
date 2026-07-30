import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PG",
      required: [true, "PG ID is required"],
    },
    roomId: {
      type: String,
      required: [true, "Room ID is required"],
    },
    bedId: {
      type: String,
      required: [true, "Bed ID is required"],
    },
    joinDate: {
      type: Date,
      required: [true, "Join date is required"],
      validate: {
        // Only enforce "not in the past" when first creating the booking,
        // not on subsequent saves (status updates, cancellations, reschedules).
        validator: function (date) {
          return !this.isNew || date >= new Date();
        },
        message: "Join date cannot be in the past",
      },
    },
    stayDays: {
      type: Number,
      required: [true, "Stay days is required"],
      min: [1, "Stay days must be at least 1"],
      max: [365, "Stay days cannot exceed 365"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["online", "cash"],
      default: "cash",
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    adminNotes: {
      type: String,
      maxlength: [500, "Admin notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for booking end date
bookingSchema.virtual("endDate").get(function () {
  const endDate = new Date(this.joinDate);
  endDate.setDate(endDate.getDate() + this.stayDays);
  return endDate;
});

// Virtual for booking duration in months
bookingSchema.virtual("durationInMonths").get(function () {
  return Math.ceil(this.stayDays / 30);
});

// Index for efficient querying
bookingSchema.index({ userId: 1 });
bookingSchema.index({ pgId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ joinDate: 1 });

// Static method to find active bookings for a PG
bookingSchema.statics.findActiveBookingsForPG = function (pgId) {
  return this.find({
    pgId,
    status: { $in: ["pending", "approved"] },
    joinDate: { $lte: new Date() },
    $expr: {
      $gt: [
        {
          $add: [
            "$joinDate",
            { $multiply: ["$stayDays", 24 * 60 * 60 * 1000] },
          ],
        },
        new Date(),
      ],
    },
  });
};

// Static method to find bookings by user
bookingSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).populate("pgId").sort({ createdAt: -1 });
};

// Static method to find bookings by PG
bookingSchema.statics.findByPG = function (pgId) {
  return this.find({ pgId }).populate("userId").sort({ createdAt: -1 });
};

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
