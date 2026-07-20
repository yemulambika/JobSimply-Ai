import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for auth endpoints to prevent credential stuffing and brute-force attacks.
 * - 10 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    stage: 'rate-limit',
    error: 'Too many authentication attempts, please try again later.',
  },
});

/**
 * Moderate limiter for expensive AI-API endpoints:
 * - /api/jobs/extract
 * - POST /api/tailor/generate or similar resume generation
 * - /api/coverletters/generate
 * - 30 requests per minute per IP
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    stage: 'rate-limit',
    error: 'Too many AI requests, please slow down and try again later.',
  },
});

/**
 * General limiter for all other authenticated API routes.
 * - 100 requests per minute per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    stage: 'rate-limit',
    error: 'Too many requests, please try again later.',
  },
});