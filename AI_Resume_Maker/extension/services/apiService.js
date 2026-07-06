// API Service - Single endpoint for job extraction only
// All AI processing happens on the website/backend

const API_BASE = 'http://localhost:5000';

// Extract job - sends job JSON to backend, returns analysis results
export async function extractJob(job, token) {
  const response = await fetch(`${API_BASE}/api/jobs/extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(job)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || response.statusText);
  }

  return data;
}