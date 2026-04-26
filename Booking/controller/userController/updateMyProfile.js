const User = require('../../models/userModel');

const updateMyProfile = async (req, res) => {
  try {
    const { name, mobileNumber } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!/^[A-Za-z\s]+$/.test(name)) {
      return res.status(400).json({
        message: 'Name can only contain letters and spaces',
      });
    }

    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        message: 'Mobile number must be a valid 10-digit number',
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.decoded.userId,
      {
        name: name.trim(),
        mobileNumber: mobileNumber ? mobileNumber : undefined,
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { updateMyProfile };
