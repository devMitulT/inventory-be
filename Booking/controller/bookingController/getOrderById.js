const Order = require("../../models/orderModel");

const ALLOWED_GENDER_TYPES = ["men", "women"];

const getOrderById = async (req, res) => {
  try {
    const id = req.params.bid;
    const { genderType: genderTypeRaw } = req.query;

    const filter = {
      _id: id,
      isDeleted: false,
    };

    if (genderTypeRaw != null && String(genderTypeRaw).trim() !== "") {
      const genderType = String(genderTypeRaw).trim().toLowerCase();
      if (!ALLOWED_GENDER_TYPES.includes(genderType)) {
        return res.status(400).json({
          message: `genderType must be one of: ${ALLOWED_GENDER_TYPES.join(", ")}.`,
        });
      }
      filter.genderType = genderType;
    }

    const order = await Order.findOne(filter)
      .populate("products.productId")
      .populate("customer")
      .populate(
        "organizationId",
        "organizationName ownerName description email logo address contactNumber billingRules gstNumber"
      );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const products = Array.isArray(order.products) ? order.products : [];
    const totalLineItems = products.length;
    const totalUnitsPurchased = products.reduce(
      (sum, p) => sum + (Number(p?.unit) || 0),
      0
    );
    const uniqueProductsPurchased = new Set(
      products
        .map((p) => p?.productId?._id?.toString?.() || p?.productId?.toString?.())
        .filter(Boolean)
    ).size;

    res.status(200).json({
      message: "Order For given ID",
      data: order,
      summary: {
        orderId: order._id,
        totalLineItems,
        totalUnitsPurchased,
        uniqueProductsPurchased,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { getOrderById };
