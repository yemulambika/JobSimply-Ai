// Options page script

const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.sync.get({
    autoAnalyze: true,
    notifications: true,
    defaultTone: 'professional',
    backendUrl: 'http://localhost:5000'
  });

  const autoAnalyzeEl = document.getElementById('auto-analyze');
  const notificationsEl = document.getElementById('notifications');
  const defaultToneEl = document.getElementById('default-tone');
  const backendUrlEl = document.getElementById('backend-url');
  
  if (autoAnalyzeEl) autoAnalyzeEl.checked = settings.autoAnalyze;
  if (notificationsEl) notificationsEl.checked = settings.notifications;
  if (defaultToneEl) defaultToneEl.value = settings.defaultTone;
  if (backendUrlEl) backendUrlEl.value = settings.backendUrl;

  // Load token if exists and load profile
  const { token } = await chrome.storage.sync.get(['token']);
  if (token) {
    // Load profile from backend
    await loadProfile();
  }

  const saveBtn = document.getElementById('save-btn');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
});

async function loadProfile() {
  const { token } = await chrome.storage.sync.get(['token']);
  if (!token) return;

  console.log('[OPTIONS] Load Profile - Request URL:', `${API_BASE}/api/profile`);
  console.log('[OPTIONS] Load Profile - HTTP Method: GET');
  
  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('[OPTIONS] Load Profile - HTTP Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[OPTIONS] Load Profile - Response Body:', JSON.stringify(data, null, 2));
      const profile = data.profile;
      
      if (profile) {
        setValue('first-name', profile.firstName || '');
        setValue('last-name', profile.lastName || '');
        setValue('email', profile.email || '');
        setValue('phone', profile.phone || '');
        setValue('address', profile.address || '');
        setValue('city', profile.city || '');
        setValue('state', profile.state || '');
        setValue('country', profile.country || '');
        setValue('zip', profile.zip || '');
        setValue('linkedin', profile.linkedin || '');
        setValue('github', profile.github || '');
        setValue('portfolio', profile.portfolio || '');
        setValue('current-company', profile.currentCompany || '');
        setValue('designation', profile.designation || '');
      }
    } else {
      console.error('[OPTIONS] Load Profile - Failed with status:', response.status);
    }
  } catch (error) {
    console.error('[OPTIONS] Load Profile - Exception:', error.message);
    showStatus('Failed to load profile', 'error');
  }
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

async function saveSettings() {
  const autoAnalyzeEl = document.getElementById('auto-analyze');
  const notificationsEl = document.getElementById('notifications');
  const defaultToneEl = document.getElementById('default-tone');
  const backendUrlEl = document.getElementById('backend-url');
  
  const settings = {
    autoAnalyze: autoAnalyzeEl?.checked ?? true,
    notifications: notificationsEl?.checked ?? true,
    defaultTone: defaultToneEl?.value ?? 'professional',
    backendUrl: backendUrlEl?.value ?? 'http://localhost:5000'
  };

  await chrome.storage.sync.set(settings);
  showStatus('Settings saved!', 'success');
}

async function saveProfile() {
  const { token } = await chrome.storage.sync.get(['token']);
  if (!token) {
    showStatus('Please login first in the popup', 'error');
    return;
  }

  const profileData = {
    firstName: getValue('first-name'),
    lastName: getValue('last-name'),
    email: getValue('email'),
    phone: getValue('phone'),
    address: getValue('address'),
    city: getValue('city'),
    state: getValue('state'),
    country: getValue('country'),
    zip: getValue('zip'),
    linkedin: getValue('linkedin'),
    github: getValue('github'),
    portfolio: getValue('portfolio'),
    currentCompany: getValue('current-company'),
    designation: getValue('designation')
  };

  console.log('[OPTIONS] Save Profile - Request URL:', `${API_BASE}/api/profile`);
  console.log('[OPTIONS] Save Profile - HTTP Method: PUT');
  console.log('[OPTIONS] Save Profile - Request Body:', JSON.stringify(profileData, null, 2));

  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });

    console.log('[OPTIONS] Save Profile - HTTP Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OPTIONS] Save Profile - Failed:', errorText);
      showStatus('Failed to save profile', 'error');
      return;
    }

    const data = await response.json();
    console.log('[OPTIONS] Save Profile - Response Body:', JSON.stringify(data, null, 2));
    showStatus('Profile saved!', 'success');
  } catch (error) {
    console.error('[OPTIONS] Save Profile - Exception:', error.message);
    showStatus('Error: ' + error.message, 'error');
  }
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = message;
  status.className = `status ${type}`;
  
  setTimeout(() => {
    status.textContent = '';
    status.className = 'status';
  }, 3000);
}