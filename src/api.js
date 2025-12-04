// src/api.js
// const API_ORIGIN = 'http://localhost:4000';
const API_ORIGIN = 'https://api-logdaily-com.onrender.com';
const TOKEN_KEY = 'habit_tracker_token';

export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// small fetch wrapper that always attaches Bearer token if present
export async function authFetch(path, opts = {}) {
  const url = path.startsWith('http') ? path : API_ORIGIN + path;
  const token = getAuthToken();
  const headers = new Headers(opts.headers || {});
  headers.set('Content-Type', opts.headers?.['Content-Type'] || 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...opts, headers, credentials: 'include' });
  // optional: auto-logout on 401
  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Unauthorized');
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}
