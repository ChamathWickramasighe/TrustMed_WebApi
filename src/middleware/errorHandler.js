const { handleDatabaseError } = require('../utils/error.utils');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.code && (err.code.startsWith('ER_') || err.errno)) {
    // Database errors
    const dbError = handleDatabaseError(err);
    return res.status(dbError.statusCode).json({
      status: dbError.status,
      message: dbError.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Your token has expired. Please log in again.'
    });
  }

  // Handle known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Unknown error - don't leak details in production
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message || 'Unknown error occurred'
  });
};

module.exports = errorHandler;