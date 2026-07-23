// API Service - Single endpoint for job extraction only
// All AI processing happens on the website/backend

import { getApiBase, getMaxRetries } from './config.js';

// Global state for current token - shared across all API calls
let currentToken = null;
let refreshTokenInProgress = null;

// Set the current token (called by popup when token is received)
export function setToken(token) {
  currentToken = token;
}

// Get the current token
export function getToken() {
  return currentToken;
}

// Refresh the JWT token using the refresh endpoint
async function refreshAuthToken() {
  // Prevent multiple simultaneous refresh calls
  if (!refreshTokenInProgress) {
    refreshTokenInProgress = (async () => {
      try {
        const response = await fetch(`${getApiBase()}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Include cookies for refresh token
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            currentToken = data.accessToken;
            // Notify extension about new token
            chrome.runtime.sendMessage({ action: 'AUTH_UPDATED', token: data.accessToken });
            return data.accessToken;
          }
        }
        // Refresh failed - clear token
        currentToken = null;
        return null;
      } finally {
        refreshTokenInProgress = null;
      }
    })();
  }
  return refreshTokenInProgress;
}

// Extract job - sends job JSON to backend, returns analysis results
export async function extractJob(job, token) {
  // Use provided token or current cached token
  let activeToken = token || currentToken;
  
  // Validate that we have a token
  if (!activeToken) {
    throw new Error('No authentication token provided. Please log in to JobSimply website first.');
  }
  
  const response = await fetch(`${getApiBase()}/api/jobs/extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${activeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(job)
  });

  const data = await response.json();
  
  // If token expired, try to refresh and retry
  if (!response.ok && data.message === 'jwt expired') {
    console.log('[API] Token expired, attempting refresh...');
    const newToken = await refreshAuthToken();
    
    if (newToken) {
      // Retry with new token
      const retryResponse = await fetch(`${getApiBase()}/api/jobs/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(job)
      });
      
      const retryData = await retryResponse.json();
      
      if (!retryResponse.ok) {
        const errorMsg = retryData.message || retryData.error || retryResponse.statusText;
        throw new Error(errorMsg);
      }
      
      return retryData;
    } else {
      throw new Error('Session expired. Please log in to JobSimply website again.');
    }
  }
  
  if (!response.ok) {
    const errorMsg = data.message || data.error || response.statusText;
    throw new Error(errorMsg);
  }

  return data;
}

// Check session status - can be called to verify auth
export async function checkSession() {
  try {
    const response = await fetch(`${getApiBase()}/auth/session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.authenticated && data.token) {
      currentToken = data.token;
    }
    
    return data;
  } catch (error) {
    return { authenticated: false };
  }
}