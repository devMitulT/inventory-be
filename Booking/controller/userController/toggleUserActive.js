const User = require('../../models/userModel');

const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await User.findOne({
      _id: id,
      organizationId: req.decoded.ordId,
    });

    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (target.role === 'superAdmin') {
      return res
        .status(400)
        .json({ message: 'Cannot change status of a super admin' });
    }

    if (target._id.toString() === req.decoded.userId) {
      return res
        .status(400)
        .json({ message: 'You cannot change your own status' });
    }

    target.isActive = !target.isActive;
    await target.save();

    const userWithoutPassword = { ...target._doc };
    delete userWithoutPassword.password;

    return res.status(200).json({
      message: `User ${target.isActive ? 'activated' : 'deactivated'} successfully`,
      data: userWithoutPassword,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { toggleUserActive };
