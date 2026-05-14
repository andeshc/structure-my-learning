import { apiRequest } from './client';

export function listGuides() {
  return apiRequest('/api/guides');
}

export function createGuide(payload) {
  return apiRequest('/api/guides', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getGuide(guideId) {
  return apiRequest(`/api/guides/${guideId}`);
}

export function deleteGuide(guideId) {
  return apiRequest(`/api/guides/${guideId}`, { method: 'DELETE' });
}

export function getTopic(topicId) {
  return apiRequest(`/api/topics/${topicId}`);
}

export function updateTopicProgress(topicId, isCompleted) {
  return apiRequest(`/api/topics/${topicId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted }),
  });
}

export function getSubtopic(topicId, position) {
  return apiRequest(`/api/topics/${topicId}/subtopics/${position}`);
}

