const mongoose = require("mongoose");
const Order = require("../../models/orderModel");
const Customer = require("../../models/customerModel");
const Product = require("../../models/productModel");
const User = require("../../models/userModel");
const checkAndNotifyStock = require("../notification Controller/checkAndNotifyStock");
const validateDiscountType = ["percentage", "flat"];
const ALLOWED_GENDER_TYPES = ["men", "women"];

const createOrder = async (req, res) => {
 const session = await mongoose.startSession();
 session.startTransaction();


 try {
   const {
     products,
     customerName,
     notes,
     phoneNumberPrimary,
     phoneNumberSecondary,
     amount,
     gstRate,
     gstNumber,
     discountAmount,
     discountType,
     businessGstNumber,
     genderType,
   } = req.body;

   const genderTypeNorm =
     genderType != null && String(genderType).trim() !== ""
       ? String(genderType).trim().toLowerCase()
       : null;

   if (!genderTypeNorm || !ALLOWED_GENDER_TYPES.includes(genderTypeNorm)) {
     await session.abortTransaction();
     session.endSession();
     return res.status(400).json({
       message: `genderType is required and must be one of: ${ALLOWED_GENDER_TYPES.join(", ")}.`,
     });
   }

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
     return res.status(400).json({ message: "Missing required fields." });
   }


   if (amount < 0) {
     await session.abortTransaction();
     session.endSession();
     return res.status(400).json({ message: "Amount must be positive." });
   }


   if (discountAmount < 0) {
     await session.abortTransaction();
     session.endSession();
     return res.status(400).json({ message: "Discount amount must be positive." });
   }

     if (!validateDiscountType.includes(discountType)) {
      return res.status(400).json({
        message:
          'Invalid discount type. Must be one of: "flat" or "percentage"',
      });
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

   if (!validateDiscountType.includes(discountType)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message:
          'Invalid discount type. Must be one of: "flat" or "percentage"',
      });
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

   if (gstRate != null && (gstRate < 0 || gstRate > 100)) {
     await session.abortTransaction();
     session.endSession();
     return res
       .status(400)
       .json({ message: "GST Rate must be between 0-100 %." });
   }

   // Capitalize helper
   const capitalizeName = (name) => {
     return name
       .split(" ")
       .map(
         (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
       )
       .join(" ");
   };


   let customer = await Customer.findOne({ phoneNumberPrimary }).session(
     session
   );
   if (!customer) {
     customer = new Customer({
       customerName: capitalizeName(customerName),
       phoneNumberPrimary,
       phoneNumberSecondary,
       gstNumber
     });
   } else {
     customer.customerName = capitalizeName(customerName);
     customer.phoneNumberSecondary = phoneNumberSecondary;
     customer.gstNumber = gstNumber
   }
   await customer.save({ session });


   const lastBooking = await Order.findOne({
     organizationId: req.decoded.ordId,
   })
     .sort({ createdAt: -1 })
     .session(session);


   const invoiceNumber = lastBooking ? lastBooking.invoiceNumber + 1 : 1;


   const billingUser = await User.findById(req.decoded.userId)
     .select("name")
     .session(session);
   if (!billingUser) {
     await session.abortTransaction();
     session.endSession();
     return res.status(401).json({ message: "Logged-in user not found." });
   }


   // Stock check and update
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


     if (!Number.isInteger(Number(unit))) {
       await session.abortTransaction();
       session.endSession();
       return res.status(400).json({
         message: "Unit must be a valid intger number.",
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


     if (product.stock < unit) {
       stockConflicts.push({
         productId,
         available: product.stock,
         required: unit,
       });
     } else {
       product.stock -= unit;
       await product.save({ session });
       await checkAndNotifyStock(product, session);
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


   // Create order
   const order = new Order({
     products,
     customer: customer._id,
     notes,
     amount,
     organizationId: req.decoded.ordId,
     invoiceNumber,
     gstRate: gstRate ?? 0,
     discountAmount,
     discountType,
     billedBy: billingUser.name,
     genderType: genderTypeNorm,
   });


   await order.save({ session });


   await session.commitTransaction();
   session.endSession();


   res.status(201).json({
     message: "Order created successfully!",
     data: order,
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


module.exports = { createOrder };
