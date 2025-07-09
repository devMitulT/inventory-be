// models/notificationModel.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["warning", "danger"],
    required: true,
  },
  message: { type: String, required: true },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  seen: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
