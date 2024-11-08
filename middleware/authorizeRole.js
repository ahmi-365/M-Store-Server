// middlewares/authorizeRole.js
const authorizeRole = (allowedRole) => (req, res, next) => {
  if (req.session.user?.role !== allowedRole) {
      return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = authorizeRole;
