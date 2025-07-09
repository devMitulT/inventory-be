const mongoose = require("mongoose");
const Order = require("../../models/orderModel");
const Product = require("../../models/productModel");
const checkAndNotifyStock = require("../notification Controller/checkAndNotifyStock");

const deleteOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = req.params.bid;

    const order = await Order.findOne({
      _id: orderId,
      organizationId: req.decoded.ordId,
      isDeleted: false,
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Order not found" });
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
        message: "You can't delete this order now.",
      });
    }

    for (const item of order.products) {
      const { productId, unit } = item;

      const product = await Product.findOne({
        _id: productId,
        organizationId: req.decoded.ordId,
        isDeleted: false,
      }).session(session);

      if (product) {
        product.stock += unit;
        await product.save({ session });
        await checkAndNotifyStock(product, session);
      }
    }

    // Mark order as deleted
    const deletedOrder = await Order.findOneAndUpdate(
      { _id: orderId, organizationId: req.decoded.ordId },
      { isDeleted: true },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Order deleted successfully",
      data: deletedOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { deleteOrder };
