const fs = require("fs");
const { parse } = require("csv-parse");
const Product = require("../../models/productModel");


const isValidSKU = (sku) => /^[A-Z0-9\-_]{3,40}$/.test(sku);
const isValidName = (name) => /^[\w\s\-(),.&']{3,100}$/.test(name);
const isValidDescription = (desc) => desc.length >= 10 && desc.length <= 1000;


const MEN_SIZES = ["32", "34", "36", "38", "40", "42", "44"];
const WOMEN_SIZES = ["FREE", "XS", "S", "M", "L", "XL", "XXL"];


const createProductFromCSV = async (req, res) => {
 const { measurementType } = req.body;


 const file = req.file;


 if (!measurementType || !file) {
   return res
     .status(400)
     .json({ message: "Measurement type and CSV file are required" });
 }


 if (!["meter", "piece"].includes(measurementType)) {
   return res.status(400).json({ message: "Invalid measurement type" });
 }


 const createdProducts = [];
 const errors = [];


 try {
   const records = await new Promise((resolve, reject) => {
     const rows = [];
     fs.createReadStream(file.path)
       .pipe(parse({ columns: true, trim: true }))
       .on("data", (row) => rows.push(row))
       .on("end", () => resolve(rows))
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
         size,
         gender,
       } = row;


       if (
         !name ||
         !perUnitCost ||
         !sku ||
         !stock
       ) {
         throw new Error("Missing required base fields");
       }


       if (!isValidName(name)) {
         throw new Error("Invalid product name");
       }


       if (description && description.length > 1000) {
         throw new Error("Invalid description length");
       }


       if (Number(stock) < Number(thresholdStock)) {
         throw new Error("Threshold stock must be less than stock");
       }


       if (isNaN(perUnitCost) || Number(perUnitCost) < 0) {
         throw new Error("Invalid perUnitCost");
       }


       const baseSKU = sku.toUpperCase();
       if (!isValidSKU(baseSKU)) {
         throw new Error("Invalid SKU format");
       }


       if (measurementType === "meter") {
         if (!colour) {
           throw new Error("Colour required for meter products");
         }
       }


       if (measurementType === "piece") {
         if (!gender || !["men", "women"].includes(gender)) {
           throw new Error("Gender must be men or women for piece products");
         }


         if (!size) {
           throw new Error("Size required for piece products");
         }
       }


       const variants =
         measurementType === "meter"
           ? colour.split(",").map((c) => ({
               colour: c.trim(),
               skuSuffix: c.trim().toUpperCase(),
             }))
           : size.split("-").map((s) => ({
               size: s.trim().toUpperCase(),
               skuSuffix: s.trim().toUpperCase(),
             }));


       if (measurementType === "piece") {
         const allowedSizes = gender === "men" ? MEN_SIZES : WOMEN_SIZES;
         for (const v of variants) {
           if (!allowedSizes.includes(v.size)) {
             throw new Error(`Invalid size '${v.size}' for ${gender}`);
           }
         }
       }


       for (const v of variants) {
         const finalSKU = `${baseSKU}-${v.skuSuffix}`;


         const exists = await Product.findOne({
           sku: finalSKU,
           organizationId: req.decoded.ordId,
         });


         if (exists) {
           errors.push({
             sku: finalSKU,
             name,
             message: "SKU already exists",
           });
           continue;
         }


         const product = new Product({
           name: name.toUpperCase(),
           description,
           perUnitCost: Number(perUnitCost),
           sku: finalSKU,
           stock,
           thresholdStock,
           measurementType,
           colour: measurementType === "meter" ? v.colour : undefined,
           size: measurementType === "piece" ? v.size : undefined,
           gender: measurementType === "piece" ? gender : undefined,
           organizationId: req.decoded.ordId,
         });


         await product.save();
         createdProducts.push(product);
       }
     } catch (err) {
       errors.push({
         sku: row.sku,
         name: row.name,
         message: err.message,
       });
     }
   }


   return res.status(201).json({
     message: "CSV processing completed",
     createdCount: createdProducts.length,
     createdProducts,
     errors,
   });
 } catch (error) {
   console.error(error);
   return res.status(500).json({
     message: "Server error",
     error: error.message,
   });
 } finally {
   fs.unlinkSync(file.path);
 }
};


module.exports = { createProductFromCSV };


