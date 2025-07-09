const jwt = require('jsonwebtoken');

const generateProductLinkToken = (ordId) => {
  return jwt.sign({ ordId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = { generateProductLinkToken };
