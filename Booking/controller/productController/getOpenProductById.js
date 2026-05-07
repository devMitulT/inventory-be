const Product = require("../../models/productModel");
const isValidMongoId = require("../../../utils/validateMongoId");

const getOpenProductById = async (req, res) => {
  try {
    const { orgId, id: productId } = req.params;

    if (!isValidMongoId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (!isValidMongoId(orgId)) {
      return res.status(400).json({ message: "Invalid orgId" });
    }

    const product = await Product.findOne({
      _id: productId,
      organizationId: orgId,
      isDeleted: false,
    }).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Open product fetched successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { getOpenProductById };

