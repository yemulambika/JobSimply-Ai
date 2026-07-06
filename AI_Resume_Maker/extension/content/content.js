// Content script for job extraction - Light-weight extraction only
// NO AI processing, NO resume generation, NO cover letters
// LIVE AUTHENTICATION: Reads JWT from website and notifies extension via BroadcastChannel

console.log('[CONTENT] Initialized');

// BroadcastChannel for live auth updates
const authChannel = new BroadcastChannel('jobsimply-auth');

// Listen for auth updates from website
authChannel.addEventListener('message', (event) => {
  const { type, token } = event.data;
  
  if (type === 'LOGIN') {
    console.log('[CONTENT] Auth LOGIN received via BroadcastChannel');
    // Store token and notify extension
    chrome.runtime.sendMessage({ action: 'AUTH_UPDATED', token });
  } else if (type === 'LOGOUT') {
    console.log('[CONTENT] Auth LOGOUT received via BroadcastChannel');
    chrome.runtime.sendMessage({ action: 'AUTH_LOGOUT' });
  }
});

// Initialize - check for existing token
function initialize() {
  const token = getTokenFromPage();
  if (token) {
    console.log('[CONTENT] Found existing token on load');
    chrome.runtime.sendMessage({ action: 'AUTH_UPDATED', token });
  }
}

// Run initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initialize();
} else {
  window.addEventListener('DOMContentLoaded', initialize);
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[CONTENT] Received message:', request.action);
  
  if (request.action === 'PING') {
    console.log('[CONTENT] Received PING');
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'GET_CURRENT_JOB') {
    const job = extractJobData();
    console.log('[CONTENT] Returning job:', job ? { title: job.title, company: job.company } : 'null');
    sendResponse({ success: !!job, job });
    return true;
  }
  
  if (request.action === 'GET_TOKEN') {
    const token = getTokenFromPage();
    if (token) {
      console.log('[CONTENT] Token found, sending AUTH_UPDATED');
      chrome.runtime.sendMessage({ action: 'AUTH_UPDATED', token });
    }
    sendResponse({ success: !!token, token });
    return true;
  }
  
  return true;
});

// Get JWT token from website localStorage or other sources
function getTokenFromPage() {
  // Try localStorage
  try {
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('jwt');
    if (token) {
      console.log('[CONTENT] Found token in localStorage');
      return token;
    }
  } catch (e) {}
  
  // Try cookies
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'refreshToken' || name === 'token') {
        console.log('[CONTENT] Found token in cookie:', name);
        return value;
      }
    }
  } catch (e) {}
  
  // Try window.__APP_STATE__
  try {
    const appState = window.__APP_STATE__;
    if (appState?.token) {
      console.log('[CONTENT] Found token in window.__APP_STATE__');
      return appState.token;
    }
  } catch (e) {}
  
  return null;
}

// Extract job data as JSON - NO processing
function extractJobData() {
  const hostname = window.location.hostname.toLowerCase();
  console.log('[CONTENT] Extracting from:', hostname);
  
  let job = null;
  
  if (hostname.includes('naukri.com')) {
    job = extractNaukriJob();
  } else if (hostname.includes('linkedin.com')) {
    job = extractLinkedInJob();
  } else if (hostname.includes('indeed.com')) {
    job = extractIndeedJob();
  } else if (hostname.includes('wellfound.com')) {
    job = extractWellfoundJob();
  } else if (hostname.includes('greenhouse.io')) {
    job = extractGreenhouseJob();
  } else if (hostname.includes('lever.co')) {
    job = extractLeverJob();
  } else if (hostname.includes('workday.com')) {
    job = extractWorkdayJob();
  } else if (hostname.includes('ashby.com')) {
    job = extractAshbyJob();
  } else if (hostname.includes('smartrecruiters.com')) {
    job = extractSmartRecruitersJob();
  }
  
  if (job) {
    chrome.storage.local.set({ currentJob: job });
    chrome.runtime.sendMessage({ action: 'jobUpdated', job }).catch(() => {});
  }
  
  return job;
}

