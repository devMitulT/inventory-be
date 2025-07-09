const express = require("express");
const {
  getNotifications,
} = require("../controller/notification Controller/getNotifications");
const { protectRoute } = require("../middlewares/protectRoute");

const router = express.Router();

router.get("/notifications", protectRoute, getNotifications);

module.exports = { notificationRouter: router };
