// Background Service Worker - Handles authentication, messaging, and API proxying
// Manifest V3 requires service workers instead of background pages

import { 
  initializeAuth, 
  getValidToken, 
  getUser, 
  logout, 
  storeWebsiteAuth,
  getAccessToken,
  isAuthenticated 
} from '../services/authManager.js';

const API_BASE = 'http://localhost:5000';

// Auth state
let authState = {
  authenticated: false,
  user: null,
  token: null
};

// Initialize on install
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    console.log('[BG] Extension installed');
    // Initialize auth state
    const result = await initializeAuth();
    updateAuthState(result);
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[BG] Extension startup');
  const result = await initializeAuth();
  updateAuthState(result);
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[BACKGROUND] Received message:', request.action, 'from:', sender.tab?.id || 'popup/extension');
  
  handleMessage(request, sender)
    .then(data => {
      console.log('[BACKGROUND] Sending response for:', request.action);
      sendResponse(data);
    })
    .catch(error => {
      console.error('[BACKGROUND] Error handling message:', error);
      sendResponse({ success: false, message: error.message });
    });
  
  return true; // Keep channel open for async response
});

/**
 * Update auth state and notify all tabs
 */
async function updateAuthState(state) {
  authState = {
    authenticated: state.authenticated || false,
    user: state.user || null,
    token: state.token || null
  };
  
  // Broadcast auth state to all tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'AUTH_STATE_UPDATE',
        ...authState
      });
    } catch (e) {
      // Tab might not have content script
    }
  }
}

/**
 * Main message handler
 */
async function handleMessage(request, sender) {
  console.log('[BG] Received message:', request.action);
  
  switch (request.action) {
    // Auth messages
    case 'GET_AUTH_STATE':
      return authState;
      
    case 'CHECK_AUTH':
      const isAuth = await isAuthenticated();
      return { authenticated: isAuth, user: authState.user };
      
    case 'INIT_AUTH':
      const result = await initializeAuth();
      updateAuthState(result);
      return result;
      
    case 'LOGOUT':
      await logout();
      updateAuthState({ authenticated: false });
      return { success: true };
      
    case 'STORE_AUTH':
      await storeWebsiteAuth(request.token, request.user);
      updateAuthState({ 
        authenticated: true, 
        token: request.token, 
        user: request.user 
      });
      return { success: true };
      
    case 'GET_TOKEN':
      const token = await getValidToken();
      return { token };
      
    case 'REFRESH_TOKEN':
      const { refreshToken } = await import('../services/authManager.js');
      const refreshResult = await refreshToken();
      if (refreshResult.success) {
        authState.token = refreshResult.token;
      }
      return refreshResult;
      
    // Job messages
    case 'EXTRACT_JOB':
      return await extractAndSendJob(request.job);
      
    case 'GET_CURRENT_JOB':
      const job = await getStorageItem('currentJob');
      return job;
      
    case 'SAVE_JOB':
      await setStorageItem('currentJob', request.job);
      // Also sync to backend if authenticated
      if (authState.authenticated) {
        syncJobToBackend(request.job);
      }
      return { success: true };
      
    case 'GET_SAVED_JOBS':
      return await getStorageItem('savedJobs') || [];
      
    case 'SAVE_JOB_TO_LIST':
      return await saveJobToList(request.job);
      
    // Profile messages
    case 'GET_PROFILE':
      return await getStorageItem('userProfile') || null;
      
    case 'SET_PROFILE':
      await setStorageItem('userProfile', request.profile);
      return { success: true };
      
    // Settings messages
    case 'GET_SETTINGS':
      return await getSettings();
      
    case 'SET_SETTINGS':
      await setSettings(request.settings);
      return { success: true };
      
    // Generic API proxy
    case 'API_REQUEST':
      return await proxyApiRequest(request);
      
    default:
      return { success: false, message: 'Unknown action: ' + request.action };
  }
}

/**
 * Proxy API request with automatic token handling
 */
async function proxyApiRequest(request) {
  const { endpoint, method = 'GET', body, requiresAuth = true } = request;
  
  try {
    let token = authState.token;
    
    // Get fresh token if needed
    if (requiresAuth) {
      token = await getValidToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token && requiresAuth) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.message || data.error, status: response.status };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('[BG] API request failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract job and send to backend for analysis
 */
async function extractAndSendJob(job) {
  try {
    const token = await getValidToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const response = await fetch(`${API_BASE}/api/jobs/extract`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(job)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error || 'Extract failed');
    }

    // Store job locally
    await setStorageItem('currentJob', job);
    
    return { 
      success: true, 
      jobId: result.jobId,
      extractedJob: result.extractedJob,
      matchScore: result.matchScore,
      atsScore: result.atsScore,
      missingSkills: result.missingSkills,
      matchingSkills: result.matchingSkills
    };
  } catch (error) {
    console.error('[BG] Extract job failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync job to backend
 */
async function syncJobToBackend(job) {
  try {
    const token = await getValidToken();
    if (!token) return;
    
    await fetch(`${API_BASE}/api/jobs/extract`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(job)
    });
  } catch (error) {
    console.error('[BG] Sync job to backend failed:', error);
  }
}

/**
 * Save job to persistent list
 */
async function saveJobToList(job) {
  const jobs = await getStorageItem('savedJobs') || [];
  
  // Check if job already exists
  const existingIndex = jobs.findIndex(j => j.jobUrl === job.jobUrl);
  
  if (existingIndex >= 0) {
    // Update existing
    jobs[existingIndex] = { ...jobs[existingIndex], ...job, savedAt: new Date().toISOString() };
  } else {
    // Add new
    jobs.unshift({ ...job, savedAt: new Date().toISOString() });
  }
  
  await setStorageItem('savedJobs', jobs);
  
  // Sync to backend
  if (authState.authenticated) {
    syncSavedJobsToBackend(jobs);
  }
  
  return { success: true, savedJobs: jobs };
}

/**
 * Sync saved jobs to backend
 */
async function syncSavedJobsToBackend(jobs) {
  try {
    const token = await getValidToken();
    if (!token) return;
    
    await fetch(`${API_BASE}/api/jobs/sync`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ jobs })
    });
  } catch (error) {
    console.error('[BG] Sync saved jobs failed:', error);
  }
}

// Storage helpers
function getStorageItem(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function setStorageItem(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      const defaults = {
        theme: 'dark',
        autoDetectJob: true,
        notifications: true,
        autoFill: true
      };
      resolve({ ...defaults, ...result.settings });
    });
  });
}

function setSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, () => resolve());
  });
}

// Initialize auth on script load
initializeAuth().then(updateAuthState);

console.log('[BG] Background service worker initialized');