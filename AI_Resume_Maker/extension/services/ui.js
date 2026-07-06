// UI Module - Display and user interactions
// Simplified - Only job display and status messages

export function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.classList.remove('hidden');

  setTimeout(() => statusEl.classList.add('hidden'), 5000);
}

export function displayJob(job) {
  if (!job) {
    const jobCard = document.getElementById('job-card');
    if (jobCard) jobCard.classList.add('hidden');
    return;
  }

  const titleEl = document.getElementById('job-title');
  const companyEl = document.getElementById('job-company');
  const locationEl = document.getElementById('job-location');
  const jobCard = document.getElementById('job-card');

  if (titleEl) titleEl.textContent = job.title || 'No title';
  if (companyEl) companyEl.textContent = job.company || 'No company';
  if (locationEl) locationEl.textContent = job.location || '';
  if (jobCard) jobCard.classList.remove('hidden');
}

export function openDashboard() {
  chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
}

export function openSettings() {
  chrome.runtime.openOptionsPage();
}