// Content Script - Enhanced version with full auth sync and job extraction
// Handles: Auth detection, BroadcastChannel, Job extraction, Form autofill support

console.log('[CONTENT] Enhanced content script initialized');

// =============================================
// CONFIGURATION
// =============================================

const CONFIG = {
  // JobSimply website URL patterns for auth detection
  isJobSimplySite: () => {
    const host = window.location.hostname;
    return host.includes('localhost') || host.includes('127.0.0.1');
  },
  
  // Auth storage keys on the website
  AUTH_KEYS: ['token', 'user', 'authToken', 'accessToken', 'session'],
  
  // Polling interval for auth state check (ms)
  AUTH_POLL_INTERVAL: 2000,
};

// =============================================
// BROADCAST CHANNEL - Auth sync with website
// =============================================

const authChannel = new BroadcastChannel('jobsimply-auth');

authChannel.addEventListener('message', (event) => {
  const { type, token, user } = event.data;
  
  console.log('[CONTENT] BroadcastChannel message:', type);
  
  if (type === 'LOGIN' || type === 'AUTH_UPDATE') {
    handleWebsiteLogin(token, user);
  } else if (type === 'LOGOUT') {
    handleWebsiteLogout();
  }
});

// =============================================
// AUTH HANDLING
// =============================================

/**
 * Handle login from website
 */
function handleWebsiteLogin(token, user) {
  console.log('[CONTENT] Website login detected');
  
  // Store auth in extension
  chrome.runtime.sendMessage({
    action: 'STORE_AUTH',
    token,
    user
  }).catch(err => console.log('[CONTENT] Failed to store auth:', err));
  
  // Also notify background
  notifyBackground('AUTH_UPDATED', { token, user });
}

/**
 * Handle logout from website
 */
function handleWebsiteLogout() {
  console.log('[CONTENT] Website logout detected');
  
  chrome.runtime.sendMessage({
    action: 'LOGOUT'
  }).catch(err => console.log('[CONTENT] Failed to logout:', err));
  
  notifyBackground('AUTH_LOGOUT', {});
}

/**
 * Notify background script
 */
function notifyBackground(action, data) {
  chrome.runtime.sendMessage({ action, ...data }).catch(() => {});
}

/**
 * Get token from website localStorage/cookies
 */
function getTokenFromWebsite() {
  // Try localStorage first (most common for React apps)
  for (const key of CONFIG.AUTH_KEYS) {
    try {
      const token = localStorage.getItem(key);
      if (token && isValidJWT(token)) {
        console.log('[CONTENT] Found token in localStorage:', key);
        
        // Try to get user data too
        const user = getUserFromWebsite();
        
        return { token, user };
      }
    } catch (e) {}
  }
  
  // Try cookies
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (CONFIG.AUTH_KEYS.includes(name) && isValidJWT(value)) {
        console.log('[CONTENT] Found token in cookie:', name);
        return { token: value, user: getUserFromWebsite() };
      }
    }
  } catch (e) {}
  
  // Try React state
  try {
    const state = window.__APP_STATE__ || window.__REDUX_STATE__ || window.__INITIAL_STATE__;
    if (state?.auth?.token && isValidJWT(state.auth.token)) {
      return { token: state.auth.token, user: state.auth.user || null };
    }
  } catch (e) {}
  
  return null;
}

/**
 * Get user from website
 */
function getUserFromWebsite() {
  // Try localStorage
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && (user.id || user.email)) {
        return user;
      }
    }
  } catch (e) {}
  
  // Try React state
  try {
    const state = window.__APP_STATE__ || window.__REDUX_STATE__;
    if (state?.auth?.user) {
      return state.auth.user;
    }
  } catch (e) {}
  
  // Try to decode from token
  const tokenData = getTokenFromWebsite();
  if (tokenData?.token) {
    try {
      const decoded = decodeJWT(tokenData.token);
      if (decoded) {
        return {
          id: decoded.id,
          email: decoded.email
        };
      }
    } catch (e) {}
  }
  
  return null;
}

/**
 * Validate JWT format
 */
function isValidJWT(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0;
}

