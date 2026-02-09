const mongoose = require('mongoose');

const customerSchema = mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [50, 'Customer name cannot exceed 50 characters'],
      match: [
        /^[A-Za-z\s]+$/,
        'Customer name can only contain letters and spaces',
      ],
    },
    phoneNumberPrimary: {
      type: String,
      required: [true, 'Primary phone number is required'],
      unique: true,
      trim: true,
      match: [
        /^\d{10}$/,
        'Primary phone number must be a valid 10-digit number',
      ],
    },
    phoneNumberSecondary: {
      type: String,
      trim: true,
      match: [
        /^\d{10}$/,
        'Secondary phone number must be a valid 10-digit number',
      ],
      validate: {
        validator: function (value) {
          return value !== this.phoneNumberPrimary;
        },
        message:
          'Secondary phone number cannot be the same as primary phone number',
      },
    },
    gstNumber: {
  type: String,
  trim: true,
  uppercase: true,
  match: [
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "GST number must be a valid 15-character GSTIN",
  ],
}
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
