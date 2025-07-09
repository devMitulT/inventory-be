const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Organization name cannot exceed 50 characters"],
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
      maxlength: [50, "Owner name cannot exceed 50 characters"],
      match: [
        /^[A-Za-z\s]+$/,
        "Owner name can only contain letters and spaces",
      ],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      unique: true,
      trim: true,
      match: [/^\d{10}$/, "Contact number must be a valid 10-digit number"],
    },
    gstNumber: {
      type: String,
      required: [true, "GST number is required"],
      trim: true,
      match: [/^\d{10}$/, "GST number must be a valid 10-digit number"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },
    logo: {
      type: String,
      trim: true,
    },
    activeTill: {
      type: Date,
      required: [true, "Till date is required"],
    },
    gstNumber: {
      type: String,
      required: [true, "GST number is required"],
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "GST number must be a valid 15-character GSTIN (e.g., 27ABCDE1234F1Z5)",
      ],
    },
    billingRules: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.every(
            (str) =>
              typeof str === "string" &&
              str.trim().length > 0 &&
              str.length <= 500
          );
        },
        message:
          "Each billing rule must be a non-empty string with a maximum of 500 characters.",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
