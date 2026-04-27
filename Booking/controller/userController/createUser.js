const User = require('../../models/userModel');
const bcrypt = require('bcryptjs');

const createUser = async (req, res) => {
  try {
    const { name, email, password, mobileNumber } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6 || password.length > 16) {
      return res.status(400).json({
        message: 'Password length must be between 6 and 16 characters.',
      });
    }

    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        message: 'Mobile number must be a valid 10-digit number',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(+process.env.SALT_GEN_KEY);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      mobileNumber: mobileNumber || undefined,
      role: 'user',
      organizationId: req.decoded.ordId,
    });

    await newUser.save();

    const userWithoutPassword = { ...newUser._doc };
    delete userWithoutPassword.password;

    return res.status(201).json({
      message: 'User created successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { createUser };
