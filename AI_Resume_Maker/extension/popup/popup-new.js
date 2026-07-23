// JobSimply AI - Modern Extension Popup
// Handles: Auth, Tabs, Job Detection, Profile, Autofill UI

// =============================================
// STATE
// =============================================

const state = {
  authenticated: false,
  user: null,
  token: null,
  currentJob: null,
  savedJobs: [],
  applications: [],
  profile: null,
  settings: null,
  activeTab: 'autofill'
};

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  console.log('[POPUP] Initializing...');
  
  // Load settings
  await loadSettings();
  
  // Apply theme
  applyTheme();
  
  // Check authentication
  await checkAuth();
  
  // Setup event listeners
  setupEventListeners();
  
  // Hide loading state
  hideLoading();
}

async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
    state.settings = response || { theme: 'dark', autoDetectJob: true };
  } catch (e) {
    state.settings = { theme: 'dark', autoDetectJob: true };
  }
}

function applyTheme() {
  if (state.settings?.theme) {
    document.body.setAttribute('data-theme', state.settings.theme);
  }
}

// =============================================
// AUTH
// =============================================

async function checkAuth() {
  try {
    // Try to get auth from background
    const authResponse = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
    
    if (authResponse?.authenticated) {
      state.authenticated = true;
      state.user = authResponse.user;
      state.token = await getValidToken();
      showDashboard();
      await loadData();
    } else {
      // Try to get from website
      const websiteAuth = await getAuthFromWebsite();
      if (websiteAuth.authenticated) {
        state.authenticated = true;
        state.user = websiteAuth.user;
        state.token = websiteAuth.token;
        showDashboard();
        await loadData();
      } else {
        showAuthSection();
      }
    }
  } catch (error) {
    console.error('[POPUP] Auth check failed:', error);
    showAuthSection();
  }
}

async function getAuthFromWebsite() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        resolve({ authenticated: false });
        return;
      }
      
      try {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'GET_AUTH_STATE' },
          (response) => {
            if (response?.authenticated) {
              resolve({
                authenticated: true,
                token: response.token,
                user: response.user
              });
            } else {
              resolve({ authenticated: false });
            }
          }
        );
      } catch (e) {
        resolve({ authenticated: false });
      }
    });
  });
}

async function getValidToken() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_TOKEN' });
    return response?.token;
  } catch (e) {
    return null;
  }
}

async function logout() {
  try {
    await chrome.runtime.sendMessage({ action: 'LOGOUT' });
  } catch (e) {}
  
  state.authenticated = false;
  state.user = null;
  state.token = null;
  showAuthSection();
}

function showAuthSection() {
  document.getElementById('loading-state')?.classList.add('hidden');
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('dashboard-section')?.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loading-state')?.classList.add('hidden');
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('dashboard-section')?.classList.remove('hidden');
  
  // Update user info
  if (state.user) {
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');
    
    if (nameEl) nameEl.textContent = state.user.name || 'User';
    if (emailEl) emailEl.textContent = state.user.email || '';
    if (avatarEl) avatarEl.textContent = (state.user.name || 'U').charAt(0).toUpperCase();
  }
}

function hideLoading() {
  document.getElementById('loading-state')?.classList.add('hidden');
}

// =============================================
// DATA LOADING
// =============================================

async function loadData() {
  await Promise.all([
    loadCurrentJob(),
    loadSavedJobs(),
    loadApplications(),
    loadProfile()
  ]);
  
  updateUI();
}

async function loadCurrentJob() {
  try {
    // Query the active tab to get current page's job
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab) {
      console.log('[POPUP] No active tab found');
      state.currentJob = null;
      return;
    }
    
    // Check if the active tab is a job site we support
    const jobSites = ['naukri.com', 'linkedin.com', 'indeed.com', 'glassdoor.com', 
                      'wellfound.com', 'greenhouse.io', 'lever.co', 'workday.com', 
                      'ashby.com', 'smartrecruiters.com', 'bamboohr.com'];
    const isJobSite = jobSites.some(site => activeTab.url?.includes(site));
    
    if (!isJobSite) {
      console.log('[POPUP] Active tab is not a job site, clearing cached job');
      state.currentJob = null;
      // Clear the cached job from storage
      await chrome.runtime.sendMessage({ action: 'CLEAR_CURRENT_JOB' });
      return;
    }
    
    // Ask the content script for the current job
    console.log('[POPUP] Querying content script for job on:', activeTab.url);
    const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CURRENT_JOB' });
    
    if (response?.success && response.job) {
      console.log('[POPUP] Job found:', response.job.title, '@', response.job.company);
      state.currentJob = response.job;
      // Update the cache in background
      await chrome.runtime.sendMessage({ action: 'SAVE_JOB', job: response.job });
    } else {
      console.log('[POPUP] No job detected on current page');
      state.currentJob = null;
      // Clear the cached job
      await chrome.runtime.sendMessage({ action: 'CLEAR_CURRENT_JOB' });
    }
  } catch (e) {
    console.error('[POPUP] Failed to load current job:', e);
    state.currentJob = null;
  }
}

