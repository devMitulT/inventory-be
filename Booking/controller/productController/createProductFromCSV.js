const fs = require("fs");
const { parse } = require("csv-parse");
const Product = require("../../models/productModel");

const isValidSKU = (sku) => /^[A-Z0-9\-_]{3,40}$/.test(sku);
const isValidName = (name) => /^[\w\s\-(),.&']{3,100}$/.test(name);
const isValidDescription = (desc) => desc.length >= 10 && desc.length <= 1000;

const createProductFromCSV = async (req, res) => {
  const measurementType = req.body.measurementType;
  const file = req.file;

  if (!measurementType || !file) {
    return res
      .status(400)
      .json({ message: "Measurement type and CSV file are required" });
  }

  const createdProducts = [];
  const errors = [];

  try {
    const records = await new Promise((resolve, reject) => {
      const output = [];
      fs.createReadStream(file.path)
        .pipe(parse({ columns: true, trim: true }))
        .on("data", (row) => output.push(row))
        .on("end", () => resolve(output))
        .on("error", reject);
    });

    for (const row of records) {
      try {
        const {
          name,
          description,
          perUnitCost,
          sku,
          stock,
          thresholdStock,
          colour,
        } = row;

        if (
          !name ||
          !description ||
          !perUnitCost ||
          !sku ||
          !stock ||
          !thresholdStock ||
          !colour
        ) {
          throw new Error("Missing required fields");
        }

        if (!isValidName(name)) {
          throw new Error("Invalid product name (3–100 characters)");
        }

        if (!isValidDescription(description)) {
          throw new Error("Description must be 10–1000 characters");
        }

        const baseSKU = sku.toUpperCase();
        if (!isValidSKU(baseSKU)) {
          throw new Error(
            "SKU must be alphanumeric (A-Z, 0-9, dashes, underscores), 3–40 characters"
          );
        }

        if (Number(stock) < Number(thresholdStock)) {
          throw new Error("Threshold Stock must be less then Stock count");
        }

        if (isNaN(perUnitCost) || Number(perUnitCost) < 0) {
          throw new Error("Invalid perUnitCost");
        }

        const colourArray = colour.split(",").map((c) => c.trim());

        for (const c of colourArray) {
          const finalSKU = `${baseSKU}-${c}`;

          const existing = await Product.findOne({
            sku: finalSKU,
            organizationId: req.decoded.ordId,
          });

          if (existing) {
            errors.push({ sku: finalSKU, name, message: "SKU already exists" });
            continue;
          }

          const newProduct = new Product({
            name: name.toUpperCase(),
            description,
            perUnitCost: Number(perUnitCost),
            sku: finalSKU,
            stock,
            thresholdStock,
            colour: c,
            measurementType,
            organizationId: req.decoded.ordId,
          });

          await newProduct.save();
          createdProducts.push(newProduct);
        }
      } catch (err) {
        errors.push({
          sku: row.sku,
          name: row.name,
          message: err.message,
        });
      }
    }

    res.status(201).json({
      message: "CSV processing complete",
      total: createdProducts.length,
      createdProducts,
      errors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    fs.unlinkSync(file.path);
  }
};

module.exports = { createProductFromCSV };
