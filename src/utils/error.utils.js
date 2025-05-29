class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  const handleDatabaseError = (err) => {
    // Handle specific MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
      return new AppError('Duplicate entry. This record already exists.', 409);
    }
    
    if (err.code === 'ER_NO_REFERENCED_ROW') {
      return new AppError('Invalid reference. The referenced record does not exist.', 400);
    }
    
    return new AppError('Database error occurred. Please try again later.', 500);
  };
  
  module.exports = {
    AppError,
    handleDatabaseError
  };