/**
 * Decode JWT (without verification)
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

// =============================================
// AUTH STATE OBSERVER - Watch for website auth changes
// =============================================

let lastToken = null;
let authCheckInterval = null;

function startAuthObserver() {
  // Initial check
  checkAuthState();
  
  // Set up interval for periodic checks
  authCheckInterval = setInterval(checkAuthState, CONFIG.AUTH_POLL_INTERVAL);
  
  // Also watch for storage events (when website updates localStorage)
  window.addEventListener('storage', handleStorageEvent);
}

function checkAuthState() {
  const authData = getTokenFromWebsite();
  const currentToken = authData?.token;
  
  if (currentToken && currentToken !== lastToken) {
    console.log('[CONTENT] Auth state changed detected');
    lastToken = currentToken;
    handleWebsiteLogin(currentToken, authData.user);
  } else if (!currentToken && lastToken) {
    console.log('[CONTENT] Auth cleared detected');
    lastToken = null;
    handleWebsiteLogout();
  }
}

function handleStorageEvent(event) {
  if (CONFIG.AUTH_KEYS.includes(event.key)) {
    console.log('[CONTENT] Storage event detected:', event.key);
    
    if (event.newValue && isValidJWT(event.newValue)) {
      const user = getUserFromWebsite();
      handleWebsiteLogin(event.newValue, user);
    } else if (!event.newValue) {
      handleWebsiteLogout();
    }
  }
}

// =============================================
// MESSAGE HANDLING - From popup/background
// =============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[CONTENT] Message received:', request.action);
  
  switch (request.action) {
    case 'PING':
      sendResponse({ success: true, timestamp: Date.now() });
      return true;
      
    case 'GET_TOKEN':
      const authData = getTokenFromWebsite();
      sendResponse({ 
        success: !!authData?.token, 
        token: authData?.token,
        user: authData?.user
      });
      return true;
      
    case 'GET_AUTH_STATE':
      const currentAuth = getTokenFromWebsite();
      sendResponse({
        authenticated: !!currentAuth?.token,
        token: currentAuth?.token,
        user: currentAuth?.user,
        isJobSimply: CONFIG.isJobSimplySite()
      });
      return true;
      
    case 'GET_CURRENT_JOB':
      const job = extractJobData();
      sendResponse({ success: !!job, job });
      return true;
      
    case 'AUTH_STATE_UPDATE':
      // Handle auth state updates from background
      if (request.authenticated) {
        lastToken = request.token;
      } else {
        lastToken = null;
      }
      sendResponse({ success: true });
      return true;
      
    case 'START_AUTOFILL':
      console.log('[CONTENT] START_AUTOFILL received');
      handleAutofill()
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('[CONTENT] Autofill error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
      
    default:
      return true;
  }
});

/**
 * Handle autofill - detect form fields and fill with profile data
 */
async function handleAutofill() {
  try {
    // Get user profile from storage
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'No profile found. Please set up your profile first.' };
    }
    
    // Detect form fields on the page
    const fields = detectFormFieldsOnPage();
    if (fields.length === 0) {
      return { success: false, error: 'No form fields detected on this page.' };
    }
    
    // Map profile to fields
    const { filledFields, unfilledFields } = mapProfileToFormFields(profile, fields);
    
    // Fill the fields
    let filledCount = 0;
    for (const field of filledFields) {
      const success = fillFormField(field);
      if (success) filledCount++;
    }
    
    console.log(`[CONTENT] Autofill completed: ${filledCount}/${filledFields.length} fields filled`);
    
    return {
      success: true,
      filled: filledCount,
      total: filledFields.length,
      unfilled: unfilledFields.length,
      message: `Filled ${filledCount} out of ${filledFields.length} detected fields`
    };
  } catch (error) {
    console.error('[CONTENT] Autofill failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user profile from chrome storage
 */
async function getUserProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userProfile'], (result) => {
      resolve(result.userProfile || null);
    });
  });
}

/**
 * Detect form fields on the current page
 */
