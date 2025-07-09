const jwt = require('jsonwebtoken');

const generateTokenAndSetCookie = (userId, ordId) => {
  return jwt.sign({ userId, ordId }, process.env.JWT_SECRET, {
    expiresIn: '15d',
  });
};

module.exports = { generateTokenAndSetCookie };
