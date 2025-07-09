const {
  generateTokenAndSetCookie,
} = require("../../../utils/generateTokenAndSetCookie.js");
const User = require("../../models/userModel.js");
const bcrypt = require("bcryptjs");

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and Password are required" });
    }

    const user = await User.findOne({ email });
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user?.password || ""
    );

    if (!user || !isPasswordCorrect)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = generateTokenAndSetCookie(user._id, user.organizationId);

    // Create a copy of user object and delete password
    const userWithoutPassword = { ...user._doc };
    delete userWithoutPassword.password;

    res.status(200).json({
      message: "User login succesfully",
      data: { user: userWithoutPassword, token: token },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { loginUser };