function detectFormFieldsOnPage() {
  const fields = [];
  const inputs = document.querySelectorAll('input, select, textarea');
  
  for (const input of inputs) {
    // Skip hidden fields
    if (input.type === 'hidden') continue;
    if (!isElementVisible(input)) continue;
    
    const field = {
      element: input,
      type: input.type?.toLowerCase() || 'text',
      name: input.name || '',
      id: input.id || '',
      label: getFieldLabel(input),
      placeholder: input.placeholder || '',
      required: input.required || input.hasAttribute('aria-required')
    };
    
    // Categorize the field
    field.category = categorizeField(field);
    
    fields.push(field);
  }
  
  return fields;
}

/**
 * Get label text for an input
 */
function getFieldLabel(input) {
  // Try label for attribute
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Try aria-label
  if (input.getAttribute('aria-label')) {
    return input.getAttribute('aria-label');
  }
  
  // Try parent label
  const parent = input.closest('label');
  if (parent) return parent.textContent.trim();
  
  // Try closest wrapper
  const wrapper = input.closest('div');
  if (wrapper) {
    const text = wrapper.textContent.split('\n')[0].trim();
    if (text && text.length < 100) return text;
  }
  
  return '';
}

/**
 * Check if element is visible
 */
function isElementVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         el.offsetParent !== null;
}

/**
 * Categorize field based on attributes
 */
function categorizeField(field) {
  const searchText = `${field.name} ${field.label} ${field.placeholder}`.toLowerCase();
  
  // Personal
  if (/^(first\s*name|given\s*name|forename)$/i.test(searchText)) return 'firstName';
  if (/^(last\s*name|family\s*name|surname)$/i.test(searchText)) return 'lastName';
  if (/^(full\s*name|complete\s*name|name)$/i.test(searchText)) return 'fullName';
  if (/^(email|e-?mail)$/i.test(searchText)) return 'email';
  if (/^(phone|telephone|mobile|cell)$/i.test(searchText)) return 'phone';
  
  // Location
  if (/^(street\s*address|address|address\s*line\s*1)$/i.test(searchText)) return 'address';
  if (/^(address\s*line\s*2|apt|suite|unit)$/i.test(searchText)) return 'addressLine2';
  if (/^(city|town|municipality)$/i.test(searchText)) return 'city';
  if (/^(state|province|region|county)$/i.test(searchText)) return 'state';
  if (/^(zip|zip\s*code|postal\s*code|pin)$/i.test(searchText)) return 'zip';
  if (/^(country|nation)$/i.test(searchText)) return 'country';
  
  // Professional
  if (/^(linkedin|linked\s*in)$/i.test(searchText)) return 'linkedin';
  if (/^(github|git\s*hub)$/i.test(searchText)) return 'github';
  if (/^(portfolio|website|personal\s*site)$/i.test(searchText)) return 'portfolio';
  if (/^(current\s*company|current\s*employer|present\s*employer)$/i.test(searchText)) return 'currentCompany';
  if (/^(job\s*title|position|role|designation)$/i.test(searchText)) return 'jobTitle';
  if (/^(total\s*experience|years?\s*of\s*experience)$/i.test(searchText)) return 'yearsExperience';
  
  // Education
  if (/^(school|university|college|institution)$/i.test(searchText)) return 'school';
  if (/^(degree|qualification|bachelor|master)$/i.test(searchText)) return 'degree';
  if (/^(field\s*of\s*study|major|specialization)$/i.test(searchText)) return 'fieldOfStudy';
  if (/^(graduation\s*year|passing\s*year|year\s*of\s*passing)$/i.test(searchText)) return 'graduationYear';
  
  // Skills
  if (/^(skills|technical\s*skills|competencies)$/i.test(searchText)) return 'skills';
  
  // Salary
  if (/^(current\s*salary|present\s*salary|ctc)$/i.test(searchText)) return 'currentSalary';
  if (/^(expected\s*salary|expected\s*ctc|desired\s*salary)$/i.test(searchText)) return 'expectedSalary';
  if (/^(notice\s*period|serving\s*notice|immediate)$/i.test(searchText)) return 'noticePeriod';
  
  // Input type fallback
  if (field.type === 'email') return 'email';
  if (field.type === 'tel') return 'phone';
  if (field.type === 'url') return 'url';
  
  return 'text';
}

/**
 * Map profile data to form fields
 */
