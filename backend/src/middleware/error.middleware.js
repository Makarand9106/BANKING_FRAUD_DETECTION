import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log stack trace using Winston
  logger.error('Express Error Boundary caught: %s', err.stack || err.message);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Mongoose Schema Validation Failed';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }

  // Mongoose Cast Error (e.g., bad ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found: invalid value format for parameter '${err.path}'`;
  }

  // JWT Validation Failures
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication token verification failed';
  }

  // JWT Expired
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session token has expired';
  }

  // Duplicate Database Key Violation (MongoDB 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'unique field';
    message = `Constraint violation: unique index record matching '${duplicatedField}' already exists`;
  }

  const responseBody = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  return res.status(statusCode).json(responseBody);
};
