import { apiRequest } from './client';

export function setup(payload) {
  return apiRequest('/api/account/setup', { method: 'PATCH', body: JSON.stringify(payload) });
}

export function updateProfile(payload) {
  return apiRequest('/api/account', { method: 'PATCH', body: JSON.stringify(payload) });
}