function mapProfileToFormFields(profile, fields) {
  const filledFields = [];
  const unfilledFields = [];
  
  for (const field of fields) {
    const value = getProfileValueForField(profile, field.category);
    if (value) {
      filledFields.push({ ...field, mappedValue: value });
    } else {
      unfilledFields.push(field);
    }
  }
  
  return { filledFields, unfilledFields };
}

/**
 * Get profile value for field category
 */
function getProfileValueForField(profile, category) {
  const mappings = {
    firstName: profile.firstName || profile.name?.split(' ')[0],
    lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' '),
    fullName: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    country: profile.country,
    linkedin: profile.linkedin,
    github: profile.github,
    portfolio: profile.portfolio,
    currentCompany: profile.currentCompany,
    jobTitle: profile.designation,
    yearsExperience: profile.yearsExperience,
    school: profile.education?.[0]?.school,
    degree: profile.education?.[0]?.degree,
    fieldOfStudy: profile.education?.[0]?.field,
    graduationYear: profile.education?.[0]?.year,
    currentSalary: profile.currentSalary,
    expectedSalary: profile.expectedSalary,
    noticePeriod: profile.noticePeriod,
    skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills
  };
  
  return mappings[category] || null;
}

/**
 * Fill a form field with value
 */
function fillFormField(field) {
  const { element, type, mappedValue } = field;
  if (!element || !mappedValue) return false;
  
  try {
    // Focus the element first
    element.focus();
    
    if (type === 'select-one' || type === 'select') {
      return fillSelectField(element, mappedValue);
    }
    
    // Clear existing value
    element.value = '';
    
    // Set new value
    element.value = mappedValue;
    
    // Trigger events for reactivity
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  } catch (error) {
    console.error('[CONTENT] Failed to fill field:', error);
    return false;
  }
}

/**
 * Fill a select field by finding matching option
 */
function fillSelectField(select, value) {
  const options = select.querySelectorAll('option');
  const normalizedValue = value.toLowerCase().trim();
  
  for (const option of options) {
    if (option.value.toLowerCase().includes(normalizedValue) ||
        option.textContent.toLowerCase().includes(normalizedValue)) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  
  return false;
}

// =============================================
// JOB EXTRACTION
// =============================================

function extractJobData() {
  const hostname = window.location.hostname.toLowerCase();
  console.log('[CONTENT] Extracting from:', hostname);
  
  let job = null;
  
  // Check which job site we're on
  if (hostname.includes('naukri.com')) {
    job = extractNaukriJob();
  } else if (hostname.includes('linkedin.com')) {
    job = extractLinkedInJob();
  } else if (hostname.includes('indeed.com')) {
    job = extractIndeedJob();
  } else if (hostname.includes('glassdoor.com')) {
    job = extractGlassdoorJob();
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
  } else if (hostname.includes('bamboohr.com')) {
    job = extractBambooHRJob();
  }
  
  if (job) {
    // Store in chrome storage for popup access
    chrome.storage.local.set({ currentJob: job }).catch(() => {});
    console.log('[CONTENT] Job extracted:', job.title, '@', job.company);
  }
  
  return job;
}

// Helper functions for extraction
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

function extractSkillsFromDescription(description) {
  if (!description) return [];
  const skillKeywords = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'nodejs', 'node.js', 'python', 
    'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
    'git', 'ci/cd', 'agile', 'scrum', 'rest api', 'graphql', 'microservices',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'material-ui',
    'express', 'django', 'flask', 'fastapi', 'spring', '.net',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp',
    'linux', 'windows', 'networking', 'security'
  ];
  const lowerDesc = description.toLowerCase();
  return skillKeywords.filter(skill => lowerDesc.includes(skill.toLowerCase()));
}

