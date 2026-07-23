/**
 * Input Validation Middleware
 * Validates and sanitizes incoming request data
 */

import { sanitizeObject, parsePaginationParams, sanitizeSearchQuery } from '../core/utils/sanitize.js';

/**
 * Sanitize request body
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Validate and parse pagination parameters
 */
export function validatePagination(req, res, next) {
  const { page, limit, offset } = parsePaginationParams(req.query);
  req.pagination = { page, limit, offset };
  next();
}

/**
 * Sanitize search query parameter
 */
export function sanitizeQuery(req, res, next) {
  if (req.query.query) {
    req.query.query = sanitizeSearchQuery(req.query.query);
  }
  next();
}

/**
 * Validate required fields in request body
 */
export function requireFields(fields) {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing required fields: ${missing.join(', ')}`,
        },
      });
    }
    
    next();
  };
}

/**
 * Validate request body is an object
 */
export function requireBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body must be a JSON object',
      },
    });
  }
  next();
}
