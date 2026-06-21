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

export function fetchClarifyingQuestions(payload) {
  return apiRequest('/api/guides/clarifying-questions', {
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

export function getSubtopic(topicId, position) {
  return apiRequest(`/api/topics/${topicId}/subtopics/${position}`);
}

export function updateSubtopicProgress(topicId, position, isCompleted) {
  return apiRequest(`/api/topics/${topicId}/subtopics/${position}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted }),
  });
}

export function developGuide(guideId) {
  return apiRequest(`/api/guides/${guideId}/develop`, { method: 'POST' });
}

export function getGuideOutlineStatus(guideId) {
  return apiRequest(`/api/guides/${guideId}/outline-status`);
}

export function extendGuide(guideId, userPrompt) {
  return apiRequest(`/api/guides/${guideId}/extend`, {
    method: 'POST',
    body: JSON.stringify({ userPrompt }),
  });
}

export function refineGuide(guideId, userPrompt) {
  return apiRequest(`/api/guides/${guideId}/refine`, {
    method: 'POST',
    body: JSON.stringify({ userPrompt }),
  });
}

export function finalizeGuide(guideId, extraSections) {
  return apiRequest(`/api/guides/${guideId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({ extraSections }),
  });
}

export function toggleSharing(guideId, isPublic) {
  return apiRequest(`/api/guides/${guideId}/sharing`, {
    method: 'PATCH',
    body: JSON.stringify({ public: isPublic }),
  });
}

export function listGuideCollections(guideId) {
  return apiRequest(`/api/guides/${guideId}/collections`);
}
