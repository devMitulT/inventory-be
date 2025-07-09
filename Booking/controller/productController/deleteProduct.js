const Product = require("../../models/productModel");

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findOneAndUpdate(
      { _id: id, organizationId: req.decoded.ordId },
      { isDeleted: true },
      { new: true }
    );

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res
      .status(200)
      .json({ message: "Product deleted successfully", data: deletedProduct });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { deleteProduct };
