const Product = require("../../models/productModel");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const { s3Config } = require("../../../utils/awsS3Config");


const isValidSKU = (sku) => /^[A-Z0-9\-_]{3,40}$/.test(sku);
const isValidName = (name) => /^[\w\s\-(),.&']{3,100}$/.test(name);


const MEN_SIZES = ["32", "34", "36", "38", "40", "42", "44"];
const WOMEN_SIZES = ["FREE", "XS", "S", "M", "L", "XL", "XXL"];
const MEN_CATEGORIES = ["Blazer", "Sherwani", "Shirt", "Pant"];
const WOMEN_CATEGORIES = ["Chaniya-Choli", "Gown", "Overcoat"];


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
     size = [],
     gender,
     category,
   } = req.body;
   if (
     !name ||
     !perUnitCost ||
     !sku ||
     !stock ||
     !measurementType
   ) {
     return res.status(400).json({ message: "All base fields are required" });
   }


   if (measurementType !== "piece") {
     return res.status(400).json({
       message: 'Only "piece" measurement type is supported',
     });
   }


   if (!Number.isInteger(Number(stock))) {
     return res.status(400).json({ message: "Stock must be a valid integer number" });
   }


   if (
     thresholdStock !== undefined &&
     thresholdStock !== null &&
     !Number.isInteger(Number(thresholdStock))
   ) {
     return res
       .status(400)
       .json({ message: "Threshold stock must be a valid integer number" });
   }


   if (measurementType === "piece") {
     if (!gender || !["men", "women"].includes(gender)) {
       return res.status(400).json({ message: "Gender is required for piece type" });
     }

     if (!category) {
       return res.status(400).json({ message: "Category is required for piece type" });
     }
     const allowedCategories = gender === "men" ? MEN_CATEGORIES : WOMEN_CATEGORIES;
     const categoryNorm = allowedCategories.find(
       (c) => c.toLowerCase() === String(category).trim().toLowerCase()
     );
     if (!categoryNorm) {
       return res.status(400).json({
         message: `Invalid category '${category}' for ${gender}`,
         allowedCategories,
       });
     }


     if (!Array.isArray(size) || !size.length) {
       return res.status(400).json({ message: "Size is required for piece type" });
     }
   }


   if (!isValidName(name)) {
     return res.status(400).json({ message: "Invalid product name" });
   }


   if (description && description.length > 1000) {
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

   const files = Array.isArray(req.files) ? req.files : [];
   const uploadedImageUrls = [];
   if (files.length > 0) {
     if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
       return res.status(500).json({
         message: "Server error",
         error:
           "Missing AWS credentials. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.",
       });
     }
     if (!process.env.S3_BUCKET_NAME_PRODUCT_IMAGES) {
       return res.status(500).json({
         message: "Server error",
         error:
           "Missing env S3_BUCKET_NAME_PRODUCT_IMAGES for product image upload.",
       });
     }
     if (!process.env.CLOUD_FRONT_URL_PRODUCT_IMAGES) {
       return res.status(500).json({
         message: "Server error",
         error:
           "Missing env CLOUD_FRONT_URL_PRODUCT_IMAGES for product image upload.",
       });
     }
     for (const file of files) {
       const fileName = uuidv4();
       const params = {
        Bucket: process.env.S3_BUCKET_NAME_PRODUCT_IMAGES,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
       await s3Config.send(new PutObjectCommand(params));
       uploadedImageUrls.push(
         `${process.env.CLOUD_FRONT_URL_PRODUCT_IMAGES}/${fileName}`
       );
     }
   }


   const variants = size.map((s) => ({
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
       category:
         measurementType === "piece"
           ? (gender === "men" ? MEN_CATEGORIES : WOMEN_CATEGORIES).find(
               (c) => c.toLowerCase() === String(category).trim().toLowerCase()
             )
           : undefined,
       size: variant.size,
       images: uploadedImageUrls,
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
