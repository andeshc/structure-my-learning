import { apiRequest } from './client';

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
  return apiRequest('/api/auth/refresh', { method: 'POST' });
}

export function logout() {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export function fetchMe() {
  return apiRequest('/api/auth/me');
}
