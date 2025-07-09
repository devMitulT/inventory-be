const User = require("../../models/userModel.js");
const bcrypt = require("bcryptjs");

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ _id: req.decoded.userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    if (oldPassword.trim() === newPassword.trim()) {
      return res
        .status(400)
        .json({ message: "Old password and New Password Cant be same" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }
    const salt = await bcrypt.genSalt(+process.env.SALT_GEN_KEY);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedNewPassword;
    await User.findOneAndUpdate(
      { _id: req.decoded.userId },
      { password: hashedNewPassword }
    );
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error", message: error.message });
  }
};

module.exports = { changePassword };
