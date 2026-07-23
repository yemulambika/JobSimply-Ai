// Extension Architecture - Chrome Extension Entry Point
// JobSimply - Job Application Assistant
// Live authentication via PING/GET_TOKEN with retry

import { showStatus } from '../services/ui.js';
import * as API from '../services/apiService.js';

let currentJob = null;
let pageToken = null;
let savedJobId = null;
let userProfile = null;
let isDarkMode = false;

console.log('[POPUP] Loaded');

// Initialize on popup open
document.addEventListener('DOMContentLoaded', initialize);

// Theme toggle function
function toggleTheme() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);
  chrome.storage.sync.set({ theme: isDarkMode ? 'dark' : 'light' });
  
  // Update theme icon
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.innerHTML = isDarkMode ? 
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>` :
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>`;
  }
}

async function loadTheme() {
  const result = await chrome.storage.sync.get(['theme']);
  isDarkMode = result.theme === 'dark';
  document.body.classList.toggle('dark-mode', isDarkMode);
}

// Listen for auth updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[POPUP] Received message:', request.action);
  
  if (request.action === 'AUTH_UPDATED') {
    console.log('[POPUP] Auth updated, token received');
    pageToken = request.token;
    API.setToken(request.token);
    switchToDashboard();
    detectAndSaveJob();
  } else if (request.action === 'AUTH_LOGOUT') {
    console.log('[POPUP] Auth logout received');
    pageToken = null;
    API.setToken(null);
    currentJob = null;
    savedJobId = null;
    switchToAuth();
  }
});

/**
 * Get token from JobSimply website only
 * This ensures we get a valid JWT, not tokens from job sites like naukri
 */
async function getValidToken() {
  // First check if we have a cached token
  if (pageToken) {
    console.log('[POPUP] Using cached token');
    return pageToken;
  }
  
  // Try to get token from JobSimply tabs only
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && isJobSimplyWebsite(tab.url)) {
      try {
        const tokenResponse = await chrome.tabs.sendMessage(tab.id, { action: 'GET_TOKEN' });
        if (tokenResponse?.token) {
          console.log('[POPUP] Got valid token from JobSimply tab');
          return tokenResponse.token;
        }
      } catch (e) {
        console.log('[POPUP] Could not get token from JobSimply tab');
      }
    }
  }
  
  console.log('[POPUP] No valid token found');
  return null;
}

async function initialize() {
  console.log('[POPUP] Initializing...');
  
  // Load theme
  await loadTheme();
  
  // Setup event listeners
  setupEventListeners();
  
  // If we already have a token in memory, use it
  if (pageToken) {
    console.log('[POPUP] Have cached token, switching to dashboard');
    switchToDashboard();
    await detectAndSaveJob();
    return;
  }

  console.log('[POPUP] No cached token, requesting from tabs');

  // Try to get token from tabs with JobSimply website
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && isJobSimplyWebsite(tab.url)) {
      console.log('[POPUP] Found JobSimply tab, checking auth');
      const token = await pingAndGetToken(tab.id);
      if (token) {
        console.log('[POPUP] Token obtained, staying logged in');
        return;
      }
    }
  }

  // No auth found, show login prompt
  console.log('[POPUP] No auth found, showing login prompt');
  switchToAuth();
}

function isJobSimplyWebsite(url) {
  return url.includes('localhost:5173') || url.includes('127.0.0.1:5173') || 
         url.includes('localhost:5174') || url.includes('127.0.0.1:5174');
}

function switchToAuth() {
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('dashboard-section')?.classList.add('hidden');
}

function switchToDashboard() {
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('dashboard-section')?.classList.remove('hidden');
}

