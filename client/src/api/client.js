const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to refresh session.');
        }

        const data = await response.json();
        accessToken = data.accessToken;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && accessToken) {
    await refreshAccessToken();
    headers.set('Authorization', `Bearer ${accessToken}`);

    return apiRequest(path, {
      ...options,
      headers
    });
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed.');
  }

  return response.status === 204 ? null : response.json();
}

export const apiBaseUrl = API_BASE_URL;
