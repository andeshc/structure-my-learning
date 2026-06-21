import { apiRequest } from './client';

export function listCollections() {
  return apiRequest('/api/collections');
}

export function createCollection({ name, description }) {
  return apiRequest('/api/collections', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export function getCollection(collectionId) {
  return apiRequest(`/api/collections/${collectionId}`);
}

export function updateCollection(collectionId, { name, description }) {
  return apiRequest(`/api/collections/${collectionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, description }),
  });
}

export function deleteCollection(collectionId) {
  return apiRequest(`/api/collections/${collectionId}`, { method: 'DELETE' });
}

export function addGuideToCollection(collectionId, guideId) {
  return apiRequest(`/api/collections/${collectionId}/guides`, {
    method: 'POST',
    body: JSON.stringify({ guideId }),
  });
}

export function removeGuideFromCollection(collectionId, guideId) {
  return apiRequest(`/api/collections/${collectionId}/guides/${guideId}`, {
    method: 'DELETE',
  });
}

export function reorderCollectionGuides(collectionId, order) {
  return apiRequest(`/api/collections/${collectionId}/guides`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export function reorderCollections(order) {
  return apiRequest('/api/collections', {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}
