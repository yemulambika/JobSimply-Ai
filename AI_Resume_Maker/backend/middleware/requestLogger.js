/**
 * Request Logging Middleware
 * Logs all incoming requests with structured logging
 */

import { logger } from '../core/logger/index.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  logger.http('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });
  
  next();
}
