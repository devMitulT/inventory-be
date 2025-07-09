const Notification = require("../../models/notificationModel");

const getNotifications = async (req, res) => {
  try {
    const organizationId = req.decoded.ordId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await Notification.countDocuments({ organizationId });

    const notifications = await Notification.find({ organizationId })
      .populate({
        path: "product",
        select: "name sku stock thresholdStock",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      message: "Notifications fetched successfully",
      data: notifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  getNotifications,
};
