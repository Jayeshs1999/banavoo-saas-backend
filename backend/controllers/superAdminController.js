import asyncHandler from "../middleware/asyncHandler.js";
import Admin from "../models/adminModel.js";
import User from "../models/userModel.js";
import Booking from "../models/bookingModel.js";
import PG from "../models/pgModel.js";

/* ─── helpers ────────────────────────────────────────────────────────────── */
const parsePage = (v, def = 1)  => Math.max(1, parseInt(v) || def);
const parseLimit = (v, def = 10) => Math.min(100, Math.max(1, parseInt(v) || def));

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Platform KPI stats (no pagination)
// @route   GET /api/super-admin/dashboard
// @access  Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardStats = asyncHandler(async (req, res) => {
  const [adminStats, pgStats, roomStats, bookingStats, revenueStats] =
    await Promise.all([
      Admin.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      PG.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      PG.aggregate([
        {
          $addFields: {
            totalBeds: {
              $sum: { $map: { input: "$structure", as: "r", in: { $size: "$$r.beds" } } },
            },
            allocatedBeds: {
              $sum: {
                $map: {
                  input: "$structure",
                  as: "r",
                  in: {
                    $size: {
                      $filter: { input: "$$r.beds", as: "b", cond: { $eq: ["$$b.allocated", true] } },
                    },
                  },
                },
              },
            },
            totalRooms: { $size: "$structure" },
          },
        },
        {
          $group: {
            _id: null,
            totalRooms:    { $sum: "$totalRooms"    },
            totalBeds:     { $sum: "$totalBeds"     },
            allocatedBeds: { $sum: "$allocatedBeds" },
          },
        },
      ]),
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
    ]);

  const totalBeds     = roomStats[0]?.totalBeds     || 0;
  const allocatedBeds = roomStats[0]?.allocatedBeds || 0;

  res.json({
    adminStats: {
      totalAdmins:   adminStats.reduce((s, x) => s + x.count, 0),
      regularAdmins: adminStats.find((x) => x._id === "admin")?.count       || 0,
      superAdmins:   adminStats.find((x) => x._id === "super_admin")?.count || 0,
    },
    pgStats: {
      totalPGs:    pgStats.reduce((s, x) => s + x.count, 0),
      activePGs:   pgStats.find((x) => x._id === "active")?.count   || 0,
      inactivePGs: pgStats.find((x) => x._id === "inactive")?.count || 0,
    },
    roomStats: {
      totalRooms:    roomStats[0]?.totalRooms || 0,
      totalBeds,
      allocatedBeds,
      availableBeds: totalBeds - allocatedBeds,
      occupancyRate: totalBeds > 0
        ? parseFloat(((allocatedBeds / totalBeds) * 100).toFixed(2))
        : 0,
    },
    bookingStats: {
      total:     bookingStats.reduce((s, x) => s + x.count, 0),
      pending:   bookingStats.find((x) => x._id === "pending")?.count   || 0,
      approved:  bookingStats.find((x) => x._id === "approved")?.count  || 0,
      rejected:  bookingStats.find((x) => x._id === "rejected")?.count  || 0,
      cancelled: bookingStats.find((x) => x._id === "cancelled")?.count || 0,
      totalRevenue: revenueStats[0]?.total || 0,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Paginated + searchable list of PG-owner admins
// @route   GET /api/super-admin/admins?page=&limit=&search=
// @access  Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getAdminsList = asyncHandler(async (req, res) => {
  const page   = parsePage(req.query.page);
  const limit  = parseLimit(req.query.limit);
  const search = (req.query.search || "").trim();

  const filter = search
    ? {
        $or: [
          { ownerName: { $regex: search, $options: "i" } },
          { pgName:    { $regex: search, $options: "i" } },
          { email:     { $regex: search, $options: "i" } },
          { mobile:    { $regex: search, $options: "i" } },
          { "address.city":  { $regex: search, $options: "i" } },
          { "address.state": { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [total, data] = await Promise.all([
    Admin.countDocuments(filter),
    Admin.find(filter)
      .select("-password -verificationToken -passwordResetToken")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Paginated + searchable PG list with occupancy stats
// @route   GET /api/super-admin/pgs?page=&limit=&search=
// @access  Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getPGsList = asyncHandler(async (req, res) => {
  const page   = parsePage(req.query.page);
  const limit  = parseLimit(req.query.limit);
  const search = (req.query.search || "").trim();

  // Build a match stage for the search (runs before $lookup for name/location)
  const matchStage = search
    ? {
        $match: {
          $or: [
            { name:             { $regex: search, $options: "i" } },
            { "location.city":  { $regex: search, $options: "i" } },
            { "location.state": { $regex: search, $options: "i" } },
          ],
        },
      }
    : null;

  const pipeline = [
    ...(matchStage ? [matchStage] : []),
    {
      $lookup: {
        from: "admins",
        localField: "adminId",
        foreignField: "_id",
        as: "admin",
      },
    },
    { $unwind: { path: "$admin", preserveNullAndEmptyArrays: true } },
    // post-lookup search on owner name
    ...(search
      ? [
          {
            $match: {
              $or: [
                { name:               { $regex: search, $options: "i" } },
                { "location.city":    { $regex: search, $options: "i" } },
                { "location.state":   { $regex: search, $options: "i" } },
                { "admin.ownerName":  { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),
    {
      $addFields: {
        totalRooms: { $size: "$structure" },
        totalBeds: {
          $sum: { $map: { input: "$structure", as: "r", in: { $size: "$$r.beds" } } },
        },
        allocatedBeds: {
          $sum: {
            $map: {
              input: "$structure",
              as: "r",
              in: {
                $size: {
                  $filter: { input: "$$r.beds", as: "b", cond: { $eq: ["$$b.allocated", true] } },
                },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        availableBeds: { $subtract: ["$totalBeds", "$allocatedBeds"] },
        occupancyRate: {
          $cond: [
            { $eq: ["$totalBeds", 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ["$allocatedBeds", "$totalBeds"] }, 100] }, 2] },
          ],
        },
      },
    },
    {
      $project: {
        "admin._id": 1, "admin.ownerName": 1, "admin.email": 1, "admin.mobile": 1,
        name: 1, status: 1, onlinePayment: 1, location: 1,
        totalRooms: 1, totalBeds: 1, allocatedBeds: 1, availableBeds: 1, occupancyRate: 1,
        createdAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ];

  // Count total matching docs
  const countPipeline = [...pipeline, { $count: "total" }];
  const [countResult, data] = await Promise.all([
    PG.aggregate(countPipeline),
    PG.aggregate([...pipeline, { $skip: (page - 1) * limit }, { $limit: limit }]),
  ]);

  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Location stats (no pagination — aggregated rows are small)
// @route   GET /api/super-admin/location-stats?search=
// @access  Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getLocationStats = asyncHandler(async (req, res) => {
  const search = (req.query.search || "").trim();

  const matchStage = search
    ? {
        $match: {
          $or: [
            { "location.state": { $regex: search, $options: "i" } },
            { "location.city":  { $regex: search, $options: "i" } },
          ],
        },
      }
    : null;

  const pipeline = [
    ...(matchStage ? [matchStage] : []),
    {
      $group: {
        _id: { state: "$location.state", city: "$location.city" },
        pgCount:    { $sum: 1 },
        totalRooms: { $sum: { $size: "$structure" } },
        totalBeds: {
          $sum: { $sum: { $map: { input: "$structure", as: "r", in: { $size: "$$r.beds" } } } },
        },
        allocatedBeds: {
          $sum: {
            $sum: {
              $map: {
                input: "$structure",
                as: "r",
                in: {
                  $size: {
                    $filter: { input: "$$r.beds", as: "b", cond: { $eq: ["$$b.allocated", true] } },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: "$_id.state",
        cities: {
          $push: {
            city: "$_id.city",
            pgCount: "$pgCount",
            totalRooms: "$totalRooms",
            totalBeds: "$totalBeds",
            allocatedBeds: "$allocatedBeds",
            availableBeds: { $subtract: ["$totalBeds", "$allocatedBeds"] },
          },
        },
        totalPGs:      { $sum: "$pgCount"    },
        totalRooms:    { $sum: "$totalRooms" },
        totalBeds:     { $sum: "$totalBeds"  },
        allocatedBeds: { $sum: "$allocatedBeds" },
      },
    },
    {
      $addFields: {
        availableBeds: { $subtract: ["$totalBeds", "$allocatedBeds"] },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const data = await PG.aggregate(pipeline);
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Paginated + searchable registered users
// @route   GET /api/super-admin/users?page=&limit=&search=
// @access  Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getUsersList = asyncHandler(async (req, res) => {
  const page   = parsePage(req.query.page);
  const limit  = parseLimit(req.query.limit);
  const search = (req.query.search || "").trim();

  const filter = search
    ? {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName:  { $regex: search, $options: "i" } },
          { email:     { $regex: search, $options: "i" } },
          { mobile:    { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [total, data] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select("-password -verificationToken -passwordResetToken")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Paginated + searchable bookings with summary stats
// @route   GET /api/super-admin/bookings?page=&limit=&search=&status=
// @access  Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getBookingsList = asyncHandler(async (req, res) => {
  const page   = parsePage(req.query.page);
  const limit  = parseLimit(req.query.limit);
  const search = (req.query.search || "").trim();
  const status = req.query.status || "";

  // First: find matching user/PG IDs for the search term
  let userIds = [];
  let pgIds   = [];
  if (search) {
    const [matchUsers, matchPGs] = await Promise.all([
      User.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName:  { $regex: search, $options: "i" } },
          { email:     { $regex: search, $options: "i" } },
        ],
      }).select("_id"),
      PG.find({ name: { $regex: search, $options: "i" } }).select("_id"),
    ]);
    userIds = matchUsers.map((u) => u._id);
    pgIds   = matchPGs.map((p)   => p._id);
  }

  const filter = {};
  if (status) filter.status = status;
  if (search && (userIds.length || pgIds.length)) {
    filter.$or = [
      ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
      ...(pgIds.length   ? [{ pgId:   { $in: pgIds   } }] : []),
    ];
  } else if (search && !userIds.length && !pgIds.length) {
    // Search term found no users/PGs → empty result
    return res.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  const [total, data, statusStats, revenueStats] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("pgId",   "name location")
      .populate("userId", "firstName lastName email"),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: {
      pending:      statusStats.find((s) => s._id === "pending")?.count   || 0,
      approved:     statusStats.find((s) => s._id === "approved")?.count  || 0,
      rejected:     statusStats.find((s) => s._id === "rejected")?.count  || 0,
      cancelled:    statusStats.find((s) => s._id === "cancelled")?.count || 0,
      totalRevenue: revenueStats[0]?.total || 0,
    },
  });
});

export {
  getDashboardStats,
  getAdminsList,
  getPGsList,
  getLocationStats,
  getUsersList,
  getBookingsList,
};
