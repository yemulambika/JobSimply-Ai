// Configuration Service - Centralized configuration for the extension
// Handles API URLs, feature flags, and environment-specific settings

const DEFAULT_CONFIG = {
  // API Configuration
  API_BASE: 'http://localhost:5000',
  API_TIMEOUT: 30000,
  
  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF: 2,
  
  // Feature Flags
  FEATURES: {
    autofill: true,
    jobExtraction: true,
    atsScoring: true,
    resumeTailoring: true,
    coverLetters: true,
    aiAssistance: true,
  },
  
  // Storage Keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
    TOKEN_EXPIRY: 'tokenExpiry',
    LAST_SYNC: 'lastSync',
    CONFIG: 'extensionConfig',
  },
  
  // Job Sites
  JOB_SITES: [
    'naukri.com',
    'linkedin.com',
    'indeed.com',
    'glassdoor.com',
    'wellfound.com',
    'greenhouse.io',
    'lever.co',
    'workday.com',
    'ashby.com',
    'smartrecruiters.com',
    'bamboohr.com',
  ],
};

// Global config state
let currentConfig = { ...DEFAULT_CONFIG };

/**
 * Load config from storage or use defaults
 */
export async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['config'], (result) => {
      if (result.config) {
        currentConfig = { ...DEFAULT_CONFIG, ...result.config };
      }
      resolve(currentConfig);
    });
  });
}

/**
 * Save config to storage
 */
export async function saveConfig(config) {
  currentConfig = { ...currentConfig, ...config };
  return new Promise((resolve) => {
    chrome.storage.sync.set({ config: currentConfig }, () => resolve(currentConfig));
  });
}

/**
 * Get current config
 */
export function getConfig() {
  return currentConfig;
}

/**
 * Get API base URL
 */
export function getApiBase() {
  return currentConfig.API_BASE;
}

/**
 * Get full API URL for an endpoint
 */
export function getApiUrl(endpoint) {
  const base = getApiBase().replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature) {
  return currentConfig.FEATURES[feature] === true;
}

/**
 * Get max retries for API calls
 */
export function getMaxRetries() {
  return currentConfig.MAX_RETRIES;
}

/**
 * Reset config to defaults
 */
export async function resetConfig() {
  currentConfig = { ...DEFAULT_CONFIG };
  return new Promise((resolve) => {
    chrome.storage.sync.remove(['config'], () => resolve(currentConfig));
  });
}

export const config = {
  load: loadConfig,
  save: saveConfig,
  get: getConfig,
  getApiBase,
  getApiUrl,
  isFeatureEnabled,
  getMaxRetries,
  reset: resetConfig,
};

export default config;
