// Comprehensive API Service for JobSimply Extension
// Handles: Jobs, Profile, Resumes, Applications, AI, Analytics

const API_BASE = 'http://localhost:5000';

// Token management
let currentToken = null;
let refreshPromise = null;

// =============================================
// TOKEN MANAGEMENT
// =============================================

export function setToken(token) {
  currentToken = token;
}

export function getToken() {
  return currentToken;
}

// =============================================
// TOKEN REFRESH
// =============================================

async function refreshToken() {
  if (refreshPromise) {
    return refreshPromise;
  }
  
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          currentToken = data.accessToken;
          return data.accessToken;
        }
      }
      currentToken = null;
      return null;
    } catch (error) {
      currentToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

async function getValidToken() {
  if (currentToken) {
    return currentToken;
  }
  
  const newToken = await refreshToken();
  if (newToken) {
    return newToken;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/session`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await response.json();
    if (data.authenticated && data.token) {
      currentToken = data.token;
      return data.token;
    }
  } catch (e) {}
  
  return null;
}

// =============================================
// HTTP CLIENT
// =============================================

async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, requiresAuth = true, retries = 1 } = options;
  
  let token = currentToken;
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (requiresAuth && !token) {
      token = await getValidToken();
    }
    
    const headers = { 'Content-Type': 'application/json' };
    if (token && requiresAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fetchOptions = { method, headers, credentials: 'include' };
    
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
      const data = await response.json().catch(() => ({}));
      
      if (requiresAuth && (response.status === 401 || response.status === 403)) {
        const newToken = await refreshToken();
        if (newToken && attempt < retries) {
          token = newToken;
          continue;
        }
        throw new Error(data.message || 'Authentication required. Please sign in.');
      }
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      lastError = error;
      if (error.message.includes('Authentication') || attempt >= retries) {
        throw error;
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  throw lastError;
}

// =============================================
// AUTH API
// =============================================

export const auth = {
  async getSession() {
    return apiRequest('/auth/session', { requiresAuth: false });
  },
  
  async refresh() {
    return apiRequest('/auth/refresh', { method: 'POST' });
  },
  
  async logout() {
    return apiRequest('/auth/logout', { method: 'POST' });
  }
};

// =============================================
// PROFILE API
// =============================================

export const profile = {
  async get() {
    return apiRequest('/profile');
  },
  
  async update(data) {
    return apiRequest('/profile', { method: 'PUT', body: data });
  },
  
  async delete(password) {
    return apiRequest('/profile', { method: 'DELETE', body: { password } });
  }
};

// =============================================
// JOBS API
// =============================================

export const jobs = {
  async extract(jobData) {
    return apiRequest('/api/jobs/extract', { method: 'POST', body: jobData });
  },
  
  async get(jobId) {
    return apiRequest(`/api/jobs/${jobId}`);
  },
  
  async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/jobs${query ? `?${query}` : ''}`);
  },
  
  async getSaved() {
    return apiRequest('/api/jobs/saved');
  },
  
  async sync(jobs) {
    return apiRequest('/api/jobs/sync', { method: 'POST', body: { jobs } });
  },
  
  async updateStatus(jobId, status) {
    return apiRequest(`/api/jobs/${jobId}/status`, { method: 'PATCH', body: { status } });
  },
  
  async delete(jobId) {
    return apiRequest(`/api/jobs/${jobId}`, { method: 'DELETE' });
  }
};

// =============================================
// APPLICATIONS API
// =============================================

export const applications = {
  async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/applications${query ? `?${query}` : ''}`);
  },
  
  async get(id) {
    return apiRequest(`/applications/${id}`);
  },
  
  async create(data) {
    return apiRequest('/applications', { method: 'POST', body: data });
  },
  
  async update(id, data) {
    return apiRequest(`/applications/${id}`, { method: 'PATCH', body: data });
  },
  
  async delete(id) {
    return apiRequest(`/applications/${id}`, { method: 'DELETE' });
  },
  
  async getStats() {
    return apiRequest('/applications/stats');
  }
};

// =============================================
// RESUMES API
// =============================================

export const resumes = {
  async list() {
    return apiRequest('/resumes');
  },
  
  async get(id) {
    return apiRequest(`/resumes/${id}`);
  },
  
  async getActive() {
    return apiRequest('/resumes/active');
  },
  
  async upload(file, metadata = {}) {
    const formData = new FormData();
    formData.append('resume', file);
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    const token = await getValidToken();
    const response = await fetch(`${API_BASE}/resumes/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      credentials: 'include',
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Upload failed');
    }
    return data;
  },
  
  async update(id, data) {
    return apiRequest(`/resumes/${id}`, { method: 'PATCH', body: data });
  },
  
  async delete(id) {
    return apiRequest(`/resumes/${id}`, { method: 'DELETE' });
  }
};

// =============================================
// TAILORED RESUMES API
// =============================================

export const tailoredResumes = {
  async list(jobId) {
    return apiRequest(`/api/jobs/tailored-resumes?jobId=${jobId}`);
  },
  
  async generate(data) {
    return apiRequest('/api/jobs/tailor-custom', { method: 'POST', body: data });
  },
  
  async save(tailoredResumeId) {
    return apiRequest('/tailored-resumes/save', { method: 'POST', body: { tailoredResumeId } });
  },
  
  async get(id) {
    return apiRequest(`/resumes/tailored/${id}`);
  }
};

// =============================================
// COVER LETTERS API
// =============================================

export const coverLetters = {
  async list() {
    return apiRequest('/coverletters');
  },
  
  async get(id) {
    return apiRequest(`/coverletters/${id}`);
  },
  
  async generate(data) {
    return apiRequest('/coverletters/generate', { method: 'POST', body: data });
  },
  
  async update(id, data) {
    return apiRequest(`/coverletters/${id}`, { method: 'PATCH', body: data });
  }
};

// =============================================
// AI API
// =============================================

export const ai = {
  async generateCoverLetter(data) {
    return apiRequest('/api/ai/cover-letter', { method: 'POST', body: data });
  },
  
  async analyzeJob(jobData) {
    return apiRequest('/api/ai/analyze-job', { method: 'POST', body: jobData });
  },
  
  async generateAnswers(questions, context) {
    return apiRequest('/api/ai/generate-answers', { method: 'POST', body: { questions, context } });
  },
  
  async improveText(text, type) {
    return apiRequest('/api/ai/improve', { method: 'POST', body: { text, type } });
  }
};

// =============================================
// ANALYTICS API
// =============================================

export const analytics = {
  async getDashboard() {
    return apiRequest('/api/analytics/dashboard');
  },
  
  async getActivity(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/analytics/activity${query ? `?${query}` : ''}`);
  }
};

// =============================================
// LEGACY EXPORTS
// =============================================

export async function extractJob(job, token) {
  if (token) currentToken = token;
  return jobs.extract(job);
}

export async function checkSession() {
  return auth.getSession();
}

export default {
  setToken,
  getToken,
  auth,
  profile,
  jobs,
  applications,
  resumes,
  tailoredResumes,
  coverLetters,
  ai,
  analytics,
  extractJob,
  checkSession
};
