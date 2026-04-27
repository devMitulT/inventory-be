const requireRole = (allowedRoles) => (req, res, next) => {
  const role = req.decoded && req.decoded.role;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({
      message: 'You do not have permission to perform this action.',
    });
  }
  next();
};

module.exports = { requireRole };
