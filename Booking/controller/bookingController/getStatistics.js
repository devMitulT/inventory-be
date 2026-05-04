const mongoose = require("mongoose");
const Order = require("../../models/orderModel");

const ALLOWED_GENDERS = ["men", "women"];

/** @returns {string|null} */
function normalizeGenderQuery(gender) {
  if (gender === undefined || gender === null) return null;
  const s = String(gender).trim().toLowerCase();
  return s || null;
}

function buildOrdersAndRevenuePipeline(matchStage) {
  return [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        totalOrders: { $sum: 1 },
      },
    },
    { $project: { _id: 0, totalRevenue: 1, totalOrders: 1 } },
  ];
}

function buildTotalProductSellPipeline(matchStage) {
  return [
    { $match: matchStage },
    { $unwind: "$products" },
    {
      $group: {
        _id: null,
        totalProductSell: { $sum: "$products.unit" },
      },
    },
    { $project: { _id: 0, totalProductSell: 1 } },
  ];
}

const getStatistics = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      genderType: genderTypeRaw,
      billedBy: billedByRaw,
    } = req.query;

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

    const genderType = normalizeGenderQuery(genderTypeRaw);
    if (genderType && !ALLOWED_GENDERS.includes(genderType)) {
      return res.status(400).json({
        message: `genderType must be one of: ${ALLOWED_GENDERS.join(", ")}.`,
        allowedGenderTypes: ALLOWED_GENDERS,
      });
    }

    const matchStage = {
      organizationId: new mongoose.Types.ObjectId(req.decoded.ordId),
      isDeleted: false,
      createdAt: { $gte: start, $lte: end },
    };
    if (genderType) {
      matchStage.genderType = genderType;
    }
    if (billedByRaw != null && String(billedByRaw).trim() !== "") {
      matchStage.billedBy = String(billedByRaw).trim();
    }

    const [ordersAndRevenueResult, totalProductSellResult] = await Promise.all([
      Order.aggregate(buildOrdersAndRevenuePipeline(matchStage)),
      Order.aggregate(buildTotalProductSellPipeline(matchStage)),
    ]);

    const ordersAndRevenue = ordersAndRevenueResult[0] || {
      totalOrders: 0,
      totalRevenue: 0,
    };
    const productSell = totalProductSellResult[0] || { totalProductSell: 0 };

    const response = {
      dateRange: { startDate: start, endDate: end },
      filter: {
        genderType,
        billedBy:
          billedByRaw != null && String(billedByRaw).trim() !== ""
            ? String(billedByRaw).trim()
            : null,
        allowedGenderTypes: ALLOWED_GENDERS,
      },
      totalOrders: ordersAndRevenue.totalOrders,
      totalRevenue: ordersAndRevenue.totalRevenue,
      totalProductSell: productSell.totalProductSell,
    };

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
