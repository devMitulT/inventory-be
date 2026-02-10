const Product = require("../../models/productModel");


const isValidSKU = (sku) => /^[A-Z0-9\-_]{3,40}$/.test(sku);
const isValidName = (name) => /^[\w\s\-(),.&']{3,100}$/.test(name);
const isValidDescription = (desc) => desc.length >= 10 && desc.length <= 1000;


const MEN_SIZES = ["32", "34", "36", "38", "40", "42", "44"];
const WOMEN_SIZES = ["FREE", "XS", "S", "M", "L", "XL", "XXL"];


const updateProduct = async (req, res) => {
 try {
   const { id } = req.params;


   const {
     name,
     description,
     perUnitCost,
     sku,
     stock,
     thresholdStock,
     measurementType,
     colour,
     size,
     gender,
   } = req.body;


   if (
     !name ||
     !description ||
     perUnitCost === undefined ||
     stock === undefined ||
     thresholdStock === undefined ||
     !sku ||
     !measurementType
   ) {
     return res.status(400).json({ message: "All required fields must be provided" });
   }


   if (!["meter", "piece"].includes(measurementType)) {
     return res.status(400).json({ message: "Invalid measurement type" });
   }


   if (measurementType === "meter" && !colour) {
     return res.status(400).json({ message: "Colour is required for meter products" });
   }


   if (measurementType === "piece") {
     if (!gender || !["men", "women"].includes(gender)) {
       return res.status(400).json({ message: "Gender is required for piece products" });
     }


     if (!size) {
       return res.status(400).json({ message: "Size is required for piece products" });
     }
   }


   if (!isValidName(name)) {
     return res.status(400).json({ message: "Invalid product name" });
   }


   if (!isValidDescription(description)) {
     return res.status(400).json({ message: "Invalid description length" });
   }


   if (Number(stock) < Number(thresholdStock)) {
     return res.status(400).json({
       message: "Threshold stock must be less than stock",
     });
   }


   if (isNaN(perUnitCost) || Number(perUnitCost) < 0) {
     return res.status(400).json({ message: "Invalid per unit cost" });
   }


   const baseSKU = sku.toUpperCase();
   if (!isValidSKU(baseSKU)) {
     return res.status(400).json({ message: "Invalid SKU format" });
   }


   if (measurementType === "piece") {
     const allowedSizes = gender === "men" ? MEN_SIZES : WOMEN_SIZES;
     if (!allowedSizes.includes(size.toUpperCase())) {
       return res.status(400).json({
         message: `Invalid size '${size}' for ${gender}`,
       });
     }
   }


   const skuSuffix =
     measurementType === "meter"
       ? colour.toUpperCase()
       : size.toUpperCase();


   const finalSKU = `${baseSKU}-${skuSuffix}`;


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
       organizationId: req.decoded.ordId,
     },
     {
       name: name.toUpperCase(),
       description,
       perUnitCost: Number(perUnitCost),
       sku: finalSKU,
       stock,
       thresholdStock,
       measurementType,
       colour: measurementType === "meter" ? colour : undefined,
       size: measurementType === "piece" ? size.toUpperCase() : undefined,
       gender: measurementType === "piece" ? gender : undefined,
     },
     { new: true, runValidators: true }
   );


   if (!updatedProduct) {
     return res.status(404).json({
       message: "Product not found for this organization",
     });
   }


   return res.status(200).json({
     message: "Product updated successfully",
     data: updatedProduct,
   });
 } catch (error) {
   console.error(error);
   return res.status(500).json({
     message: "Server error",
     error: error.message,
   });
 }
};


module.exports = { updateProduct };


