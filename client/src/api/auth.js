import { apiRequest } from './client';

let refreshSessionPromise = null;

export function register(payload) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function refreshSession() {
  if (!refreshSessionPromise) {
    refreshSessionPromise = apiRequest('/api/auth/refresh', { method: 'POST' })
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
}

export function logout() {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export function fetchMe() {
  return apiRequest('/api/auth/me');
}

export function verifyEmail(token) {
  return apiRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function resendVerification(email) {
  return apiRequest('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