async function loadSavedJobs() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_SAVED_JOBS' });
    state.savedJobs = response || [];
  } catch (e) {
    state.savedJobs = [];
  }
}

async function loadApplications() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'API_REQUEST',
      endpoint: '/applications',
      requiresAuth: true
    });
    
    if (response?.success) {
      state.applications = response.data?.applications || [];
    } else {
      state.applications = [];
    }
  } catch (e) {
    state.applications = [];
  }
}

async function loadProfile() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_PROFILE' });
    state.profile = response || null;
  } catch (e) {
    state.profile = null;
  }
}

// =============================================
// UI UPDATES
// =============================================

function updateUI() {
  updateAutofillTab();
  updateScoreTab();
  updateJobsTab();
  updateTrackerTab();
  updateProfileTab();
}

function updateAutofillTab() {
  const jobCard = document.getElementById('autofill-job-card');
  
  if (state.currentJob) {
    jobCard?.classList.remove('hidden');
    document.getElementById('af-job-title').textContent = state.currentJob.title || 'Unknown';
    document.getElementById('af-job-company').textContent = state.currentJob.company || '';
    document.getElementById('af-job-location').textContent = state.currentJob.location || '📍 Not specified';
    document.getElementById('af-job-source').textContent = state.currentJob.source || '';
  } else {
    jobCard?.classList.add('hidden');
  }
}

function updateScoreTab() {
  const jobCard = document.getElementById('score-job-card');
  const scoreDisplay = document.getElementById('score-display');
  const keywordsSection = document.getElementById('keywords-analysis');
  
  if (state.currentJob) {
    jobCard?.classList.remove('hidden');
    document.getElementById('score-job-title').textContent = state.currentJob.title || 'Unknown';
    document.getElementById('score-job-company').textContent = state.currentJob.company || '';
    
    // Show score if available
    if (state.currentJob.atsScore !== undefined) {
      scoreDisplay?.classList.remove('hidden');
      keywordsSection?.classList.remove('hidden');
      
      // Animate score
      animateScore(state.currentJob.atsScore || 0);
      
      // Update keywords
      updateKeywords(state.currentJob.matchingSkills || [], state.currentJob.missingSkills || []);
    } else {
      scoreDisplay?.classList.add('hidden');
      keywordsSection?.classList.add('hidden');
    }
  } else {
    jobCard?.classList.add('hidden');
    scoreDisplay?.classList.add('hidden');
    keywordsSection?.classList.add('hidden');
  }
}

function animateScore(score) {
  const progress = document.getElementById('score-progress');
  const number = document.getElementById('score-number');
  
  if (!progress || !number) return;
  
  const circumference = 2 * Math.PI * 45; // r=45
  const offset = circumference - (score / 100) * circumference;
  
  progress.style.strokeDashoffset = offset;
  number.textContent = score;
}

function updateKeywords(matched, missing) {
  const matchedEl = document.getElementById('matched-keywords');
  const missingEl = document.getElementById('missing-keywords');
  
  if (matchedEl) {
    matchedEl.innerHTML = matched.slice(0, 10).map(k => 
      `<span class="chip">${k}</span>`
    ).join('') || '<span class="text-muted">None</span>';
  }
  
  if (missingEl) {
    missingEl.innerHTML = missing.slice(0, 10).map(k => 
      `<span class="chip">${k}</span>`
    ).join('') || '<span class="text-muted">None</span>';
  }
}

function updateJobsTab() {
  const jobsList = document.getElementById('saved-jobs-list');
  const noJobs = document.getElementById('no-jobs');
  
  if (!jobsList || !noJobs) return;
  
  if (state.savedJobs.length > 0) {
    jobsList.classList.remove('hidden');
    noJobs.classList.add('hidden');
    
    jobsList.innerHTML = state.savedJobs.slice(0, 10).map(job => `
      <div class="job-item" data-job-id="${job.id || job.jobUrl}">
        <div class="job-item-header">
          <span class="job-item-title">${job.title || 'Unknown'}</span>
        </div>
        <div class="job-item-company">${job.company || ''}</div>
        <div class="job-item-meta">
          <span>${job.location || 'Unknown location'}</span>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    jobsList.querySelectorAll('.job-item').forEach(item => {
      item.addEventListener('click', () => {
        const jobId = item.dataset.jobId;
        chrome.tabs.create({ url: `http://localhost:5173/jobs/${jobId}` });
      });
    });
  } else {
    jobsList.classList.add('hidden');
    noJobs.classList.remove('hidden');
  }
}

