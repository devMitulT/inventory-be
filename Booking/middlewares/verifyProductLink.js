const jwt = require('jsonwebtoken');

const verifyProductLink = (req, res, next) => {
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'Token is required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error('Token error:', error.message);
    res.status(401).json({ message: 'Invalid or expired link.' });
  }
};

module.exports = { verifyProductLink };
