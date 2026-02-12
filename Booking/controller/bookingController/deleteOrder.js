const mongoose = require("mongoose");
const Order = require("../../models/orderModel");
const Product = require("../../models/productModel");
const checkAndNotifyStock = require("../notification Controller/checkAndNotifyStock");

const deleteOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const orderId = req.params.bid;
    const organizationId = req.decoded.ordId;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid Order ID");
    }

    const order = await Order.findOne({
      _id: orderId,
      organizationId,
      isDeleted: false,
    }).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    // Same day validation
    const now = new Date();
    const createdAt = new Date(order.createdAt);

    const isSameDay =
      now.getFullYear() === createdAt.getFullYear() &&
      now.getMonth() === createdAt.getMonth() &&
      now.getDate() === createdAt.getDate();

    if (!isSameDay) {
      throw new Error("You can't delete this order now.");
    }

    // Restore stock
    for (const item of order.products) {
      const { productId, unit } = item;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error(`Invalid productId: ${productId}`);
      }

      if (typeof unit !== "number" || unit <= 0) {
        throw new Error(`Invalid unit for product: ${productId}`);
      }

      const product = await Product.findOne({
        _id: productId,
        organizationId,
        isDeleted: false,
      }).session(session);

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      product.stock += unit;
      await product.save({ session });

      await checkAndNotifyStock(product, session);
    }

    // Mark order as deleted (inside transaction)
    order.isDeleted = true;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Order deleted successfully",
      data: order,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Delete order failed:", error.message);

    return res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = { deleteOrder };
