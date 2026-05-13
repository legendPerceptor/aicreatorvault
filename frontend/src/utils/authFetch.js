const TOKEN_KEY = 'access_token';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: refreshToken ? { Authorization: `Bearer ${refreshToken}` } : {},
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json();
  if (data.accessToken) {
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
  }
  return data.accessToken;
}

export async function authFetch(url, options = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    // Try to refresh the token once
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const newToken = await refreshPromise;
      const retryHeaders = {
        ...(options.headers || {}),
        ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
      };
      return fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
    } catch {
      // Refresh failed, return original 401 response
      return res;
    }
  }

  return res;
}
