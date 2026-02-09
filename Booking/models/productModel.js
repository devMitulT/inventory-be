const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Product name must be at least 3 characters"],
      maxlength: [100, "Product name cannot exceed 100 characters"],
      match: [/^[\w\s\-(),.&']+$/, "Product name contains invalid characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
      minlength: [3, "SKU must be at least 3 characters"],
      maxlength: [40, "SKU must not exceed 40 characters"],
      match: [
        /^[A-Z0-9\-_]+$/,
        "SKU must be alphanumeric (A-Z, 0-9, dashes, underscores only)",
      ],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    perUnitCost: {
      type: Number,
      required: [true, "Per unint cost is required"],
      min: [0, "Per unit cost must be a positive number"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    colour: {
      type: String,
      required: [true, "Colour is required"],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock must be a positive number"],
      default: 0,
    },
    thresholdStock: {
      type: Number,
      required: [true, "Threshold stock is required"],
      default:0
    },
    measurementType: {
      type: String,
      required: [true, "Measurement type is required"],
      enum: {
        values: ["meter", "liter", "piece"],
        message: "Measurement type must be either 'meter', 'liter', or 'piece'",
      },
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ sku: 1, organizationId: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
