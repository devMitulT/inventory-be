const User = require('../../models/userModel');

const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      organizationId: req.decoded.ordId,
    })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { getUsers };
