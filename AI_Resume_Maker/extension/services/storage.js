// Storage - Chrome storage abstraction with local & sync support
// Re-exports auth storage from authManager for backward compatibility

import { 
  getAccessToken, 
  setAccessToken, 
  getUser, 
  setUser, 
  storage 
} from './authManager.js';

// Legacy token functions for backward compatibility
export async function getToken() {
  return await getAccessToken();
}

export async function setToken(token) {
  await setAccessToken(token);
}

// Local storage for larger data (jobs, activities, etc.)
async function getLocal(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

async function setLocal(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}

// Sync storage for smaller data (preferences, settings)
async function getSync(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => resolve(result[key]));
  });
}

async function setSync(data) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(data, () => resolve());
  });
}

// Current job handling
export async function getCurrentJob() {
  return await getLocal('currentJob');
}

export async function setCurrentJob(job) {
  await setLocal({ currentJob: job });
}

// Activity tracking
export async function getActivity() {
  const activity = await getLocal('activity');
  return activity || [];
}

export async function addActivity(item) {
  const activities = await getActivity();
  activities.unshift(item);
  await setLocal({ activity: activities.slice(0, 50) });
}

// Extension settings/preferences
export async function getSettings() {
  const defaults = {
    theme: 'dark',
    autoDetectJob: true,
    notifications: true,
    autoFill: true,
    soundEnabled: false
  };
  const settings = await getSync('settings') || {};
  return { ...defaults, ...settings };
}

export async function setSettings(settings) {
  await setSync({ settings });
}

// Re-export auth functions
export {
  getAccessToken,
  setAccessToken,
  getUser,
  setUser,
  storage
};