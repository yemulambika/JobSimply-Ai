// Enhanced Auth Manager - Handles JWT, refresh tokens, and session sync
// Manages authentication state for both extension and website

import { getApiBase } from './config.js';

const REFRESH_ENDPOINT = '/auth/refresh';
const SESSION_ENDPOINT = '/auth/session';

// Token storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  TOKEN_EXPIRY: 'tokenExpiry',
  LAST_SYNC: 'lastSync'
};

// Default expiry time (7 days in ms)
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * Get item from chrome storage
 */
async function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

/**
 * Set item in chrome storage
 */
async function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}

/**
 * Get multiple items from storage
 */
async function getStorageMultiple(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

/**
 * Clear all auth data
 */
async function clearAuth() {
  const keysToRemove = Object.values(STORAGE_KEYS);
  return new Promise((resolve) => {
    chrome.storage.local.remove(keysToRemove, () => resolve());
  });
}

/**
 * Decode JWT to check expiry (without verification - we trust the backend)
 */
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired or about to expire
 */
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    // Add 5 minute buffer before actual expiry
    return Date.now() >= (decoded.exp * 1000) - (5 * 60 * 1000);
  } catch {
    return true;
  }
}

/**
 * Get current access token
 */
export async function getAccessToken() {
  return await getStorage(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Set access token with expiry
 */
export async function setAccessToken(token) {
  const expiry = DEFAULT_EXPIRY;
  await setStorage({
    [STORAGE_KEYS.ACCESS_TOKEN]: token,
    [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + expiry
  });
}

/**
 * Get stored user
 */
export async function getUser() {
  return await getStorage(STORAGE_KEYS.USER);
}

/**
 * Set stored user
 */
export async function setUser(user) {
  await setStorage({ [STORAGE_KEYS.USER]: user });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const token = await getAccessToken();
  return !!token && !isTokenExpired(token);
}

/**
 * Get session from backend using refresh token cookie
 * This is the primary method to validate/restore session
 */
export async function getSession() {
  try {
    const response = await fetch(`${getApiBase()}${SESSION_ENDPOINT}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.authenticated && data.token) {
      await setAccessToken(data.token);
      await setUser(data.user);
      await setStorage({ [STORAGE_KEYS.LAST_SYNC]: Date.now() });
      return {
        authenticated: true,
        token: data.token,
        user: data.user
      };
    }

    return { authenticated: false };
  } catch (error) {
    console.error('[AUTH] Session fetch failed:', error);
    return { authenticated: false, error: error.message };
  }
}

/**
 * Refresh the access token using refresh token cookie
 */
export async function refreshToken() {
  try {
    const response = await fetch(`${getApiBase()}${REFRESH_ENDPOINT}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const data = await response.json();
    
    if (data.accessToken) {
      await setAccessToken(data.accessToken);
      return { success: true, token: data.accessToken };
    }

    throw new Error('No access token in response');
  } catch (error) {
    console.error('[AUTH] Token refresh failed:', error);
    // Clear auth on refresh failure
    await clearAuth();
    return { success: false, error: error.message };
  }
}

/**
 * Get valid token - returns current token if valid, or refreshes if needed
 */
export async function getValidToken() {
  let token = await getAccessToken();
  
  if (isTokenExpired(token)) {
    console.log('[AUTH] Token expired, attempting refresh...');
    const refreshResult = await refreshToken();
    if (refreshResult.success) {
      return refreshResult.token;
    }
    // Try session as fallback
    const sessionResult = await getSession();
    if (sessionResult.authenticated) {
      return sessionResult.token;
    }
    return null;
  }
  
  return token;
}

/**
 * Set full auth data (from login/register)
 */
export async function setAuth(accessToken, user) {
  await setAccessToken(accessToken);
  await setUser(user);
  await setStorage({ [STORAGE_KEYS.LAST_SYNC]: Date.now() });
}

/**
 * Logout - clear all auth data
 */
export async function logout() {
  try {
    // Call backend logout endpoint
    await fetch(`${getApiBase()}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('[AUTH] Backend logout failed:', error);
  }
  await clearAuth();
}

/**
 * Initialize auth - check for existing session
 * Call this on extension startup
 */
export async function initializeAuth() {
  // First check if we have a stored token
  const existingToken = await getAccessToken();
  
  if (existingToken && !isTokenExpired(existingToken)) {
    console.log('[AUTH] Found valid cached token');
    const user = await getUser();
    return { authenticated: true, token: existingToken, user };
  }
  
  // Try to get session from backend (uses refresh token cookie)
  console.log('[AUTH] No valid cached token, checking session...');
  const sessionResult = await getSession();
  
  if (sessionResult.authenticated) {
    return sessionResult;
  }
  
  return { authenticated: false };
}

/**
 * Store auth from website login (called via content script)
 */
export async function storeWebsiteAuth(token, user) {
  await setAuth(token, user);
  console.log('[AUTH] Auth stored from website');
}

/**
 * Get last sync timestamp
 */
export async function getLastSync() {
  return await getStorage(STORAGE_KEYS.LAST_SYNC);
}

// Export storage utilities for other services
export const storage = {
  get: getStorage,
  set: setStorage,
  getMultiple: getStorageMultiple,
  clear: clearAuth
};
