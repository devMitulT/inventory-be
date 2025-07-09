const Product = require("../../models/productModel");

const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const restoreProduct = await Product.findOneAndUpdate(
      { _id: id, organizationId: req.decoded.ordId },
      { isDeleted: false }
    );

    if (!restoreProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product has been successfully restored !",
      data: restoreProduct,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { restoreProduct };
