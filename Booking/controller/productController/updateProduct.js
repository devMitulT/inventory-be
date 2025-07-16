const { base } = require("../../models/notificationModel");
const Product = require("../../models/productModel");

const isValidSKU = (sku) => /^[A-Z0-9\-_]{3,40}$/.test(sku);
const isValidName = (name) => /^[\w\s\-(),.&']{3,100}$/.test(name);
const isValidDescription = (desc) => desc.length >= 10 && desc.length <= 1000;

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      perUnitCost,
      sku,
      stock,
      measurementType,
      thresholdStock,
      colour,
    } = req.body;

    if (
      !name ||
      !description ||
      !perUnitCost ||
      !sku ||
      !stock ||
      !measurementType ||
      !thresholdStock ||
      !colour
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isValidName(name)) {
      return res.status(400).json({
        message: "Invalid product name format or length (3–100 characters)",
      });
    }

    if (Number(stock) < Number(thresholdStock)) {
      return res.status(400).json({
        message: "Threshold Stock must be less then Stock count",
      });
    }

    if (!isValidDescription(description)) {
      return res.status(400).json({
        message: "Description must be between 10 and 1000 characters",
      });
    }

    if (isNaN(perUnitCost) || Number(perUnitCost) < 0) {
      return res
        .status(400)
        .json({ message: "Price must be a valid positive number" });
    }

    if (!isValidSKU(sku)) {
      return res.status(400).json({
        message:
          "SKU must be alphanumeric (A-Z, 0-9, dashes, underscores), 3–40 characters",
      });
    }
    const finalSKU = `${sku}-${colour.toUpperCase()}`;

    const duplicate = await Product.findOne({
      sku: finalSKU,
      organizationId: req.decoded.ordId,
      _id: { $ne: id },
    });

    if (duplicate) {
      return res.status(409).json({
        message: `Another product with SKU ${finalSKU} already exists`,
      });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: id,
      },
      {
        name: name.toUpperCase(),
        description,
        perUnitCost: Number(perUnitCost),
        sku: finalSKU,
        stock,
        thresholdStock,
        colour,
        measurementType,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found for this organization",
      });
    }

    res.status(200).json({
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { updateProduct };
