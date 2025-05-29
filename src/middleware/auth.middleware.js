const { verifyToken } = require('../utils/jwt.utils');
const { AppError } = require('../utils/error.utils');

const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      //console.log('No auth header or not starting with Bearer');
      return next(new AppError('No authentication token provided', 401));
    }
    
    const token = authHeader.split(' ')[1];
    //console.log('Token found:', token ? 'yes (truncated for security)' : 'no');
    
    if (!token) {
      //console.log('Token is empty');
      return next(new AppError('No authentication token provided', 401));
    }
    
    // Verify token
    const decoded = verifyToken(token);
    // console.log('Decoded token:', decoded ? 'successfully decoded' : 'failed to decode');
    
    if (!decoded || !decoded.id) {
      // console.log('Decoded token invalid:', decoded);
      return next(new AppError('Invalid authentication token', 401));
    }
    
    // Attach user data to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user', // Provide a default role if missing
      name: decoded.name
    };
    
    // console.log('User attached to request:', {
    //   id: req.user.id,
    //   email: req.user.email,
    //   role: req.user.role,
    //   name: req.user.name
    // });
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new AppError('Authentication failed. Please log in again.', 401));
  }
};

module.exports = {
  authenticate
};