async function pingAndGetToken(tabId) {
  console.log('[POPUP] Sending PING to tab', tabId);
  
  // Try to PING the content script
  try {
    const pingResponse = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
    console.log('[POPUP] PING response:', pingResponse);
    
    if (pingResponse?.success) {
      console.log('[POPUP] Content script alive, getting token');
      const tokenResponse = await chrome.tabs.sendMessage(tabId, { action: 'GET_TOKEN' });
      if (tokenResponse?.token) {
        pageToken = tokenResponse.token;
        API.setToken(tokenResponse.token);
        switchToDashboard();
        detectAndSaveJob();
        return tokenResponse.token;
      }
    }
  } catch (pingError) {
    console.log('[POPUP] PING failed, content script may not exist:', pingError.message);
    // Content script not injected, try to inject it
    if (pingError.message?.includes('Receiving end does not exist')) {
      console.log('[POPUP] Injecting content script');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content/content.js']
        });
        // Wait a bit for script to initialize
        await new Promise(r => setTimeout(r, 800));
        
        // Try PING again
        console.log('[POPUP] Re-sending PING after injection');
        const retryResponse = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
        if (retryResponse?.success) {
          const tokenResponse = await chrome.tabs.sendMessage(tabId, { action: 'GET_TOKEN' });
          if (tokenResponse?.token) {
            pageToken = tokenResponse.token;
            API.setToken(tokenResponse.token);
            switchToDashboard();
            detectAndSaveJob();
            return tokenResponse.token;
          }
        }
      } catch (injectError) {
        console.log('[POPUP] Injection failed:', injectError);
      }
    }
  }
  
  return null;
}

async function detectAndSaveJob() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.log('[POPUP] No active tab found');
      return;
    }

    const url = tab.url || '';
    const supportedSites = [
      'naukri.com', 'linkedin.com', 'indeed.com', 'glassdoor.com',
      'wellfound.com', 'greenhouse.io', 'lever.co', 'workday.com',
      'ashby.com', 'smartrecruiters.com'
    ];

    const isJobSite = supportedSites.some(site => url.includes(site));
    
    if (!isJobSite) {
      console.log('[POPUP] Not a job site, hiding job card');
      document.getElementById('job-card')?.classList.add('hidden');
      return;
    }

    // Try to get job data with retry
    let response = await getJobDataWithRetry(tab.id);
    
    if (response?.success && response.job) {
      currentJob = response.job;
      await saveJobAndDisplay(currentJob);
    } else {
      console.log('[POPUP] No job data available');
      document.getElementById('job-card')?.classList.add('hidden');
    }
  } catch (error) {
    console.log('[POPUP] Error detecting job:', error);
  }
}

async function getJobDataWithRetry(tabId, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[POPUP] Attempting to get job data (attempt ${attempt}/${maxRetries})`);
      
      // Try to PING first
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'PING' });
      } catch (pingError) {
        if (pingError.message?.includes('Receiving end does not exist')) {
          console.log('[POPUP] Content script not found, injecting...');
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
          });
          await new Promise(r => setTimeout(r, 800));
        } else {
          throw pingError;
        }
      }
      
      const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_CURRENT_JOB' });
      if (response?.success) {
        return response;
      }
    } catch (error) {
      console.log(`[POPUP] Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  
  return { success: false };
}

