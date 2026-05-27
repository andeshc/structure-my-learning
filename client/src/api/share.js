import { apiRequest } from './client';

export function getSharedGuideMeta(token) {
  return apiRequest(`/api/share/${token}`);
}

export function getSharedGuide(token) {
  return apiRequest(`/api/share/${token}/guide`);
}

export function adoptGuide(token) {
  return apiRequest(`/api/share/${token}/adopt`, { method: 'POST' });
}

export function getSharedSubtopic(token, topicId, position) {
  return apiRequest(`/api/share/${token}/topics/${topicId}/subtopics/${position}`);
}

export function shareGuide(guideId) {
  return apiRequest(`/api/guides/${guideId}/share`, { method: 'POST' });
}
