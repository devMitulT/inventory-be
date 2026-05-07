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
     size,
     gender,
     category,
     appendImages,
     removeImages,
   } = req.body;


   if (
     !name ||
     perUnitCost === undefined ||
     stock === undefined ||
     thresholdStock === undefined ||
     !sku ||
     !measurementType
   ) {
     return res.status(400).json({ message: "All required fields must be provided" });
   }


   if (measurementType !== "piece") {
     return res.status(400).json({
       message: 'Only "piece" measurement type is supported',
     });
   }


   if (!Number.isInteger(Number(stock))) {
     return res.status(400).json({ message: "Stock must be a valid integer number" });
   }


   if (!Number.isInteger(Number(thresholdStock))) {
     return res
       .status(400)
       .json({ message: "Threshold stock must be a valid integer number" });
   }


   if (measurementType === "piece") {
     if (!gender || !["men", "women"].includes(gender)) {
       return res.status(400).json({ message: "Gender is required for piece products" });
     }

     if (!category) {
       return res.status(400).json({ message: "Category is required for piece products" });
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


     if (!size) {
       return res.status(400).json({ message: "Size is required for piece products" });
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
     if (!allowedSizes.includes(size.toUpperCase())) {
       return res.status(400).json({
         message: `Invalid size '${size}' for ${gender}`,
       });
     }
   }


   const skuSuffix = size.toUpperCase();


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

  let removeImagesList = [];
  if (removeImages != null && String(removeImages).trim() !== "") {
    try {
      const parsed = JSON.parse(removeImages);
      if (!Array.isArray(parsed) || parsed.some((u) => typeof u !== "string")) {
        return res.status(400).json({
          message: "removeImages must be a JSON array of image URLs.",
        });
      }
      removeImagesList = parsed.map((u) => u.trim()).filter(Boolean);
    } catch {
      return res.status(400).json({
        message: "removeImages must be valid JSON (array of URLs).",
      });
    }
  }

  const existingProductForImages =
    removeImagesList.length > 0 || String(appendImages).toLowerCase() === "true"
      ? await Product.findOne({
          _id: id,
          organizationId: req.decoded.ordId,
        }).select("images")
      : null;

  if (
    (removeImagesList.length > 0 ||
      String(appendImages).toLowerCase() === "true") &&
    !existingProductForImages
  ) {
    return res.status(404).json({
      message: "Product not found for this organization",
    });
  }

  const baseImages = Array.isArray(existingProductForImages?.images)
    ? existingProductForImages.images
    : [];
  const imagesAfterRemove =
    removeImagesList.length > 0
      ? baseImages.filter((url) => !removeImagesList.includes(url))
      : baseImages;

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

  let imagesUpdate;
  if (uploadedImageUrls.length > 0) {
    if (String(appendImages).toLowerCase() === "true") {
      imagesUpdate = [...imagesAfterRemove, ...uploadedImageUrls];
    } else {
      imagesUpdate = uploadedImageUrls;
    }
  } else if (removeImagesList.length > 0) {
    imagesUpdate = imagesAfterRemove;
  }

  if (Array.isArray(imagesUpdate)) {
    imagesUpdate = [...new Set(imagesUpdate)];
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
       size: measurementType === "piece" ? size.toUpperCase() : undefined,
       gender: measurementType === "piece" ? gender : undefined,
       category:
         measurementType === "piece"
           ? (gender === "men" ? MEN_CATEGORIES : WOMEN_CATEGORIES).find(
               (c) => c.toLowerCase() === String(category).trim().toLowerCase()
             )
           : undefined,
       ...(imagesUpdate ? { images: imagesUpdate } : {}),
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


