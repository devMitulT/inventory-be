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
    required: true,
    enum: ["meter", "piece"],
  },

  colour: {
    type: String,
    trim: true,
    required: function () {
      return this.measurementType === "meter";
    },
  },

  gender: {
    type: String,
    enum: ["men", "women"],
    required: function () {
      return this.measurementType === "piece";
    },
  },

  size: {
    type: String,
    required: function () {
      return this.measurementType === "piece";
    },
    validate: {
      validator: function (value) {
        if (this.measurementType !== "piece") return true;

        const menSizes = ["32", "34", "36", "38", "40", "42", "44"];
        const womenSizes = ["FREE", "XS", "S", "M", "L", "XL", "XXL"];

        if (this.gender === "men") {
          return menSizes.includes(value);
        }

        if (this.gender === "women") {
          return womenSizes.includes(value);
        }

        return false;
      },
      message:
        "Invalid size for selected gender",
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
