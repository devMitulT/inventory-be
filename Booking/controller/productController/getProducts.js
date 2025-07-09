const { default: mongoose } = require("mongoose");
const Product = require("../../models/productModel");

const getProducts = async (req, res) => {
  try {
    const organizationId = req.decoded.ordId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchStage = {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        isDeleted: false,
      },
    };

    const facetStage = {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        totalCount: [{ $count: "count" }],
      },
    };

    const result = await Product.aggregate([matchStage, facetStage]);
    const products = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: "Products fetched successfully",
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { getProducts };