function updateTrackerTab() {
  // Update stats
  const applied = state.applications.filter(a => a.status === 'applied').length;
  const interviews = state.applications.filter(a => 
    ['interview', 'technical', 'hr', 'onsite'].includes(a.status)
  ).length;
  const offers = state.applications.filter(a => a.status === 'offer').length;
  
  document.getElementById('stat-applied').textContent = applied;
  document.getElementById('stat-interviews').textContent = interviews;
  document.getElementById('stat-offers').textContent = offers;
  
  // Update list
  const trackerList = document.getElementById('tracker-list');
  if (!trackerList) return;
  
  if (state.applications.length > 0) {
    trackerList.classList.remove('hidden');
    trackerList.innerHTML = state.applications.slice(0, 10).map(app => `
      <div class="tracker-item" data-app-id="${app.id}">
        <div class="tracker-status-dot ${app.status}"></div>
        <div class="tracker-info">
          <div class="tracker-title">${app.jobTitle || 'Unknown'}</div>
          <div class="tracker-company">${app.jobCompany || ''}</div>
        </div>
        <div class="tracker-date">${formatDate(app.createdAt)}</div>
      </div>
    `).join('');
  } else {
    trackerList.innerHTML = `
      <div class="empty-state">
        <p>No applications tracked yet</p>
      </div>
    `;
  }
}

function updateProfileTab() {
  if (!state.profile) {
    // Load from API
    loadProfileFromAPI();
    return;
  }
  
  // Personal info
  document.getElementById('pf-name').textContent = state.profile.name || '-';
  document.getElementById('pf-email').textContent = state.profile.email || '-';
  document.getElementById('pf-phone').textContent = state.profile.phone || '-';
  document.getElementById('pf-location').textContent = 
    [state.profile.city, state.profile.country].filter(Boolean).join(', ') || '-';
  
  // Professional info
  document.getElementById('pf-ctc').textContent = state.profile.currentCtc || '-';
  document.getElementById('pf-expected').textContent = state.profile.expectedSalary || '-';
  document.getElementById('pf-notice').textContent = state.profile.noticePeriod || '-';
  
  // Skills
  const skillsEl = document.getElementById('pf-skills');
  if (skillsEl && state.profile.skills) {
    const skills = Array.isArray(state.profile.skills) 
      ? state.profile.skills 
      : Object.values(state.profile.skills).flat();
    skillsEl.innerHTML = skills.slice(0, 15).map(s => 
      `<span class="chip">${typeof s === 'string' ? s : s.name}</span>`
    ).join('') || '-';
  }
}

async function loadProfileFromAPI() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'API_REQUEST',
      endpoint: '/profile',
      requiresAuth: true
    });
    
    if (response?.success && response.data?.profile) {
      state.profile = response.data.profile;
      updateProfileTab();
    }
  } catch (e) {
    console.log('[POPUP] Failed to load profile');
  }
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Auth section
  document.getElementById('open-website-btn')?.addEventListener('click', openWebsite);
  
  // Header buttons
  document.getElementById('settings-btn')?.addEventListener('click', openSettings);
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  
  // Autofill tab
  document.getElementById('af-start-btn')?.addEventListener('click', startAutofill);
  document.getElementById('af-profile-btn')?.addEventListener('click', () => switchTab('profile'));
  
  // Score tab
  document.getElementById('score-analyze-btn')?.addEventListener('click', analyzeResume);
  document.getElementById('score-tailor-btn')?.addEventListener('click', tailorResume);
  
  // Jobs tab
  document.getElementById('refresh-jobs-btn')?.addEventListener('click', loadSavedJobs);
  document.getElementById('find-jobs-btn')?.addEventListener('click', openJobsPage);
  
  // Profile tab
  document.getElementById('edit-profile-btn')?.addEventListener('click', editProfile);
  document.getElementById('cancel-edit-btn')?.addEventListener('click', cancelEditProfile);
  document.getElementById('profile-form')?.addEventListener('submit', saveProfile);
  document.getElementById('upload-resume-btn')?.addEventListener('click', openResumePage);
  document.getElementById('sync-profile-btn')?.addEventListener('click', syncProfile);
  
  // Listen for auth updates
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'AUTH_STATE_UPDATE') {
      state.authenticated = request.authenticated;
      state.user = request.user;
      state.token = request.token;
      
      if (request.authenticated) {
        showDashboard();
        loadData();
      } else {
        showAuthSection();
      }
    }
  });
}

