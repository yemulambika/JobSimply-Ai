// Retry utility - Handles retries with exponential backoff for failed API calls

import { getMaxRetries } from './config.js';

const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_BACKOFF = 2;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryable(error) {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  // Server errors (5xx)
  if (error.status >= 500) {
    return true;
  }
  // Rate limiting
  if (error.status === 429) {
    return true;
  }
  // Timeout
  if (error.status === 408) {
    return true;
  }
  return false;
}

/**
 * Execute a function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || getMaxRetries() || 3;
  const baseDelay = options.delay || DEFAULT_RETRY_DELAY;
  const backoff = options.backoff || DEFAULT_BACKOFF;
  const retryable = options.retryable || isRetryable;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = attempt < maxRetries && retryable(error);
      
      if (!shouldRetry) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(backoff, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Make a fetch request with retry logic
 */
export async function fetchWithRetry(url, options = {}) {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    // Create error object for retry logic
    const error = {
      status: response.status,
      message: response.statusText,
      ok: response.ok
    };
    
    if (!response.ok) {
      throw error;
    }
    
    return response;
  }, options);
}

/**
 * Make an authenticated API request with retry
 */
export async function apiRequestWithRetry(url, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetchWithRetry(url, {
    ...options,
    headers
  });
  
  return response.json();
}

export const retry = {
  withRetry,
  fetchWithRetry,
  apiRequestWithRetry,
  isRetryable,
  sleep
};

export default retry;
