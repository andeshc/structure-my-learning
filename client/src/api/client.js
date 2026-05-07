let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    accessToken = null;
    throw new Error('Session expired.');
  }

  const data = await response.json();
  accessToken = data.accessToken;
  return data;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && path !== '/api/auth/refresh') {
    await refreshAccessToken();
    return apiRequest(path, options);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || 'Request failed.';

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { type: 'error', message },
      }));
    }

    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}
