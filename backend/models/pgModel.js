import mongoose from "mongoose";

const bedSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  allocated: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
});

const roomSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, "Room name is required"],
    trim: true,
  },
  beds: {
    type: [bedSchema],
    required: [true, "At least one bed is required"],
    validate: {
      validator: function (beds) {
        return beds.length > 0;
      },
      message: "At least one bed is required",
    },
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
  },
  pricingPeriod: {
    type: String,
    enum: ["day", "month"],
    default: "month",
  },
});

const locationSchema = new mongoose.Schema({
  subcity: {
    type: String,
    required: [true, "Subcity is required"],
    trim: true,
  },
  city: {
    type: String,
    required: [true, "City is required"],
    trim: true,
  },
  state: {
    type: String,
    required: [true, "State is required"],
    trim: true,
  },
  country: {
    type: String,
    required: [true, "Country is required"],
    trim: true,
    default: "India",
  },
  pin: {
    type: String,
    required: [true, "Pin code is required"],
    trim: true,
  },
});

const pgSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "PG name is required"],
      trim: true,
      maxlength: [100, "PG name cannot be more than 100 characters"],
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Admin ID is required"],
    },
    photos: {
      type: [String],
      default: [],
    },
    structure: {
      type: [roomSchema],
      required: [true, "PG structure is required"],
      validate: {
        validator: function (structure) {
          return structure.length > 0;
        },
        message: "At least one room is required",
      },
    },
    onlinePayment: {
      type: Boolean,
      default: false,
    },
    location: {
      type: locationSchema,
      required: [true, "Location is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for total available beds
pgSchema.virtual("totalAvailableBeds").get(function () {
  return this.structure.reduce((total, room) => {
    return total + room.beds.filter((bed) => !bed.allocated).length;
  }, 0);
});

// Virtual for total beds
pgSchema.virtual("totalBeds").get(function () {
  return this.structure.reduce((total, room) => {
    return total + room.beds.length;
  }, 0);
});

// Virtual for total rooms
pgSchema.virtual("totalRooms").get(function () {
  return this.structure.length;
});

// Method to check if a bed is available
pgSchema.methods.isBedAvailable = function (roomId, bedId) {
  const room = this.structure.find((r) => r.id === roomId);
  if (!room) return false;

  const bed = room.beds.find((b) => b.id === bedId);
  return bed && !bed.allocated;
};

// Method to allocate a bed
pgSchema.methods.allocateBed = function (roomId, bedId) {
  const room = this.structure.find((r) => r.id === roomId);
  if (!room) return false;

  const bed = room.beds.find((b) => b.id === bedId);
  if (bed && !bed.allocated) {
    bed.allocated = true;
    return true;
  }
  return false;
};

// Method to deallocate a bed
pgSchema.methods.deallocateBed = function (roomId, bedId) {
  const room = this.structure.find((r) => r.id === roomId);
  if (!room) return false;

  const bed = room.beds.find((b) => b.id === bedId);
  if (bed && bed.allocated) {
    bed.allocated = false;
    return true;
  }
  return false;
};

// Method to get bed price
pgSchema.methods.getBedPrice = function (roomId, bedId) {
  const room = this.structure.find((r) => r.id === roomId);
  if (!room) return null;

  const bed = room.beds.find((b) => b.id === bedId);
  return bed ? bed.price : null;
};

const PG = mongoose.model("PG", pgSchema);

export default PG;
