import jwt from 'jsonwebtoken';
import { logger } from '../core/logger/index.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: Missing token', { path: req.path });
    return res.status(401).json({ 
      success: false,
      error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication token missing' }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    req.user = decoded;
    logger.debug('User authenticated', { userId: decoded.id });
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.warn('Authentication failed: Token expired', { path: req.path });
      return res.status(401).json({ 
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expired' }
      });
    }
    if (err.name === 'JsonWebTokenError') {
      logger.warn('Authentication failed: Invalid token', { path: req.path });
      return res.status(403).json({ 
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
      });
    }
    logger.error('Authentication error', { error: err.message, path: req.path });
    return res.status(403).json({ 
      success: false,
      error: { code: 'AUTHENTICATION_ERROR', message: err.message }
    });
  }
}
