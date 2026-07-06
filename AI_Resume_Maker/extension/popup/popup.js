// Extension Architecture - Chrome Extension Entry Point
// JobSimply - Job Application Assistant
// Live authentication via PING/GET_TOKEN with retry

import { showStatus } from '../services/ui.js';
import * as API from '../services/apiService.js';

let currentJob = null;
let pageToken = null;
let savedJobId = null;

console.log('[POPUP] Loaded');

// Initialize on popup open
document.addEventListener('DOMContentLoaded', initialize);

// Listen for auth updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[POPUP] Received message:', request.action);
  
  if (request.action === 'AUTH_UPDATED') {
    console.log('[POPUP] Auth updated, token received');
    pageToken = request.token;
    // Switch to logged in state immediately
    document.getElementById('auth-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.remove('hidden');
    // Auto-detect job
    detectAndSaveJob();
  } else if (request.action === 'AUTH_LOGOUT') {
    console.log('[POPUP] Auth logout received');
    pageToken = null;
    currentJob = null;
    savedJobId = null;
    // Switch to logged out state immediately
    document.getElementById('dashboard-section')?.classList.add('hidden');
    document.getElementById('auth-section')?.classList.remove('hidden');
  }
});

async function initialize() {
  // If we already have a token in memory, use it
  if (pageToken) {
    console.log('[POPUP] Have cached token, switching to dashboard');
    document.getElementById('auth-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.remove('hidden');
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
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('dashboard-section')?.classList.add('hidden');

  // Setup event listener for "not logged in" state
  document.getElementById('open-website-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/login' });
  });
}

function isJobSimplyWebsite(url) {
  return url.includes('localhost:5173') || url.includes('127.0.0.1:5173');
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
        document.getElementById('auth-section')?.classList.add('hidden');
        document.getElementById('dashboard-section')?.classList.remove('hidden');
        detectAndSaveJob();
        return tokenResponse.token;
      }
    }
  } catch (pingError) {
    console.log('[POPUP] PING failed, content script may not exist');
    // Content script not injected, try to inject it
    if (pingError.message?.includes('Receiving end does not exist')) {
      console.log('[POPUP] Injecting content script');
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/content.js']
        });
        // Wait a bit for script to initialize
        await new Promise(r => setTimeout(r, 500));
        
        // Try PING again
        console.log('[POPUP] Re-sending PING after injection');
        const retryResponse = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
        if (retryResponse?.success) {
          const tokenResponse = await chrome.tabs.sendMessage(tabId, { action: 'GET_TOKEN' });
          if (tokenResponse?.token) {
            pageToken = tokenResponse.token;
            document.getElementById('auth-section')?.classList.add('hidden');
            document.getElementById('dashboard-section')?.classList.remove('hidden');
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
  showStatus('Detecting job...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus('No active tab found', 'error');
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
      displayNoJob();
      return;
    }

    // PING first
    let response;
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'PING' });
      response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_CURRENT_JOB' });
    } catch (msgError) {
      if (msgError.message?.includes('Receiving end does not exist')) {
        console.log('[POPUP] Injecting content script for job site');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        });
        await new Promise(r => setTimeout(r, 500));
        response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_CURRENT_JOB' });
      } else {
        throw msgError;
      }
    }
    
    if (response?.success && response.job) {
      currentJob = response.job;
      await saveJobAndDisplay(currentJob);
    } else {
      displayNoJob();
    }
  } catch (error) {
    console.log('[POPUP] Error detecting job:', error);
    showStatus('Error loading job', 'error');
  }
}

async function saveJobAndDisplay(job) {
  try {
    showStatus('Saving job...', 'info');
    
    const extractResponse = await API.extractJob(job, pageToken);
    
    if (extractResponse.success) {
      savedJobId = extractResponse.jobId;
      displayJobInfo(job, extractResponse);
    } else {
      showStatus('Failed to save job', 'error');
    }
  } catch (error) {
    showStatus('Failed to save job', 'error');
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
  document.getElementById('customize-resume-btn')?.addEventListener('click', () => {
    if (savedJobId) {
      chrome.tabs.create({ url: `http://localhost:5173/jobs/${savedJobId}` });
    }
  });
  document.getElementById('open-jobs-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/jobs' });
  });
}