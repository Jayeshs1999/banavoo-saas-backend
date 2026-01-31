import asyncHandler from "../middleware/asyncHandler.js";
import Admin from "../models/adminModel.js";
import PG from "../models/pgModel.js";

// @desc    Get dashboard statistics for super admin
// @route   GET /api/super-admin/dashboard
// @access  Private (Super Admin only)
const getDashboardStats = asyncHandler(async (req, res) => {
  // Count admins by role
  const adminStats = await Admin.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  // Count PGs by status
  const pgStats = await PG.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Get total rooms, beds, and available beds
  const roomStats = await PG.aggregate([
    {
      $unwind: "$rooms",
    },
    {
      $group: {
        _id: null,
        totalRooms: { $sum: 1 },
        totalBeds: { $sum: "$rooms.beds.length" },
        allocatedBeds: {
          $sum: {
            $size: {
              $filter: {
                input: "$rooms.beds",
                as: "bed",
                cond: { $eq: ["$$bed.allocated", true] },
              },
            },
          },
        },
      },
    },
  ]);

  // Calculate occupancy rate
  const totalRooms = roomStats[0]?.totalRooms || 0;
  const totalBeds = roomStats[0]?.totalBeds || 0;
  const allocatedBeds = roomStats[0]?.allocatedBeds || 0;
  const occupancyRate =
    totalBeds > 0 ? ((allocatedBeds / totalBeds) * 100).toFixed(2) : 0;

  // Format admin stats
  const formattedAdminStats = {
    totalAdmins: adminStats.reduce((sum, stat) => sum + stat.count, 0),
    regularAdmins: adminStats.find((stat) => stat._id === "admin")?.count || 0,
    superAdmins:
      adminStats.find((stat) => stat._id === "super_admin")?.count || 0,
  };

  // Format PG stats
  const formattedPGStats = {
    totalPGs: pgStats.reduce((sum, stat) => sum + stat.count, 0),
    activePGs: pgStats.find((stat) => stat._id === "active")?.count || 0,
    inactivePGs: pgStats.find((stat) => stat._id === "inactive")?.count || 0,
  };

  res.json({
    adminStats: formattedAdminStats,
    pgStats: formattedPGStats,
    roomStats: {
      totalRooms,
      totalBeds,
      allocatedBeds,
      availableBeds: totalBeds - allocatedBeds,
      occupancyRate: parseFloat(occupancyRate),
    },
  });
});

// @desc    Get list of all admins
// @route   GET /api/super-admin/admins
// @access  Private (Super Admin only)
const getAdminsList = asyncHandler(async (req, res) => {
  const admins = await Admin.find({})
    .select("-password -verificationToken -passwordResetToken")
    .sort({ createdAt: -1 });

  res.json(admins);
});

// @desc    Get list of all PGs with admin details and statistics
// @route   GET /api/super-admin/pgs
// @access  Private (Super Admin only)
const getPGsList = asyncHandler(async (req, res) => {
  const pgs = await PG.aggregate([
    {
      $lookup: {
        from: "admins",
        localField: "adminId",
        foreignField: "_id",
        as: "admin",
      },
    },
    {
      $unwind: "$admin",
    },
    {
      $addFields: {
        totalRooms: { $size: "$rooms" },
        totalBeds: {
          $sum: {
            $map: {
              input: "$rooms",
              as: "room",
              in: { $size: "$$room.beds" },
            },
          },
        },
        allocatedBeds: {
          $sum: {
            $map: {
              input: "$rooms",
              as: "room",
              in: {
                $size: {
                  $filter: {
                    input: "$$room.beds",
                    as: "bed",
                    cond: { $eq: ["$$bed.allocated", true] },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        occupancyRate: {
          $cond: [
            { $eq: ["$totalBeds", 0] },
            0,
            {
              $multiply: [{ $divide: ["$allocatedBeds", "$totalBeds"] }, 100],
            },
          ],
        },
      },
    },
    {
      $project: {
        admin: {
          _id: 1,
          pgName: 1,
          ownerName: 1,
          email: 1,
          mobile: 1,
          role: 1,
        },
        name: 1,
        photos: 1,
        status: 1,
        onlinePayment: 1,
        location: 1,
        totalRooms: 1,
        totalBeds: 1,
        allocatedBeds: 1,
        availableBeds: { $subtract: ["$totalBeds", "$allocatedBeds"] },
        occupancyRate: { $round: ["$occupancyRate", 2] },
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  res.json(pgs);
});

// @desc    Get location-based statistics
// @route   GET /api/super-admin/location-stats
// @access  Private (Super Admin only)
const getLocationStats = asyncHandler(async (req, res) => {
  const locationStats = await PG.aggregate([
    {
      $group: {
        _id: {
          state: "$location.state",
          city: "$location.city",
        },
        pgCount: { $sum: 1 },
        totalRooms: { $sum: { $size: "$rooms" } },
        totalBeds: {
          $sum: {
            $sum: {
              $map: {
                input: "$rooms",
                as: "room",
                in: { $size: "$$room.beds" },
              },
            },
          },
        },
        allocatedBeds: {
          $sum: {
            $sum: {
              $map: {
                input: "$rooms",
                as: "room",
                in: {
                  $size: {
                    $filter: {
                      input: "$$room.beds",
                      as: "bed",
                      cond: { $eq: ["$$bed.allocated", true] },
                    },
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
        totalPGs: { $sum: "$pgCount" },
        totalRooms: { $sum: "$totalRooms" },
        totalBeds: { $sum: "$totalBeds" },
        allocatedBeds: { $sum: "$allocatedBeds" },
      },
    },
    {
      $addFields: {
        availableBeds: { $subtract: ["$totalBeds", "$allocatedBeds"] },
        cities: {
          $map: {
            input: "$cities",
            as: "city",
            in: {
              city: "$$city.city",
              pgCount: "$$city.pgCount",
              totalRooms: "$$city.totalRooms",
              totalBeds: "$$city.totalBeds",
              allocatedBeds: "$$city.allocatedBeds",
              availableBeds: "$$city.availableBeds",
            },
          },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.json(locationStats);
});

export { getDashboardStats, getAdminsList, getPGsList, getLocationStats };