async function saveJobAndDisplay(job) {
  try {
    showStatus('Saving job...', 'info');
    
    if (!pageToken) {
      showStatus('Please log in to JobSimply website first', 'error');
      return;
    }
    
    const extractResponse = await API.extractJob(job, pageToken);
    
    if (extractResponse.success) {
      savedJobId = extractResponse.jobId;
      displayJobInfo(job, extractResponse);
    } else {
      showStatus('Failed to save job: ' + (extractResponse.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showStatus('Failed to save job: ' + error.message, 'error');
  }
}

function displayJobInfo(job, analysis) {
  const jobCard = document.getElementById('job-card');
  if (!jobCard) return;

  jobCard.classList.remove('hidden');

  document.getElementById('job-title').textContent = job.title || 'No title';
  document.getElementById('job-company').textContent = job.company || 'No company';
  document.getElementById('job-location').textContent = job.location || 'No location';
  document.getElementById('job-salary').textContent = job.salary || '';
  document.getElementById('job-experience').textContent = job.experience || '';
  document.getElementById('job-url').innerHTML = `<a href="${job.jobUrl}" target="_blank">Apply Link</a>`;

  if (job.requiredSkills && job.requiredSkills.length > 0) {
    const skillsSection = document.getElementById('job-skills-section');
    const skillsList = document.getElementById('job-skills');
    if (skillsSection && skillsList) {
      skillsSection.classList.remove('hidden');
      skillsList.innerHTML = job.requiredSkills.map(s => `<li>${s}</li>`).join('');
    }
  }

  const customizeBtn = document.getElementById('customize-resume-btn');
  if (customizeBtn && savedJobId) {
    customizeBtn.classList.remove('hidden');
  }

  setupEventListeners();
}

function displayNoJob() {
  const jobCard = document.getElementById('job-card');
  if (jobCard) {
    jobCard.classList.remove('hidden');
    document.getElementById('job-title').textContent = 'No job detected';
    document.getElementById('job-company').textContent = '';
    document.getElementById('job-location').textContent = '';
    document.getElementById('job-salary').textContent = '';
    document.getElementById('job-experience').textContent = '';
    document.getElementById('job-skills-section').classList.add('hidden');
    document.getElementById('customize-resume-btn').classList.add('hidden');
  }
}

function setupEventListeners() {
  // Auth section
  document.getElementById('open-website-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/login' });
  });

  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.currentTarget.dataset.tab;
      switchTab(tabName);
    });
  });

  // Autofill tab
  document.getElementById('start-autofill-btn')?.addEventListener('click', startAutofill);
  document.getElementById('preview-answers-btn')?.addEventListener('click', previewAnswers);
  document.getElementById('stop-autofill-btn')?.addEventListener('click', stopAutofill);

  // Score tab
  document.getElementById('analyze-resume-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/resume' });
  });

  document.getElementById('add-keywords-btn')?.addEventListener('click', addMissingKeywords);

  // Saved Jobs tab
  document.getElementById('find-jobs-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/jobs' });
  });

  // AI Assistant tab
  document.getElementById('ai-send-btn')?.addEventListener('click', sendAIMessage);
  document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAIMessage();
  });

  // Profile tab
  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/profile' });
  });

  // Job card actions
  document.getElementById('customize-resume-btn')?.addEventListener('click', () => {
    if (savedJobId) {
      chrome.tabs.create({ url: `http://localhost:5173/jobs/${savedJobId}` });
    }
  });
  
  document.getElementById('open-jobs-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/jobs' });
  });

  // Settings
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Theme toggle
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  // Load tab-specific data
  if (tabName === 'saved') {
    loadSavedJobs();
  } else if (tabName === 'tracker') {
    loadJobTracker();
  } else if (tabName === 'score') {
    loadResumeScore();
  } else if (tabName === 'profile') {
    loadProfileData();
  }
}

// Autofill functions
async function startAutofill() {
  showStatus('Starting autofill...', 'info');
  const btn = document.getElementById('start-autofill-btn');
  const stopBtn = document.getElementById('stop-autofill-btn');
  const previewBtn = document.getElementById('preview-answers-btn');
  
  btn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  previewBtn.classList.remove('hidden');
  
  // Show progress
  document.getElementById('autofill-progress')?.classList.remove('hidden');
  
  // Simulate progress (in real implementation, this would come from content script)
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 100) progress = 100;
    
    updateProgress(progress);
    
    if (progress >= 100) {
      clearInterval(interval);
      showStatus('Autofill completed!', 'success');
      stopBtn.classList.add('hidden');
    }
  }, 500);
  
  // Store interval ID to allow stopping
  window.autofillInterval = interval;
}

function stopAutofill() {
  if (window.autofillInterval) {
    clearInterval(window.autofillInterval);
    window.autofillInterval = null;
  }
  
  const btn = document.getElementById('start-autofill-btn');
  const stopBtn = document.getElementById('stop-autofill-btn');
  
  btn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  
  showStatus('Autofill stopped', 'info');
}

function previewAnswers() {
  showStatus('Opening preview...', 'info');
  chrome.tabs.create({ url: 'http://localhost:5173/jobs' });
}

function updateProgress(percent) {
  const fill = document.getElementById('progress-fill');
  const completed = document.getElementById('progress-completed');
  const remaining = document.getElementById('progress-remaining');
  const ai = document.getElementById('progress-ai');
  
  if (fill) fill.style.width = `${percent}%`;
  if (completed) completed.textContent = Math.floor(percent * 0.8);
  if (remaining) remaining.textContent = Math.floor((100 - percent) * 0.8);
  if (ai) ai.textContent = Math.floor(percent * 0.2);
}

