import { apiBaseUrl, apiRequest, setAccessToken } from './client';

export async function registerUser(input) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function loginUser(input) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function refreshSession() {
  const data = await apiRequest('/auth/refresh', { method: 'POST' });
  setAccessToken(data.accessToken);
  const me = await apiRequest('/auth/me');
  return me.user;
}

export async function logoutUser() {
  await apiRequest('/auth/logout', { method: 'POST' });
  setAccessToken(null);
}

export function oauthUrl(provider) {
  return `${apiBaseUrl}/auth/${provider}`;
}
