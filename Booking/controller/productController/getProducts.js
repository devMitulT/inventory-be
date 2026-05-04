const { default: mongoose } = require("mongoose");
const Product = require("../../models/productModel");

const ALLOWED_GENDERS = ["men", "women"];

const getProducts = async (req, res) => {
  try {
    const organizationId = req.decoded.ordId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sku = req.query.sku 
    const skip = (page - 1) * limit;
    const isDeleted = req.query.isDeleted;
    const genderRaw = req.query.gender;

    const gender =
      genderRaw != null && String(genderRaw).trim() !== ""
        ? String(genderRaw).trim().toLowerCase()
        : null;
    if (gender && !ALLOWED_GENDERS.includes(gender)) {
      return res.status(400).json({
        message: `gender must be one of: ${ALLOWED_GENDERS.join(", ")}.`,
        allowedGenders: ALLOWED_GENDERS,
      });
    }

    const matchStage = {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        isDeleted: isDeleted ? true : false,
        ...(sku && { sku: { $regex: sku, $options: "i" } }),
        ...(gender && { gender }),
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
