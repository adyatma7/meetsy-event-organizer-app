/**
 * API Client — Axios-like fetch wrapper
 *
 * Handles: base URL, auth token injection, error normalization
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get the stored auth token (admin or staff).
 */
function getToken() {
  // Check Zustand store first (memory), fall back to sessionStorage
  return sessionStorage.getItem('token') || null;
}

/**
 * Make an API request.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle non-JSON responses (e.g., file downloads)
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response;
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  if (data && typeof data === 'object' && data.success === true && 'data' in data) {
    return data.data;
  }

  return data;
}

// Convenience methods
const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
