// utils/stockNotifier.js

const Notification = require("../../models/notificationModel");

const checkAndNotifyStock = async (product, session = null) => {
  const { stock, sku, thresholdStock, _id, organizationId, name } = product;

  const isCritical = stock < 0.2 * thresholdStock;
  const isLow = stock < thresholdStock;

  if (isCritical) {
    await Notification.create(
      [
        {
          type: "danger",
          message: `Stock of $${sku} : ${name} is critically low!`,
          product: _id,
          organizationId,
        },
      ],
      session ? { session } : {}
    );
  } else if (isLow) {
    await Notification.create(
      [
        {
          type: "warning",
          message: `Stock of $${sku} : ${name} is below the threshold.`,
          product: _id,
          organizationId,
        },
      ],
      session ? { session } : {}
    );
  }
};

module.exports = checkAndNotifyStock;
