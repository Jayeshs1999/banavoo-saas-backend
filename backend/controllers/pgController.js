import asyncHandler from "../middleware/asyncHandler.js";
import PG from "../models/pgModel.js";
import Admin from "../models/adminModel.js";

/**
 * @desc    Create a new PG
 * @route   POST /api/pgs
 * @access  Private (Admin only)
 */
const createPG = asyncHandler(async (req, res) => {
  const {
    name,
    photos = [],
    structure,
    onlinePayment = false,
    location,
    isPrivate = false,
    amenities = {},
  } = req.body;

  // Validate required fields
  if (!name || !structure || !location) {
    return res.status(400).json({
      success: false,
      message: "Name, structure, and location are required",
    });
  }

  // Validate structure
  if (!Array.isArray(structure) || structure.length === 0) {
    return res.status(400).json({
      success: false,
      message: "PG must have at least one room",
    });
  }

  // Validate each room in structure
  for (const room of structure) {
    if (
      !room.name ||
      !room.beds ||
      !Array.isArray(room.beds) ||
      room.beds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Each room must have a name and at least one bed",
      });
    }

    // Validate each bed in room
    for (const bed of room.beds) {
      if (typeof bed.price !== "number" || bed.price < 0) {
        return res.status(400).json({
          success: false,
          message: "Each bed must have a valid price",
        });
      }
    }
  }

  // Validate location
  if (
    !location.subcity ||
    !location.city ||
    !location.state ||
    !location.country ||
    !location.pin
  ) {
    return res.status(400).json({
      success: false,
      message: "Location must include subcity, city, state, pin and country",
    });
  }

  // Create new PG
  const pg = new PG({
    name,
    photos,
    structure,
    onlinePayment,
    location,
    adminId: req.admin._id,
    isPrivate,
    amenities,
  });

  const createdPG = await pg.save();

  res.status(201).json({
    success: true,
    message: "PG created successfully",
    data: createdPG,
  });
});

/**
 * @desc    Get all PGs (Admin only - with populated data)
 * @route   GET /api/pgs
 * @access  Private (Admin only)
 */
const getPGs = asyncHandler(async (req, res) => {
  const pgs = await PG.find({})
    .populate("adminId", "pgName ownerName email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: pgs,
  });
});

/**
 * @desc    Get all public PGs with optional filtering + server-side pagination
 * @route   GET /api/pgs/public
 * @query   page, limit, search, city, subcity, state, minPrice, maxPrice,
 *          onlinePayment, availableOnly, amenities (comma-separated keys), sortBy
 * @access  Public
 */
const getPublicPGs = asyncHandler(async (req, res) => {
  const {
    page        = 1,
    limit       = 9,
    search      = "",
    city        = "",
    subcity     = "",
    state       = "",
    minPrice    = "",
    maxPrice    = "",
    onlinePayment = "",
    availableOnly = "",
    amenities   = "",    // e.g. "wifiAvailable,acAvailable"
    sortBy      = "default",
  } = req.query;

  // ── Base filter: never return private PGs ──────────────────────────────
  const filter = { isPrivate: { $ne: true } };

  // ── Text search across name + location ────────────────────────────────
  if (search) {
    const re = { $regex: search, $options: "i" };
    filter.$or = [
      { name: re },
      { "location.city": re },
      { "location.subcity": re },
      { "location.state": re },
    ];
  }

  // ── Location filters ───────────────────────────────────────────────────
  if (city)    filter["location.city"]    = { $regex: city,    $options: "i" };
  if (subcity) filter["location.subcity"] = { $regex: subcity, $options: "i" };
  if (state)   filter["location.state"]   = { $regex: state,   $options: "i" };

  // ── Online payment ─────────────────────────────────────────────────────
  if (onlinePayment === "true") filter.onlinePayment = true;

  // ── Amenity filters — each must be true ───────────────────────────────
  if (amenities) {
    amenities.split(",").forEach((key) => {
      const k = key.trim();
      if (k) filter[`amenities.${k}`] = true;
    });
  }

  // ── Sort ───────────────────────────────────────────────────────────────
  let sort = { createdAt: -1 };
  if (sortBy === "name_asc")  sort = { name: 1 };
  if (sortBy === "name_desc") sort = { name: -1 };
  // price / beds sorts are applied post-query (computed fields)

  // ── Pagination ─────────────────────────────────────────────────────────
  const pageNum  = Math.max(1, parseInt(page)  || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 9));

  let pgs = await PG.find(filter)
    .populate("adminId", "pgName ownerName email")
    .sort(sort)
    .lean();   // lean() for faster reads; we compute virtual fields manually

  // ── Attach computed fields ─────────────────────────────────────────────
  pgs = pgs.map((pg) => {
    const totalBeds     = pg.structure.reduce((s, r) => s + r.beds.length, 0);
    const availableBeds = pg.structure.reduce((s, r) => s + r.beds.filter((b) => !b.allocated).length, 0);
    const minPriceVal   = pg.structure.length
      ? Math.min(...pg.structure.map((r) => r.price))
      : 0;
    return { ...pg, _availableBeds: availableBeds, _totalBeds: totalBeds, _minPrice: minPriceVal };
  });

  // ── Post-query filters (need computed fields) ──────────────────────────
  if (availableOnly === "true") {
    pgs = pgs.filter((pg) => pg._availableBeds > 0);
  }
  if (minPrice) pgs = pgs.filter((pg) => pg._minPrice >= parseFloat(minPrice));
  if (maxPrice) pgs = pgs.filter((pg) => pg._minPrice <= parseFloat(maxPrice));

  // ── Post-query sort ────────────────────────────────────────────────────
  if (sortBy === "price_asc")  pgs.sort((a, b) => a._minPrice - b._minPrice);
  if (sortBy === "price_desc") pgs.sort((a, b) => b._minPrice - a._minPrice);
  if (sortBy === "beds_desc")  pgs.sort((a, b) => b._availableBeds - a._availableBeds);

  // ── Paginate ───────────────────────────────────────────────────────────
  const total      = pgs.length;
  const totalPages = Math.ceil(total / limitNum);
  const skip       = (pageNum - 1) * limitNum;
  const paginated  = pgs.slice(skip, skip + limitNum);

  res.json({
    success: true,
    data: paginated,
    pagination: {
      page:       pageNum,
      limit:      limitNum,
      total,
      totalPages,
      hasMore:    pageNum < totalPages,
    },
  });
});

