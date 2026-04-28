const mongoose = require("mongoose");
const Order = require("../../models/orderModel");

const ALLOWED_GENDERS = ["men", "women"];

const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate, gender, billedBy } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    if (start > end) {
      return res
        .status(400)
        .json({ message: "startDate cannot be after endDate." });
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (gender && !ALLOWED_GENDERS.includes(gender)) {
      return res
        .status(400)
        .json({ message: "gender must be either 'men' or 'women'." });
    }

    const matchStage = {
      organizationId: new mongoose.Types.ObjectId(req.decoded.ordId),
      isDeleted: false,
      createdAt: { $gte: start, $lte: end },
    };

    if (billedBy && billedBy.trim() !== "") {
      matchStage.billedBy = billedBy.trim();
    }

    const lineItemPipeline = [
      { $match: matchStage },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      ...(gender ? [{ $match: { "productInfo.gender": gender } }] : []),
      {
        $group: {
          _id: null,
          grossRevenue: {
            $sum: {
              $multiply: ["$products.unit", "$products.perUnitCost"],
            },
          },
          totalUnitsSold: { $sum: "$products.unit" },
          orderIds: { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          _id: 0,
          grossRevenue: 1,
          totalUnitsSold: 1,
          totalOrders: { $size: "$orderIds" },
        },
      },
    ];

    const orderTotalsPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalNetRevenue: { $sum: "$amount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $project: { _id: 0, totalNetRevenue: 1, totalOrders: 1 } },
    ];

    const dailyTotalsPipeline = gender
      ? [
          { $match: matchStage },
          { $unwind: "$products" },
          {
            $lookup: {
              from: "products",
              localField: "products.productId",
              foreignField: "_id",
              as: "productInfo",
            },
          },
          { $unwind: "$productInfo" },
          { $match: { "productInfo.gender": gender } },
          {
            $group: {
              _id: {
                orderId: "$_id",
                day: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              grossRevenue: {
                $sum: {
                  $multiply: ["$products.unit", "$products.perUnitCost"],
                },
              },
              units: { $sum: "$products.unit" },
            },
          },
          {
            $group: {
              _id: "$_id.day",
              orders: { $sum: 1 },
              grossRevenue: { $sum: "$grossRevenue" },
              units: { $sum: "$units" },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              date: "$_id",
              orders: 1,
              grossRevenue: 1,
              units: 1,
            },
          },
        ]
      : [
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              orders: { $sum: 1 },
              netRevenue: { $sum: "$amount" },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: { _id: 0, date: "$_id", orders: 1, netRevenue: 1 },
          },
        ];

    const byBilledByPipeline = gender
      ? [
          { $match: matchStage },
          { $unwind: "$products" },
          {
            $lookup: {
              from: "products",
              localField: "products.productId",
              foreignField: "_id",
              as: "productInfo",
            },
          },
          { $unwind: "$productInfo" },
          { $match: { "productInfo.gender": gender } },
          {
            $group: {
              _id: {
                orderId: "$_id",
                billedBy: "$billedBy",
                day: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              grossRevenue: {
                $sum: {
                  $multiply: ["$products.unit", "$products.perUnitCost"],
                },
              },
              units: { $sum: "$products.unit" },
            },
          },
          {
            $group: {
              _id: { billedBy: "$_id.billedBy", day: "$_id.day" },
              orders: { $sum: 1 },
              grossRevenue: { $sum: "$grossRevenue" },
              units: { $sum: "$units" },
            },
          },
          { $sort: { "_id.day": 1 } },
          {
            $group: {
              _id: "$_id.billedBy",
              totalOrders: { $sum: "$orders" },
              grossRevenue: { $sum: "$grossRevenue" },
              totalUnitsSold: { $sum: "$units" },
              daily: {
                $push: {
                  date: "$_id.day",
                  orders: "$orders",
                  grossRevenue: "$grossRevenue",
                  units: "$units",
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              billedBy: "$_id",
              totalOrders: 1,
              grossRevenue: 1,
              totalUnitsSold: 1,
              daily: 1,
            },
          },
          { $sort: { billedBy: 1 } },
        ]
      : [
          { $match: matchStage },
          {
            $group: {
              _id: {
                billedBy: "$billedBy",
                day: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              orders: { $sum: 1 },
              netRevenue: { $sum: "$amount" },
            },
          },
          { $sort: { "_id.day": 1 } },
          {
            $group: {
              _id: "$_id.billedBy",
              totalOrders: { $sum: "$orders" },
              totalNetRevenue: { $sum: "$netRevenue" },
              daily: {
                $push: {
                  date: "$_id.day",
                  orders: "$orders",
                  netRevenue: "$netRevenue",
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              billedBy: "$_id",
              totalOrders: 1,
              totalNetRevenue: 1,
              daily: 1,
            },
          },
          { $sort: { billedBy: 1 } },
        ];

    const [
      lineItemResult,
      orderTotalsResult,
      byBilledByResult,
      dailyTotalsResult,
    ] = await Promise.all([
      Order.aggregate(lineItemPipeline),
      gender ? Promise.resolve([]) : Order.aggregate(orderTotalsPipeline),
      Order.aggregate(byBilledByPipeline),
      Order.aggregate(dailyTotalsPipeline),
    ]);

    const lineItemStats = lineItemResult[0] || {
      grossRevenue: 0,
      totalUnitsSold: 0,
      totalOrders: 0,
    };

    const response = {
      dateRange: { startDate: start, endDate: end },
      filter: { gender: gender || null, billedBy: billedBy || null },
      grossRevenue: lineItemStats.grossRevenue,
      totalUnitsSold: lineItemStats.totalUnitsSold,
      totalOrders: lineItemStats.totalOrders,
      daily: dailyTotalsResult,
      byBilledBy: byBilledByResult,
    };

    if (!gender) {
      const orderTotals = orderTotalsResult[0] || {
        totalNetRevenue: 0,
        totalOrders: 0,
      };
      response.totalNetRevenue = orderTotals.totalNetRevenue;
      response.totalOrders = orderTotals.totalOrders;
    }

    return res.status(200).json({
      message: "Statistics fetched successfully",
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { getStatistics };
