const express = require("express");
const { createOrder } = require("../controller/bookingController/createOrder");
const { protectRoute } = require("../middlewares/protectRoute");
const { requireRole } = require("../middlewares/requireRole");
const {
  getAllOrders,
} = require("../controller/bookingController/getAllOrders");
const {
  getOrderById,
} = require("../controller/bookingController/getOrderById");
const { updateOrder } = require("../controller/bookingController/updateOrder");
const { deleteOrder } = require("../controller/bookingController/deleteOrder");
const {
  getStatistics,
} = require("../controller/bookingController/getStatistics");
const router = express.Router();

router.post("/orders", protectRoute, createOrder);
router.get("/orders", protectRoute, getAllOrders);
router.get(
  "/statistics",
  protectRoute,
  requireRole(["superAdmin", "admin"]),
  getStatistics
);
router.put("/orders/:bid", protectRoute, updateOrder);
router.delete("/orders/:bid", protectRoute, deleteOrder);
router.get("/orders/:bid", protectRoute, getOrderById);

// Public e-receipt — accessible without login (link is shared with customer)
router.get("/e-receipt/:bid", getOrderById);

module.exports = { orderRouter: router };
