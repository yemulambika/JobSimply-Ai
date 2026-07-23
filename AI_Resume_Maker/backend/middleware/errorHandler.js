import { AppError } from '../core/errors/AppError.js';
import { logger } from '../core/logger/index.js';

export function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Handle validation errors (e.g., from Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors,
      },
    });
  }

  // Handle PostgreSQL errors
  if (err.code && typeof err.code === 'string' && err.code.length === 5) {
    // PostgreSQL error codes are 5 characters
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Resource already exists',
        },
      });
    }
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced resource not found',
        },
      });
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }

  // Default to 500 internal server error
  const statusCode = err.statusCode || err.status || 500;
  const response = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
