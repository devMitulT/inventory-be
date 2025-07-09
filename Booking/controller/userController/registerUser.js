const {
  generateTokenAndSetCookie,
} = require("../../../utils/generateTokenAndSetCookie");
const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email, Password and Name are required" });
    }

    const user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(+process.env.SALT_GEN_KEY);

    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      res.status(201).json({ message: "Register Sucessfully", data: newUser });
    } else {
      res.status(400).json({ message: "Invalid user Data" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { registerUser };
