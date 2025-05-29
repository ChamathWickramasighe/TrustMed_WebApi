// roleCheck.middleware.js
const { AppError } = require('../utils/error.utils');

/**
 * Middleware to check if user has the required role
 * @param {Array} allowedRoles - Array of roles allowed to access the route
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {

    //console.log('Role check - User:', req.user, 'Allowed roles:', allowedRoles);
    
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    // Check if user role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

module.exports = {
  checkRole
};