function extractWithFallbacks(primarySelectors, fallbackMethods) {
  for (const selector of primarySelectors) {
    try {
      const el = document.querySelector(selector);
      if (el && el.textContent && el.textContent.trim()) {
        return el.textContent.trim();
      }
    } catch (e) {}
  }
  for (const method of fallbackMethods || []) {
    try {
      const result = method();
      if (result) return result;
    } catch (e) {}
  }
  return '';
}

function extractNaukriJob() {
  const title = extractWithFallbacks([
    'h1.jd-title', 'h1[class*="jdTitle"]', 'h1[class*="title"]', '.job-title h1', 'h1'
  ], [() => getMetaContent('title')?.split(' - ')[0], () => getJsonLdProperty('title')]);
  
  const company = extractWithFallbacks([
    '.jd-header-comp-name a', 'a[class*="companyName"]', '.company-name', 'a[class*="company"]'
  ], [() => getMetaContent('company'), () => getJsonLdProperty('hiringOrganization.name')]);
  
  const location = extractWithFallbacks(['.location-container a', 'span[class*="location"]', '.location'], [() => getMetaContent('address')]);
  const description = extractWithFallbacks(['.dang-inner-html', '[class*="jobDescription"]', '.job-description'], [() => getMetaContent('description'), () => getJsonLdProperty('description')]);
  const salary = extractWithFallbacks(['.jd-salary', '[class*="salary"]', '.salary-package']);
  const experience = extractWithFallbacks(['.jd-experience', '[class*="experience"]', '.experience']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: (salary || '').trim(), experience: (experience || '').trim(),
    description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: requiredSkills, preferredSkills: [], keywords: extractKeywords(description),
    source: 'naukri', jobUrl: window.location.href, companyLogo: '', postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractLinkedInJob() {
  const title = extractWithFallbacks(['.jobs-unified-top-card__job-title', '.job-title', 'h1'], [() => getMetaContent('title'), () => getJsonLdProperty('title')]);
  const company = extractWithFallbacks(['.jobs-unified-top-card__company-name a', '.company-name', 'a[data-control-name="company_link"]'], [() => getMetaContent('company'), () => getJsonLdProperty('hiringOrganization.name')]);
  const location = extractWithFallbacks(['.jobs-unified-top-card__job-location', '.location']);
  const description = extractWithFallbacks(['.jobs-description__content', '.job-description'], [() => getJsonLdProperty('description')]);
  const salary = extractWithFallbacks(['.jobs-unified-top-card__salary', '.salary']);
  const employmentType = extractEmploymentType();
  const workMode = extractWorkMode();

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: (salary || '').trim(), experience: '', employmentType: employmentType,
    workMode: workMode, description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'linkedin', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractIndeedJob() {
  const title = extractWithFallbacks(['.jobsearch-JobInfoHeader-title', 'h1']);
  const company = extractWithFallbacks(['[data-company-name]', '. CompanyName']);
  const location = extractWithFallbacks(['.jobsearch-JobInfoHeader-subtitle div']);
  const description = extractWithFallbacks(['.jobsearch-jobDescriptionText', '#jobDescriptionText']);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: '', experience: '', description: (description || '').trim(), responsibility: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'indeed', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractWellfoundJob() {
  const title = extractWithFallbacks(['[data-test="JobTitle"]']);
  const company = extractWithFallbacks(['[data-test="CompanyLink"]']);
  const location = extractWithFallbacks(['[data-test="Location"]']);
  const description = extractWithFallbacks(['[data-test="JobDescription"]']);
  const salary = extractWithFallbacks(['[data-test="Compensation"]', '[data-test="Salary"]']);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: (salary || '').trim(), experience: '', employmentType: '', workMode: '',
    description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'wellfound', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractGreenhouseJob() {
  const title = extractWithFallbacks(['.opening-title']);
  const company = extractWithFallbacks(['.company-name']);
  const location = extractWithFallbacks(['.location']);
  const description = extractWithFallbacks(['.opening-description', '.content-section']);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: '', experience: '', employmentType: '', workMode: '',
    description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'greenhouse', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractLeverJob() {
  const title = extractWithFallbacks(['.posting-header h2']);
  const company = extractWithFallbacks(['.posting-org .company-name', '.company-name']);
  const location = extractWithFallbacks(['.posting-categories .location']);
  const description = extractWithFallbacks(['.posting-description', '.content']);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: '', experience: '', employmentType: '', workMode: '',
    description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'lever', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractWorkdayJob() {
  const title = extractWithFallbacks(['[data-automation-id="jobTitle"]']);
  const company = extractWithFallbacks(['[data-automation-id="companyName"]']);
  const location = extractWithFallbacks(['[data-automation-id="location"]']);
  const description = extractWithFallbacks(['[data-automation-id="jobDescription"]', '[data-automation-id="description"]']);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: '', experience: '', employmentType: '', workMode: '',
    description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'workday', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractAshbyJob() {
  const title = extractWithFallbacks(['[data-testid="JobTitle"]']);
  const company = extractWithFallbacks(['[data-testid="CompanyName"]']);
  const location = extractWithFallbacks(['[data-testid="Location"]']);
  const description = extractWithFallbacks(['[data-testid="JobDescription"]']);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: '', experience: '', employmentType: '', workMode: '',
    description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'ashby', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractSmartRecruitersJob() {
  const title = extractWithFallbacks(['.job-title', 'h1']);
  const company = extractWithFallbacks(['.company-name']);
  const location = extractWithFallbacks(['.location']);
  const description = extractWithFallbacks(['.job-description', '.description-content']);

  if (!title || !company) return null;

  return {
    title: title.trim(), company: company.trim(), location: (location || '').trim(),
    salary: '', experience: '', employmentType: '', workMode: '',
    description: (description || '').trim(), responsibilities: (description || '').trim(),
    qualifications: '', requiredSkills: extractSkillsFromDescription(description),
    preferredSkills: [], keywords: extractKeywords(description),
    source: 'smartrecruiters', jobUrl: window.location.href, companyLogo: '',
    postedDate: '', extractedAt: new Date().toISOString()
  };
}

function extractSkillsFromDescription(description) {
  if (!description) return [];
  const skillKeywords = ['javascript', 'react', 'vue', 'angular', 'nodejs', 'python', 'java', 'sql', 'aws', 'docker', 'git', 'typescript', 'html', 'css', 'nextjs', 'express', 'django', 'flask', 'spring', 'ruby', 'php', 'go', 'rust', 'kubernetes', 'azure', 'gcp', 'cloud', 'devops', 'agile', 'linux', 'mongodb', 'postgresql', 'mysql'];
  const lowerDesc = description.toLowerCase();
  return skillKeywords.filter(skill => lowerDesc.includes(skill.toLowerCase()));
}

function extractKeywords(description) {
  if (!description) return [];
  return description.match(/\b[a-zA-Z]{4,}/g) || [];
}

function extractEmploymentType() {
  const text = document.body.textContent.toLowerCase();
  if (text.includes('full-time')) return 'Full-time';
  if (text.includes('part-time')) return 'Part-time';
  if (text.includes('contract')) return 'Contract';
  if (text.includes('internship')) return 'Internship';
  return '';
}

function extractWorkMode() {
  const text = document.body.textContent.toLowerCase();
  if (text.includes('remote')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  return '';
}

function getMetaContent(property) {
  const meta = document.querySelector(`meta[property="og:${property}"], meta[name="${property}"]`);
  return meta ? meta.getAttribute('content') : null;
}

function getJsonLdProperty(property) {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      const data = JSON.parse(script.textContent);
      if (data['@type'] === 'JobPosting') {
        const keys = property.split('.');
        let value = data;
        for (const key of keys) { value = value?.[key]; }
        return value;
      }
    }
  } catch (e) {}
  return null;
}

// SPA Navigation Detection
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[CONTENT] URL changed to:', url);
    setTimeout(() => {
      const job = extractJobData();
      if (job) { console.log('[CONTENT] Auto-updated job after navigation:', job.title); }
    }, 1000);
  }
}).observe(document.body, { childList: true, subtree: true });

[ 'pushState', 'replaceState' ].forEach(method => {
  const original = history[method];
  history[method] = function() {
    const result = original.apply(this, arguments);
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(() => extractJobData(), 1000);
    }
    return result;
  };
});

window.addEventListener('popstate', () => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => extractJobData(), 1000);
  }
});

console.log('[CONTENT] Content script ready');