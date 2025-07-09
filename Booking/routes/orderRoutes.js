const express = require("express");
const { createOrder } = require("../controller/bookingController/createOrder");
const { protectRoute } = require("../middlewares/protectRoute");
const {
  getAllOrders,
} = require("../controller/bookingController/getAllOrders");
const {
  getOrderById,
} = require("../controller/bookingController/getOrderById");
const { updateOrder } = require("../controller/bookingController/updateOrder");
const { deleteOrder } = require("../controller/bookingController/deleteOrder");
const router = express.Router();

router.post("/orders", protectRoute, createOrder);
router.get("/orders", protectRoute, getAllOrders);
router.put("/orders/:bid", protectRoute, updateOrder);
router.delete("/orders/:bid", protectRoute, deleteOrder);
router.get("/orders/:bid", protectRoute, getOrderById);

module.exports = { orderRouter: router };
