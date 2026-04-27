const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
      match: [/^[A-Za-z\s]+$/, 'Name can only contain letters and spaces'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Invalid email format',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    mobileNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, 'Mobile number must be a valid 10-digit number'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: {
        values: ['superAdmin', 'admin', 'user'],
        message: 'Role must be either superAdmin, admin, or user',
      },
      default: 'superAdmin',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
