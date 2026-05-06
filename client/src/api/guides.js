import { apiRequest } from './client';

export function listGuides() {
  return apiRequest('/guides');
}

export function createGuide(prompt) {
  return apiRequest('/guides', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
}

export function getGuide(guideId) {
  return apiRequest(`/guides/${guideId}`);
}

export function deleteGuide(guideId) {
  return apiRequest(`/guides/${guideId}`, { method: 'DELETE' });
}

export function getTopic(topicId) {
  return apiRequest(`/topics/${topicId}`);
}

export function updateTopicProgress(topicId, isCompleted) {
  return apiRequest(`/topics/${topicId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted })
  });
}