// Score functions
async function loadResumeScore() {
  // In real implementation, fetch score from API
  const score = Math.floor(Math.random() * 30) + 70; // Demo: 70-100
  const keywordMatch = Math.floor(Math.random() * 40) + 60;
  const experienceMatch = Math.floor(Math.random() * 30) + 70;
  const educationMatch = Math.floor(Math.random() * 20) + 80;
  
  updateScoreCircle(score);
  updateScoreBar('keyword-match', 'keyword-bar', keywordMatch);
  updateScoreBar('experience-match', 'experience-bar', experienceMatch);
  updateScoreBar('education-match', 'education-bar', educationMatch);
  
  // Load missing keywords
  const keywords = ['React', 'TypeScript', 'Node.js', 'AWS', 'Docker'];
  const keywordsList = document.getElementById('missing-keywords');
  if (keywordsList && keywords.length > 0) {
    keywordsList.innerHTML = keywords.map(kw => `
      <span class="keyword-tag">
        ${kw}
        <button class="add-keyword-btn" data-keyword="${kw}">+</button>
      </span>
    `).join('');
  }
}

function updateScoreCircle(score) {
  const ring = document.getElementById('score-ring');
  const scoreNumber = document.getElementById('ats-score');
  
  if (ring) {
    const circumference = 2 * Math.PI * 54; // r=54
    const offset = circumference - (score / 100) * circumference;
    ring.style.strokeDashoffset = offset;
  }
  
  if (scoreNumber) {
    scoreNumber.textContent = score;
  }
}

function updateScoreBar(valueId, barId, percent) {
  const valueEl = document.getElementById(valueId);
  const barEl = document.getElementById(barId);
  
  if (valueEl) valueEl.textContent = `${percent}%`;
  if (barEl) barEl.style.width = `${percent}%`;
}

function addMissingKeywords() {
  showStatus('Adding keywords to resume...', 'success');
  // In real implementation, call API to add keywords to resume
}

// Saved Jobs functions
async function loadSavedJobs() {
  // In real implementation, fetch from API
  const countEl = document.getElementById('saved-count');
  if (countEl) countEl.textContent = '0';
}

// Job Tracker functions
async function loadJobTracker() {
  // In real implementation, fetch from API
  updateTrackerCount('saved', 0);
  updateTrackerCount('applied', 0);
  updateTrackerCount('interview', 0);
}

function updateTrackerCount(status, count) {
  const el = document.getElementById(`tracker-${status}`);
  if (el) el.textContent = count;
}

// AI Assistant functions
async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const message = input?.value.trim();
  
  if (!message) return;
  
  const messagesContainer = document.getElementById('ai-messages');
  
  // Add user message
  messagesContainer.innerHTML += `
    <div class="ai-message ai-message-user">
      <div class="ai-message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="ai-message-content">
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
  
  input.value = '';
  
  // Scroll to bottom
  const chat = document.getElementById('ai-chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
  
  // Simulate AI response (in real implementation, call API)
  setTimeout(() => {
    messagesContainer.innerHTML += `
      <div class="ai-message ai-message-assistant">
        <div class="ai-message-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          </svg>
        </div>
        <div class="ai-message-content">
          <p>I understand you're asking about "${escapeHtml(message)}". This is a demo response. In the full implementation, I'll provide detailed AI-powered answers using your profile and job data.</p>
        </div>
      </div>
    `;
    
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, 1000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Profile functions
async function loadProfileData() {
  // In real implementation, fetch from API
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  const avatarEl = document.getElementById('profile-avatar');
  
  if (nameEl) nameEl.textContent = 'User';
  if (emailEl) emailEl.textContent = 'user@email.com';
  if (avatarEl) avatarEl.textContent = 'U';
  
  // Load stats
  const resumesEl = document.getElementById('profile-resumes');
  const applicationsEl = document.getElementById('profile-applications');
  const scoreEl = document.getElementById('profile-score');
  
  if (resumesEl) resumesEl.textContent = '0';
  if (applicationsEl) applicationsEl.textContent = '0';
  if (scoreEl) scoreEl.textContent = '0%';
}
