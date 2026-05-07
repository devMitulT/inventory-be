const Organization = require("../../models/OrganizationModel");

const getOrganizationInfo = async (req, res) => {
  try {
    const organizationId = req.decoded.ordId;

    const organization = await Organization.findOne({
      _id: organizationId,
      isActive: true,
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found or inactive",
      });
    }

    res.status(200).json({
      success: true,
      message: "Organization information retrieved successfully",
      data: organization,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { getOrganizationInfo };
