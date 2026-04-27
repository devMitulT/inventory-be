const jwt = require('jsonwebtoken');
const Organization = require('../models/OrganizationModel');
const User = require('../models/userModel');

const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required. Token missing or invalid.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        message: 'Invalid token format.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const organization = await Organization.findById(decoded.ordId);

    if (!organization) {
      return res.status(401).json({ message: 'Organization not found.' });
    }

    const currentDate = new Date();
    if (organization.activeTill < currentDate) {
      return res.status(403).json({
        message: 'Organization subscription expired. Please renew to continue.',
      });
    }

    const user = await User.findById(decoded.userId).select('role isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive.' });
    }

    decoded.role = user.role;
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error('JWT Error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { protectRoute };
