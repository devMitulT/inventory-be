const Order = require("../../models/orderModel");

const getOrderById = async (req, res) => {
  try {
    const id = req.params.bid;
    const order = await Order.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("products.productId")
      .populate("customer")
      .populate(
        "organizationId",
        "organizationName ownerName description email logo address contactNumber billingRules"
      );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order For given ID", data: order });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { getOrderById };
