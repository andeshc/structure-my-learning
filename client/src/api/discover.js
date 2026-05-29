import { apiRequest } from './client';

export function listPublicGuides(offset = 0, limit = 24) {
  return apiRequest(`/api/discover?limit=${limit}&offset=${offset}`);
}
