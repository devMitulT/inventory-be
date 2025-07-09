// utils/stockNotifier.js

const Notification = require("../../models/notificationModel");

const checkAndNotifyStock = async (product, session = null) => {
  const { stock, sku, thresholdStock, _id, organizationId, name } = product;

  const existingNotification = await Notification.findOne({
    product: _id,
    seen: false,
  });

  const isCritical = stock < 0.2 * thresholdStock;
  const isLow = stock < thresholdStock;

  if (isCritical) {
    if (
      !existingNotification ||
      existingNotification.type !== "danger"
    ) {
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
    }
  } else if (isLow) {
    if (!existingNotification || existingNotification.type !== "waring") {
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
  } else {
    await Notification.deleteMany({ product: _id, seen: false }).session(
      session
    );
  }
};

module.exports = checkAndNotifyStock;
