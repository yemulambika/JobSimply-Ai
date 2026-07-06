// Background service worker - Minimal implementation
// Chrome Extension only handles job extraction, all AI processing is done on the website

const API_BASE = 'http://localhost:5000';

// Initialize
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.sync.set({ token: null });
  }
});

// Message handler - Only handles extraction, no AI processing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true;
});

async function handleMessage(request, sender) {
  switch (request.action) {
    case 'extractJob':
      return await extractAndSendJob(request.job, request.token);
    default:
      return { success: false, message: 'Unknown action: ' + request.action };
  }
}

// Send job to backend for extraction and analysis
async function extractAndSendJob(job, token) {
  try {
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
      throw new Error(result.message || 'Extract failed');
    }

    return { 
      success: true, 
      jobId: result.jobId,
      matchScore: result.matchScore,
      atsScore: result.atsScore,
      missingSkills: result.missingSkills,
      matchingSkills: result.matchingSkills
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}