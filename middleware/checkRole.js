const rolePermissions = require('./permissions');

// Middleware to check if the user has the required role for the action
const checkRole = (action) => {
  return (req, res, next) => {
    const userRole = req.session.user?.role; // Assuming user role is stored in the session

    if (userRole && rolePermissions[userRole] && rolePermissions[userRole].includes(action)) {
      next(); // User has permission
    } else {
      res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }
  };
};

module.exports = checkRole;
