const Product = require("../../models/productModel");

const isValidSKU = (sku) => /^[A-Z0-9\-_]{3,40}$/.test(sku);
const isValidName = (name) => /^[\w\s\-(),.&']{3,100}$/.test(name);
const isValidDescription = (desc) => desc.length >= 10 && desc.length <= 1000;

const createProduct = async (req, res) => {
  try {
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
        message: "Invalid product name format or length (3–100 characters )",
      });
    }

    if (!isValidDescription(description)) {
      return res.status(400).json({
        message: "Description must be between 10 and 1000 characters",
      });
    }

    if (Number(stock) < Number(thresholdStock)) {
      return res.status(400).json({
        message: "Threshold Stock must be less then Stock count",
      });
    }

    const baseSKU = sku.toUpperCase();
    if (!isValidSKU(baseSKU)) {
      return res.status(400).json({
        message:
          "SKU must be alphanumeric (A-Z, 0-9, dashes, underscores), 3–40 characters",
      });
    }

    if (isNaN(perUnitCost) || Number(perUnitCost) < 0) {
      return res
        .status(400)
        .json({ message: "Price must be a valid positive number" });
    }

    const capitalizeName = (name) => {
      return name
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    };

    const createdProducts = [];

    for (const s of colour) {
      const finalSKU = `${baseSKU}-${capitalizeName(s)}`;

      const existingSKU = await Product.findOne({
        sku: finalSKU,
        organizationId: req.decoded.ordId,
      });

      if (existingSKU) {
        return res.status(409).json({
          message: ` SKU already exists: ${finalSKU} for this organization,`,
        });
      }

      const newProduct = new Product({
        name: name.toUpperCase(),
        description,
        perUnitCost: Number(perUnitCost),
        sku: finalSKU,
        stock,
        thresholdStock,
        colour: capitalizeName(s),
        measurementType,
        organizationId: req.decoded.ordId,
      });

      await newProduct.save();
      createdProducts.push(newProduct);
    }

    res.status(201).json({
      message: "Products created successfully",
      data: createdProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createProduct };
