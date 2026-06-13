import { apiRequest } from './client';

export function createCheckout({ plan, region }) {
  return apiRequest('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, region }),
  });
}

export function getLtdStatus() {
  return fetch('/api/ltd-status').then((r) => r.json());
}
