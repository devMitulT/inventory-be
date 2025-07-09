const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const Organization = require("../../models/OrganizationModel");
const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const { s3Config } = require("../../../utils/awsS3Config");
const mongoose = require("mongoose");

const createOrganization = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      organizationName,
      ownerName,
      email,
      description,
      password,
      billingRules,
      contactNumber,
      address,
      gstNumber,
    } = req.body;

    if (
      !organizationName ||
      !ownerName ||
      !email ||
      !password ||
      !contactNumber
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate contact number format
    if (!/^\d{10}$/.test(contactNumber)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Contact number must be a valid 10-digit number",
      });
    }

    if (
      gstNumber &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        gstNumber?.toUpperCase()
      )
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "GST number must be a valid 15-character GSTIN ",
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
      $or: [{ email }, { contactNumber }],
    }).session(session);

    if (existingOrganization) {
      await session.abortTransaction();
      session.endSession();
      if (existingOrganization.email === email) {
        return res
          .status(400)
          .json({ message: "Organization already exists with given email" });
      }
      return res.status(400).json({
        message: "Organization already exists with given contact number",
      });
    }

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    if (password.length > 16 || password.length < 6) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Password length must be between 6 and 16 characters.",
      });
    }

    let logoUrl = "";

    if (req.file) {
      const fileName = `${uuidv4()}`;

      const params = {
        Bucket: process.env.S3_BUCKET_NAME_LOGO,
        Key: `${req.decoded.ordId}/${fileName}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      await s3Config.send(new PutObjectCommand(params));
      logoUrl = `${process.env.CLOUD_FRONT_URL_LOGO}/${fileName}`;
    }

    const salt = await bcrypt.genSalt(+process.env.SALT_GEN_KEY);
    const hashedPassword = await bcrypt.hash(password, salt);

    const tillDate = new Date();
    tillDate.setFullYear(tillDate.getFullYear() + 1);

    const newOrganization = new Organization({
      organizationName,
      ownerName,
      description,
      email,
      contactNumber,
      address,
      logo: logoUrl,
      activeTill: tillDate,
      billingRules,
      gstNumber,
    });

    await newOrganization.save({ session });

    const newUser = new User({
      name: ownerName,
      email,
      password: hashedPassword,
      organizationId: newOrganization._id,
    });

    await newUser.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Organization and user created successfully",
      data: { newOrganization, newUser },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createOrganization };
