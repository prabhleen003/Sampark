import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear session and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on login/public pages
      const path = window.location.pathname;
      if (path !== '/login' && !path.startsWith('/v/') && path !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/**
 * Append ?token=<jwt> to /uploads/* URLs so <img src> and PDF <a href> links
 * pass auth without needing an Authorization header.
 */
export function uploadsUrl(path) {
  if (!path) return path;
  const token = localStorage.getItem('token');
  if (!token) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}token=${token}`;
}