/**
 * @desc    Get PG by ID (Public - for users)
 * @route   GET /api/pgs/public/:id
 * @access  Public
 */
const getPublicPGById = asyncHandler(async (req, res) => {
  const pg = await PG.findById(req.params.id).populate(
    "adminId",
    "pgName ownerName email mobile",
  );

  if (!pg || pg.isPrivate) {
    return res.status(404).json({
      success: false,
      message: "PG not found",
    });
  }

  res.json({
    success: true,
    data: pg,
  });
});

/**
 * @desc    Get PGs for authenticated admin
 * @route   GET /api/pgs/admin
 * @access  Private (Admin only)
 */
const getAdminPGs = asyncHandler(async (req, res) => {
  const pgs = await PG.find({ adminId: req.admin._id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: pgs,
  });
});

/**
 * @desc    Get PG by ID
 * @route   GET /api/pgs/:id
 * @access  Private (Admin only)
 */
const getPGById = asyncHandler(async (req, res) => {
  const pg = await PG.findById(req.params.id).populate(
    "adminId",
    "pgName ownerName email",
  );

  if (!pg) {
    return res.status(404).json({
      success: false,
      message: "PG not found",
    });
  }

  // Check if admin owns this PG
  if (pg.adminId._id.toString() !== req.admin._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this PG",
    });
  }

  res.json({
    success: true,
    data: pg,
  });
});

/**
 * @desc    Update PG
 * @route   PUT /api/pgs/:id
 * @access  Private (Admin only)
 */
const updatePG = asyncHandler(async (req, res) => {
  const { name, photos, structure, onlinePayment, location, isPrivate, amenities } = req.body;

  const pg = await PG.findById(req.params.id);

  if (!pg) {
    return res.status(404).json({
      success: false,
      message: "PG not found",
    });
  }

  // Check if admin owns this PG
  if (pg.adminId.toString() !== req.admin._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this PG",
    });
  }

  // Update fields if provided
  if (name) pg.name = name;
  if (photos !== undefined) pg.photos = photos;
  if (structure) pg.structure = structure;
  if (onlinePayment !== undefined) pg.onlinePayment = onlinePayment;
  if (location) pg.location = location;
  if (isPrivate !== undefined) pg.isPrivate = isPrivate;
  if (amenities !== undefined) pg.amenities = { ...pg.amenities?.toObject?.() ?? {}, ...amenities };
  // lat/lng are embedded inside location — already handled by `if (location) pg.location = location`

  const updatedPG = await pg.save();

  res.json({
    success: true,
    message: "PG updated successfully",
    data: updatedPG,
  });
});

/**
 * @desc    Delete PG
 * @route   DELETE /api/pgs/:id
 * @access  Private (Admin only)
 */
const deletePG = asyncHandler(async (req, res) => {
  const pg = await PG.findById(req.params.id);

  if (!pg) {
    return res.status(404).json({
      success: false,
      message: "PG not found",
    });
  }

  // Check if admin owns this PG
  if (pg.adminId.toString() !== req.admin._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this PG",
    });
  }

  await PG.deleteOne({ _id: req.params.id });

  res.json({
    success: true,
    message: "PG deleted successfully",
  });
});

/**
 * @desc    Search PGs by location
 * @route   GET /api/pgs/search
 * @access  Private (Admin only)
 */
const searchPGs = asyncHandler(async (req, res) => {
  const { city, subcity, state } = req.query;

  const filter = {};

  if (city) filter["location.city"] = { $regex: city, $options: "i" };
  if (subcity) filter["location.subcity"] = { $regex: subcity, $options: "i" };
  if (state) filter["location.state"] = { $regex: state, $options: "i" };

  const pgs = await PG.find(filter)
    .populate("adminId", "pgName ownerName email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: pgs,
  });
});

export {
  createPG,
  getPGs,
  getPublicPGs,
  getPublicPGById,
  getAdminPGs,
  getPGById,
  updatePG,
  deletePG,
  searchPGs,
};