// =============================================
// TAB SWITCHING
// =============================================

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });
  
  // Update UI for the active tab
  setTimeout(() => {
    switch (tabId) {
      case 'jobs':
        updateJobsTab();
        break;
      case 'tracker':
        updateTrackerTab();
        break;
      case 'profile':
        updateProfileTab();
        break;
    }
  }, 50);
}

// =============================================
// ACTIONS
// =============================================

function openWebsite() {
  chrome.tabs.create({ url: 'http://localhost:5173/login' });
}

function openSettings() {
  chrome.tabs.create({ url: 'http://localhost:5173/settings' });
}

async function startAutofill() {
  if (!state.currentJob) {
    showToast('Navigate to a job application page first', 'error');
    return;
  }
  
  // Get current tab and send message to content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    try {
      chrome.tabs.sendMessage(tab.id, { action: 'START_AUTOFILL' });
      showToast('Autofill started!', 'success');
    } catch (e) {
      showToast('Could not start autofill on this page', 'error');
    }
  }
}

async function analyzeResume() {
  if (!state.currentJob) {
    showToast('No job detected. Navigate to a job page first.', 'error');
    return;
  }
  
  // Open analysis on website
  const jobId = state.currentJob.id || 'new';
  chrome.tabs.create({ 
    url: `http://localhost:5173/jobs/${jobId}` 
  });
}

function tailorResume() {
  if (!state.currentJob?.id) {
    showToast('Save the job first to generate a tailored resume', 'error');
    return;
  }
  
  chrome.tabs.create({ 
    url: `http://localhost:5173/jobs/${state.currentJob.id}` 
  });
}

function openJobsPage() {
  chrome.tabs.create({ url: 'http://localhost:5173/jobs' });
}

function editProfile() {
  document.getElementById('profile-view')?.classList.add('hidden');
  document.getElementById('profile-edit')?.classList.remove('hidden');
  
  // Populate form
  if (state.profile) {
    document.getElementById('edit-name').value = state.profile.name || '';
    document.getElementById('edit-email').value = state.profile.email || '';
    document.getElementById('edit-phone').value = state.profile.phone || '';
    document.getElementById('edit-location').value = 
      [state.profile.city, state.profile.country].filter(Boolean).join(', ') || '';
  }
}

function cancelEditProfile() {
  document.getElementById('profile-view')?.classList.remove('hidden');
  document.getElementById('profile-edit')?.classList.add('hidden');
}

async function saveProfile(e) {
  e.preventDefault();
  
  const profile = {
    name: document.getElementById('edit-name').value,
    email: document.getElementById('edit-email').value,
    phone: document.getElementById('edit-phone').value,
    city: '',
    country: ''
  };
  
  const location = document.getElementById('edit-location').value;
  if (location.includes(',')) {
    const parts = location.split(',');
    profile.city = parts[0].trim();
    profile.country = parts.slice(1).join(',').trim();
  } else {
    profile.city = location;
  }
  
  // Save to storage
  await chrome.runtime.sendMessage({ 
    action: 'SET_PROFILE', 
    profile 
  });
  
  // Also save to backend
  await chrome.runtime.sendMessage({
    action: 'API_REQUEST',
    endpoint: '/profile',
    method: 'PUT',
    body: profile,
    requiresAuth: true
  });
  
  state.profile = profile;
  updateProfileTab();
  cancelEditProfile();
  showToast('Profile saved!', 'success');
}

function openResumePage() {
  chrome.tabs.create({ url: 'http://localhost:5173/resume' });
}

async function syncProfile() {
  // Fetch profile from backend
  const response = await chrome.runtime.sendMessage({
    action: 'API_REQUEST',
    endpoint: '/profile',
    requiresAuth: true
  });
  
  if (response?.success && response.data?.profile) {
    state.profile = response.data.profile;
    
    // Save to local storage
    await chrome.runtime.sendMessage({
      action: 'SET_PROFILE',
      profile: response.data.profile
    });
    
    updateProfileTab();
    showToast('Profile synced!', 'success');
  } else {
    showToast('Failed to sync profile', 'error');
  }
}

// =============================================
// UTILITIES
// =============================================

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastMessage) return;
  
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

console.log('[POPUP] Popup script loaded');