function extractKeywords(description) {
  if (!description) return [];
  return description.match(/\b[a-zA-Z]{4,}\b/g) || [];
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

// Site-specific extractors
function extractNaukriJob() {
  const title = extractWithFallbacks([
    'h1.jd-title', 'h1[class*="jdTitle"]', 'h1[class*="title"]', '.job-title h1', 'h1'
  ], [() => getMetaContent('title')?.split(' - ')[0]]);
  
  const company = extractWithFallbacks([
    '.jd-header-comp-name a', 'a[class*="companyName"]', '.company-name', 'a[class*="company"]'
  ], [() => getMetaContent('company')]);
  
  const location = extractWithFallbacks(['.location-container a', 'span[class*="location"]', '.location']);
  const description = extractWithFallbacks(['.dang-inner-html', '[class*="jobDescription"]', '.job-description']);
  const salary = extractWithFallbacks(['.jd-salary', '[class*="salary"]', '.salary-package']);
  const experience = extractWithFallbacks(['.jd-experience', '[class*="experience"]', '.experience']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: (salary || '').trim(), 
    experience: (experience || '').trim(),
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'naukri', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractLinkedInJob() {
  console.log('[CONTENT] Extracting LinkedIn job from:', window.location.href);
  
  const title = extractWithFallbacks([
    '.jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__title',
    '.job-title',
    'h1'
  ], [() => getMetaContent('title')]);
  
  console.log('[CONTENT] LinkedIn title extraction result:', title ? 'FOUND' : 'NOT FOUND');
  
  const company = extractWithFallbacks([
    '.jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__subtitle',
    '.company-name',
    'a[data-control-name="company_link"]'
  ], [() => getMetaContent('company')]);
  
  console.log('[CONTENT] LinkedIn company extraction result:', company ? 'FOUND' : 'NOT FOUND');
  
  const location = extractWithFallbacks([
    '.jobs-unified-top-card__job-location',
    '.job-details-jobs-unified-top-card__location',
    '.location'
  ]);
  const description = extractWithFallbacks([
    '.jobs-description__content',
    '.job-details-jobs-unified-top-card__description',
    '.job-description'
  ]);
  const salary = extractWithFallbacks([
    '.jobs-unified-top-card__salary',
    '.job-details-jobs-unified-top-card__salary',
    '.salary'
  ]);
  const employmentType = extractEmploymentType();
  const workMode = extractWorkMode();
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: (salary || '').trim(), 
    experience: '',
    employmentType: employmentType,
    workMode: workMode,
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'linkedin', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractIndeedJob() {
  const title = extractWithFallbacks([
    '.jobsearch-JobInfoHeader-title', 'h1[data-testid="jobTitle"]', 'h1'
  ]);
  const company = extractWithFallbacks([
    '.jobsearch-CompanyInfoWithoutHeaderImage a', '[data-testid="companyName"]', '.company-name'
  ]);
  const location = extractWithFallbacks([
    '.jobsearch-JobInfoHeader-address', '[data-testid="jobLocation"]', '.location'
  ]);
  const description = extractWithFallbacks([
    '#jobDescriptionText', '.job-description', '[data-testid="jobDescription"]'
  ]);
  const salary = extractWithFallbacks([
    '.jobsearch-JobInfoHeader-subtitle', '[data-testid="salary"]', '.salary'
  ]);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: (salary || '').trim(), 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'indeed', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractGlassdoorJob() {
  // Glassdoor job pages have specific selectors
  const title = extractWithFallbacks([
    '[data-test="jobTitle"]',
    '.jobTitle',
    'h1[class*="title"]',
    'h1'
  ], [() => getMetaContent('title')]);
  
  const company = extractWithFallbacks([
    '[data-test="employer-name"]',
    '.employerName',
    '.company-name',
    '[data-test="company-name"]'
  ], [() => getMetaContent('company')]);
  
  const location = extractWithFallbacks([
    '[data-test="location"]',
    '.location',
    '.job-location'
  ]);
  
  const description = extractWithFallbacks([
    '[data-test="job-description-content"]',
    '.jobDescription',
    '.description',
    '#JobDescription'
  ]);
  
  const salary = extractWithFallbacks([
    '[data-test="salary"]',
    '.salary',
    '.pay'
  ]);
  
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: (salary || '').trim(), 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'glassdoor', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractWellfoundJob() {
  const title = extractWithFallbacks(['.job-title', 'h1']);
  const company = extractWithFallbacks(['.company-name']);
  const location = extractWithFallbacks(['.location']);
  const description = extractWithFallbacks(['.job-description', '.description-content']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: '', 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'wellfound', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractGreenhouseJob() {
  const title = extractWithFallbacks(['.opening-title']);
  const company = extractWithFallbacks(['.company-name']);
  const location = extractWithFallbacks(['.location']);
  const description = extractWithFallbacks(['.opening-description', '.content-section']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: '', 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'greenhouse', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractLeverJob() {
  const title = extractWithFallbacks(['.posting-header h2']);
  const company = extractWithFallbacks(['.posting-org .company-name', '.company-name']);
  const location = extractWithFallbacks(['.posting-categories .location']);
  const description = extractWithFallbacks(['.posting-description', '.content']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: '', 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'lever', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractWorkdayJob() {
  const title = extractWithFallbacks(['[data-automation-id="jobTitle"]']);
  const company = extractWithFallbacks(['[data-automation-id="companyName"]']);
  const location = extractWithFallbacks(['[data-automation-id="location"]']);
  const description = extractWithFallbacks(['[data-automation-id="jobDescription"]', '[data-automation-id="description"]']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: '', 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'workday', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractAshbyJob() {
  const title = extractWithFallbacks(['[data-testid="JobTitle"]']);
  const company = extractWithFallbacks(['[data-testid="CompanyName"]']);
  const location = extractWithFallbacks(['[data-testid="Location"]']);
  const description = extractWithFallbacks(['[data-testid="JobDescription"]']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: '', 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'ashby', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractSmartRecruitersJob() {
  const title = extractWithFallbacks(['.job-title', 'h1']);
  const company = extractWithFallbacks(['.company-name']);
  const location = extractWithFallbacks(['.location']);
  const description = extractWithFallbacks(['.job-description', '.description-content']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: '', 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'smartrecruiters', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
}

function extractBambooHRJob() {
  const title = extractWithFallbacks(['h1[class*="job"]', '.job-title']);
  const company = extractWithFallbacks(['.company-name']);
  const location = extractWithFallbacks(['.location', '.job-location']);
  const description = extractWithFallbacks(['.job-description', '.description']);
  const requiredSkills = extractSkillsFromDescription(description);

  if (!title || !company) return null;

  return {
    title: title.trim(), 
    company: company.trim(), 
    location: (location || '').trim(),
    salary: '', 
    experience: '',
    description: (description || '').trim(), 
    responsibilities: (description || '').trim(),
    qualifications: '',
    requiredSkills: requiredSkills,
    preferredSkills: [],
    keywords: extractKeywords(description),
    source: 'bamboohr', 
    jobUrl: window.location.href, 
    companyLogo: '',
    postedDate: '',
    extractedAt: new Date().toISOString()
  };
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
  if (text.includes('remote') || text.includes('work from home')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  if (text.includes('on-site') || text.includes('onsite') || text.includes('in-office')) return 'On-site';
  return '';
}

// =============================================
// SPA NAVIGATION DETECTION
// =============================================

let lastUrl = location.href;

new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[CONTENT] URL changed to:', url);
    setTimeout(() => {
      const job = extractJobData();
      if (job) {
        console.log('[CONTENT] Auto-updated job after navigation:', job.title);
        notifyBackground('JOB_UPDATED', { job });
      }
    }, 1000);
  }
}).observe(document.body, { childList: true, subtree: true });

['pushState', 'replaceState'].forEach(method => {
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

// =============================================
// INITIALIZATION
// =============================================

function initialize() {
  console.log('[CONTENT] Initializing...');
  
  // Start auth observer for JobSimply site
  if (CONFIG.isJobSimplySite()) {
    console.log('[CONTENT] JobSimply site detected, starting auth observer');
    startAuthObserver();
  }
  
  // Extract job if on job site
  const hostname = window.location.hostname.toLowerCase();
  const jobSites = ['naukri.com', 'linkedin.com', 'indeed.com', 'glassdoor.com', 
                    'wellfound.com', 'greenhouse.io', 'lever.co', 'workday.com', 
                    'ashby.com', 'smartrecruiters.com', 'bamboohr.com'];
  
  const isOnJobSite = jobSites.some(site => hostname.includes(site));
  
  if (isOnJobSite) {
    console.log('[CONTENT] Job site detected, extracting job');
    setTimeout(() => extractJobData(), 1000);
  }
}

// Run initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initialize();
} else {
  window.addEventListener('DOMContentLoaded', initialize);
}

console.log('[CONTENT] Content script ready');
