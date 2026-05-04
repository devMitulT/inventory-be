const { default: mongoose } = require("mongoose");
const Order = require("../../models/orderModel");

const ALLOWED_GENDER_TYPES = ["men", "women"];

const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      fromDate,
      toDate,
      billedBy,
      genderType: genderTypeRaw,
    } = req.query;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;
    const primaryPhn = req.query.primaryPhn;

    const matchStage = {
      organizationId: new mongoose.Types.ObjectId(req.decoded.ordId),
      isDeleted: false,
    };

    if (fromDate && toDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (billedBy && billedBy.trim() !== "") {
      matchStage.billedBy = billedBy;
    }

    if (genderTypeRaw != null && String(genderTypeRaw).trim() !== "") {
      const genderType = String(genderTypeRaw).trim().toLowerCase();
      if (!ALLOWED_GENDER_TYPES.includes(genderType)) {
        return res.status(400).json({
          message: `genderType must be one of: ${ALLOWED_GENDER_TYPES.join(", ")}.`,
        });
      }
      matchStage.genderType = genderType;
    }

    const aggregationPipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(primaryPhn
        ? [
            {
              $match: {
                "customer.phoneNumberPrimary": {
                  $regex: primaryPhn,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      { $unwind: "$products" },

      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "products.productId",
        },
      },
      {
        $unwind: "$products.productId",
      },

      {
        $group: {
          _id: "$_id",
          products: { $push: "$products" },
          customer: { $first: "$customer" },
          notes: { $first: "$notes" },
          gstRate: { $first: "$gstRate" },
          isDeleted: { $first: "$isDeleted" },
          amount: { $first: "$amount" },
          organizationId: { $first: "$organizationId" },
          invoiceNumber: { $first: "$invoiceNumber" },
          discountAmount : {$first: "$discountAmount"},
          discountType : {$first: "$discountType"},
          billedBy: { $first: "$billedBy" },
          genderType: { $first: "$genderType" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          __v: { $first: "$__v" },
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
    ];

    // Count total matching bookings
    const countPipeline = [{ $match: matchStage }, { $count: "total" }];

    const [data, countResult] = await Promise.all([
      Order.aggregate(aggregationPipeline),
      Order.aggregate(countPipeline),
    ]);

    const totalBookings = countResult[0]?.total || 0;

    res.status(200).json({
      message: "Order fetched successfully",
      data,
      pagination: {
        total: totalBookings,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalBookings / pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { getAllOrders };
