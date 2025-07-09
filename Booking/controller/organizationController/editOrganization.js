const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const Organization = require("../../models/OrganizationModel");
const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const { s3Config } = require("../../../utils/awsS3Config");
const mongoose = require("mongoose");
const sharp = require("sharp");

const editOrganization = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: organizationId } = req.params;

    const {
      organizationName,
      ownerName,
      email,
      description,
      billingRules,
      contactNumber,
      address,
      gstNumber,
    } = req.body;

    if (
      !organizationName ||
      !description ||
      !ownerName ||
      !email ||
      !contactNumber ||
      !address
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message:
          "OrganizationName, ownerName, email, contactNumber, address, and description are required",
      });
    }
    if (
      gstNumber &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        gstNumber.toUpperCase()
      )
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "GST number must be a valid 15-character GSTIN ",
      });
    }
    // Validate contact number format
    if (!/^\d{10}$/.test(contactNumber)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Contact number must be a valid 10-digit number",
      });
    }

    if (billingRules && !Array.isArray(billingRules)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Billing rules must be an array" });
    }

    if (billingRules) {
      for (const rule of billingRules) {
        if (rule.length > 500) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: "Billing rule title or description exceeds allowed length",
          });
        }
      }
    }

    const existingOrganization = await Organization.findOne({
      $or: [
        { email, _id: { $ne: organizationId } },
        { contactNumber, _id: { $ne: organizationId } },
      ],
    }).session(session);

    if (existingOrganization) {
      await session.abortTransaction();
      session.endSession();
      if (existingOrganization.email === email) {
        return res.status(400).json({
          message: "Another organization already exists with given email",
        });
      }
      return res.status(400).json({
        message:
          "Another organization already exists with given contact number",
      });
    }

    const existingUser = await User.findOne({
      email,
      organizationId: { $ne: organizationId },
    }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "User with this email already exists for another organization",
      });
    }

    let logoUrl;

    if (req.file) {
      const file = req.file;
      const fileName = `${uuidv4()}.jpg`;
      let imageBuffer = file.buffer;
      // Check if file size is greater than 5MB (5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        // Resize image to 30% of original size while maintaining aspect ratio
        imageBuffer = await sharp(file.buffer)
          .resize({
            width: Math.round(
              await sharp(file.buffer)
                .metadata()
                .then((info) => info.width * 0.3)
            ),
            height: Math.round(
              await sharp(file.buffer)
                .metadata()
                .then((info) => info.height * 0.3)
            ),
            fit: "inside",
          })
          .toFormat("jpeg")
          .jpeg({ quality: 80 })
          .toBuffer();
      }
      const params = {
        Bucket: process.env.S3_BUCKET_NAME_LOGO,
        Key: `${req.decoded.ordId}/${fileName}`,
        Body: imageBuffer,
        ContentType: "image/jpeg",
      };

      const command = new PutObjectCommand(params);
      await s3Config.send(command);

      logoUrl = `${process.env.CLOUD_FRONT_URL_LOGO}/${req.decoded.ordId}/${fileName}`;
    }

    const rules = billingRules?.length > 0 ? billingRules : [];

    const updateOrganizationData = {
      organizationName,
      ownerName,
      description,
      email,
      contactNumber,
      address,
      logo: logoUrl,
      billingRules: rules,
      gstNumber,
    };

    if (logoUrl) {
      updateOrganizationData.logo = logoUrl;
    }

    const updatedOrganization = await Organization.findByIdAndUpdate(
      organizationId,
      { $set: updateOrganizationData },
      { new: true, runValidators: true, session }
    );

    if (!updatedOrganization) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Organization not found" });
    }

    const updateUserData = {
      name: ownerName,
      email,
    };

    await User.findOneAndUpdate(
      { organizationId },
      { $set: updateUserData },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Organization and user updated successfully",
      data: updatedOrganization,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { editOrganization };
