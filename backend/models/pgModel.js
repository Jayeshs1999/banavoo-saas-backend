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

const amenitiesSchema = new mongoose.Schema(
  {
    // House Rules
    smokingAllowed:   { type: Boolean, default: false },
    drinkingAllowed:  { type: Boolean, default: false },
    cookingAllowed:   { type: Boolean, default: false },
    nonVegAllowed:    { type: Boolean, default: true  },
    guestsAllowed:    { type: Boolean, default: false },
    petsAllowed:      { type: Boolean, default: false },

    // Appliances & Comfort
    acAvailable:              { type: Boolean, default: false },
    fanAvailable:             { type: Boolean, default: true  },
    fridgeAvailable:          { type: Boolean, default: false },
    washingMachineAvailable:  { type: Boolean, default: false },
    tvAvailable:              { type: Boolean, default: false },
    wifiAvailable:            { type: Boolean, default: false },
    inverterAvailable:        { type: Boolean, default: false },

    // Bathroom / Toilet
    attachedBathroom:   { type: Boolean, default: false },
    attachedToilet:     { type: Boolean, default: false },
    sharedBathrooms:    { type: Number,  default: 0    },
    sharedToilets:      { type: Number,  default: 0    },
    geyserAvailable:    { type: Boolean, default: false },

    // Storage & Security
    lockerAvailable:    { type: Boolean, default: false },
    cctvAvailable:      { type: Boolean, default: false },
    securityGuard:      { type: Boolean, default: false },
    mainGateLock:       { type: Boolean, default: false },

    // Parking
    twoWheelerParking:  { type: Boolean, default: false },
    fourWheelerParking: { type: Boolean, default: false },

    // Food
    breakfastAvailable: { type: Boolean, default: false },
    lunchAvailable:     { type: Boolean, default: false },
    dinnerAvailable:    { type: Boolean, default: false },
    messAvailable:      { type: Boolean, default: false },

    // Other Facilities
    gallaryAvailable:       { type: Boolean, default: false },
    gymAvailable:           { type: Boolean, default: false },
    studyRoomAvailable:     { type: Boolean, default: false },
    powerBackup:            { type: Boolean, default: false },
    housekeepingAvailable:  { type: Boolean, default: false },
    bikeRental:             { type: Boolean, default: false },
  },
  { _id: false },
);

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
    amenities: {
      type: amenitiesSchema,
      default: () => ({}),
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
