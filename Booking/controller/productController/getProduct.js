const mongoose = require("mongoose");
const Product = require("../../models/productModel");


const getProducts = async (req, res) => {
 try {
   const organizationId = req.decoded.ordId;


   if (!mongoose.Types.ObjectId.isValid(organizationId)) {
     return res.status(400).json({ message: "Invalid organization ID" });
   }


   const page = req.query.page ? Math.max(parseInt(req.query.page), 1) : null;
   const limit = req.query.limit
     ? Math.max(parseInt(req.query.limit), 1)
     : 10;


   const isDeleted =
     req.query.isDeleted === "true" ||
     req.query.isDeleted === "1";


   const matchStage = {
     $match: {
       organizationId: new mongoose.Types.ObjectId(organizationId),
       isDeleted,
     },
   };


   if (!page) {
     const products = await Product.aggregate([
       matchStage,
       { $sort: { createdAt: -1 } },
     ]);


     return res.status(200).json({
       message: "Products fetched successfully",
       data: products,
     });
   }


   // With pagination
   const skip = (page - 1) * limit;


   const result = await Product.aggregate([
     matchStage,
     {
       $facet: {
         data: [
           { $sort: { createdAt: -1 } },
           { $skip: skip },
           { $limit: limit },
         ],
         totalCount: [{ $count: "count" }],
       },
     },
   ]);


   const products = result[0].data;
   const total = result[0].totalCount[0]?.count || 0;
   const totalPages = Math.ceil(total / limit);


   return res.status(200).json({
     message: "Products fetched successfully",
     data: products,
     pagination: {
       total,
       page,
       limit,
       totalPages,
     },
   });
 } catch (error) {
   console.error("Get Products Error:", error);
   return res.status(500).json({
     message: "Server error",
     error: error.message,
   });
 }
};


module.exports = { getProducts };