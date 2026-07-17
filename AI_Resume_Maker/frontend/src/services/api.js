import axios from 'axios';

// Use relative URLs so requests go through Vite's proxy in any environment.
// An absolute VITE_API_URL can still be set if calling a remote backend directly.
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from cookies or localStorage
api.interceptors.request.use((config) => {
  const token =
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] ||
    localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;