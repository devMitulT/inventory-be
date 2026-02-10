const Product = require("../../models/productModel");


const isValidSKU = (sku) => /^[A-Z0-9\-_]{3,40}$/.test(sku);
const isValidName = (name) => /^[\w\s\-(),.&']{3,100}$/.test(name);
const isValidDescription = (desc) => desc.length >= 10 && desc.length <= 1000;


const MEN_SIZES = ["32", "34", "36", "38", "40", "42", "44"];
const WOMEN_SIZES = ["FREE", "XS", "S", "M", "L", "XL", "XXL"];


const capitalize = (val) =>
 val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();


const createProduct = async (req, res) => {
 try {
   const {
     name,
     description,
     perUnitCost,
     sku,
     stock,
     thresholdStock,
     measurementType,
     colour = [],
     size = [],
     gender,
   } = req.body;
   if (
     !name ||
     !description ||
     !perUnitCost ||
     !sku ||
     !stock ||
     !measurementType
   ) {
     return res.status(400).json({ message: "All base fields are required" });
   }


   if (!["meter", "piece"].includes(measurementType)) {
     return res.status(400).json({ message: "Invalid measurement type" });
   }


   if (measurementType === "meter" && (!Array.isArray(colour) || !colour.length)) {
     return res.status(400).json({ message: "Colour is required for meter type" });
   }


   if (measurementType === "piece") {
     if (!gender || !["men", "women"].includes(gender)) {
       return res.status(400).json({ message: "Gender is required for piece type" });
     }


     if (!Array.isArray(size) || !size.length) {
       return res.status(400).json({ message: "Size is required for piece type" });
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
     const invalidSize = size.find((s) => !allowedSizes.includes(s.toUpperCase()));


     if (invalidSize) {
       return res.status(400).json({
         message: `Invalid size '${invalidSize}' for ${gender}`,
       });
     }
   }


   const createdProducts = [];


   const variants =
     measurementType === "meter"
       ? colour.map((c) => ({
           colour: capitalize(c),
           skuSuffix: capitalize(c),
         }))
       : size.map((s) => ({
           size: s.toUpperCase(),
           skuSuffix: s.toUpperCase(),
         }));


   for (const variant of variants) {
     const finalSKU = `${baseSKU}-${variant.skuSuffix}`;


     const exists = await Product.findOne({
       sku: finalSKU,
       organizationId: req.decoded.ordId,
     });


     if (exists) {
       return res.status(409).json({
         message: `SKU already exists: ${finalSKU}`,
       });
     }


     const product = new Product({
       name: name.toUpperCase(),
       description,
       perUnitCost: Number(perUnitCost),
       sku: finalSKU,
       stock,
       thresholdStock,
       measurementType,
       gender: measurementType === "piece" ? gender : undefined,
       colour: variant.colour,
       size: variant.size,
       organizationId: req.decoded.ordId,
     });


     await product.save();
     createdProducts.push(product);
   }


   return res.status(201).json({
     message: "Products created successfully",
     data: createdProducts,
   });
 } catch (error) {
   console.error(error);
   return res.status(500).json({
     message: "Server error",
     error: error.message,
   });
 }
};


module.exports = { createProduct };
