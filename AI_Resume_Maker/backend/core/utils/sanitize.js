/**
 * Input Sanitization Utilities
 * Provides functions to sanitize and validate user input
 */

/**
 * Sanitize a string to prevent XSS attacks
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize an object by sanitizing all string values
 */
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate URL with protocol
 */
export function isValidHttpUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Trim and limit string length
 */
export function truncateString(input, maxLength = 1000) {
  if (typeof input !== 'string') return input;
  return input.trim().slice(0, maxLength);
}

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(query) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  
  // Default values
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  
  // Maximum limits
  page = Math.min(page, 1000);
  limit = Math.min(limit, 100);
  
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query) {
  if (typeof query !== 'string') return '';
  return query.trim().slice(0, 200);
}
