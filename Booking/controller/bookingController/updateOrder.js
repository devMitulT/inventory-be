const mongoose = require("mongoose");
const Order = require("../../models/orderModel");
const Customer = require("../../models/customerModel");
const Product = require("../../models/productModel");
const checkAndNotifyStock = require("../notification Controller/checkAndNotifyStock");
const validateDiscountType = ["percentage", "flat"];


const updateOrder = async (req, res) => {
 const session = await mongoose.startSession();
 session.startTransaction();

 try {
   const orderId = req.params.bid;
   const {
     products,
     notes,
     amount,
     customerName,
     phoneNumberPrimary,
     phoneNumberSecondary,
     gstRate,
     gstNumber,
     discountAmount,
     discountType,
     businessGstNumber
   } = req.body;
   if (
     !products ||
     !Array.isArray(products) ||
     products.length === 0 ||
     !customerName ||
     !phoneNumberPrimary ||
     amount == null
   ) {
     await session.abortTransaction();
     session.endSession();
     return res.status(400).json({ message: "Missing or invalid fields." });
   }

   if (phoneNumberPrimary < 1000000000 || phoneNumberPrimary > 9999999999) {
     await session.abortTransaction();
     session.endSession();
     return res.status(400).json({ message: "Invalid primary phone number." });
   }


   if (
     phoneNumberSecondary &&
     phoneNumberSecondary.trim() !== "" &&
     (phoneNumberSecondary < 1000000000 || phoneNumberSecondary > 9999999999)
   ) {
     await session.abortTransaction();
     session.endSession();
     return res
       .status(400)
       .json({ message: "Invalid secondary phone number." });
   }

   if(businessGstNumber && businessGstNumber.trim() !== "" && businessGstNumber.length !== 15){
     await session.abortTransaction();
     session.endSession();
     return res
       .status(400)
       .json({ message: "Business GST number must be a valid 15-digit number" });
   }

   if(gstNumber && gstNumber.trim() !== "" && gstNumber.length !== 15){
     await session.abortTransaction();
     session.endSession();
     return res
       .status(400)
       .json({ message: "Customer GST number must be a valid 15-digit number" });
   }

   if (gstNumber && gstNumber.trim() !== "" && (!gstRate || gstRate === 0)) {
     await session.abortTransaction();
     session.endSession();
     return res
       .status(400)
       .json({ message: "GST Rate required if there is GST number." });
   }

      if (gstRate < 0 || gstRate > 100) {
     await session.abortTransaction();
     session.endSession();
     return res
       .status(400)
       .json({ message: "GST Rate must be between 0-100 %." });
   }

   if (discountAmount < 0) {
     await session.abortTransaction();
     session.endSession();
     return res.status(400).json({ message: "Discount amount must be positive." });
   }

     if (!validateDiscountType.includes(discountType)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message:
          'Invalid discount type. Must be one of: "flat" or "percentage"',
      });
    }


   const capitalizeName = (name) => {
     return name
       .split(" ")
       .map(
         (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
       )
       .join(" ");
   };

   data = await Order.findById(orderId)

   const isProductChange = data.products !== products

   const order = await Order.findOne({
     _id: orderId,
     organizationId: req.decoded.ordId,
     isDeleted: false,
   }).session(session);


   if (!order) {
     await session.abortTransaction();
     session.endSession();
     return res.status(404).json({ message: "Order not found." });
   }


   const now = new Date();
   const createdAt = new Date(order.createdAt);


   const isSameDay =
     now.getFullYear() === createdAt.getFullYear() &&
     now.getMonth() === createdAt.getMonth() &&
     now.getDate() === createdAt.getDate();


   if (!isSameDay) {
     await session.abortTransaction();
     session.endSession();
     return res.status(403).json({
       message: "You can't update this order now.",
     });
   }


   const oldProducts = order.products;
   const oldProductMap = new Map();
   for (const item of oldProducts) {
     oldProductMap.set(item.productId.toString(), item.unit);
   }


   const newProductMap = new Map();
   for (const item of products) {
     newProductMap.set(item.productId.toString(), item.unit);
   }


   // Step 1: Revert all stock from old products
   for (const item of oldProducts) {
     const product = await Product.findById(item.productId).session(session);
     if (product) {
       product.stock += item.unit;
       await product.save({ session });
       isProductChange && await checkAndNotifyStock(product, session);
     }
   }


   // Step 2: Process new product stock deduction
   const stockConflicts = [];


   for (const item of products) {
     const { productId, unit, perUnitCost } = item;


     if (!productId || !unit || !perUnitCost) {
       await session.abortTransaction();
       session.endSession();
       return res.status(400).json({
         message: "Each product must have productId, unit, and perUnitCost.",
       });
     }


     const product = await Product.findOne({
       _id: productId,
       isDeleted: false,
       organizationId: req.decoded.ordId,
     }).session(session);


     if (!product) {
       await session.abortTransaction();
       session.endSession();
       return res.status(404).json({
         message: `Product with ID ${productId} not found.`,
       });
     }


     // New or updated quantity
     const availableStock = product.stock;
     if (availableStock < unit) {
       stockConflicts.push({
         productId,
         available: availableStock,
         required: unit,
       });
     } else {
       product.stock -= unit;
       await product.save({ session });
       isProductChange && await checkAndNotifyStock(product, session);
     }
   }


   if (stockConflicts.length > 0) {
     await session.abortTransaction();
     session.endSession();
     return res.status(400).json({
       message: "Some products have insufficient stock.",
       conflicts: stockConflicts,
     });
   }


   // Step 3: Update customer
   await Customer.findByIdAndUpdate(
     order.customer,
     {
       customerName: capitalizeName(customerName),
       phoneNumberPrimary,
       phoneNumberSecondary,
       gstNumber
     },
     { session }
   );


   // Step 4: Update order
   const updatedOrder = await Order.findByIdAndUpdate(
     orderId,
     {
       products,
       notes,
       amount,
       gstRate,
       discountAmount,
       discountType
     },
     { session, new: true }
   );


   await session.commitTransaction();
   session.endSession();


   res.status(200).json({
     message: "Order updated successfully!",
     data: updatedOrder,
   });
 } catch (error) {
   await session.abortTransaction();
   session.endSession();
   res.status(500).json({
     message: "Internal Server Error",
     error: error.message,
   });
 }
};


module.exports = { updateOrder };


