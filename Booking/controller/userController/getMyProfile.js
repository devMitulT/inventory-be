const User = require('../../models/userModel');

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({
      message: 'Profile fetched successfully',
      data: user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { getMyProfile };
