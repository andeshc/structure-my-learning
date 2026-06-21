const express = require('express');
const { z } = require('zod');
const collections = require('../db/collections');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional(),
});

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(280).optional(),
});

const addGuideSchema = z.object({
  guideId: z.string().trim().min(1),
});

const reorderGuidesSchema = z.object({
  order: z.array(z.string().trim().min(1)).min(0).max(200),
});

const reorderCollectionsSchema = z.object({
  order: z.array(z.string().trim().min(1)).min(0).max(200),
});

function notFound() {
  const error = new Error('Collection not found.');
  error.status = 404;
  return error;
}

router.get('/', asyncHandler(async (req, res) => {
  res.json({ collections: await collections.listCollectionsForUser(req.user.id) });
}));

router.post('/', asyncHandler(async (req, res, next) => {
  const input = createCollectionSchema.parse(req.body);
  const collection = await collections.createCollection({
    userId: req.user.id,
    name: input.name,
    description: input.description,
  });
  res.status(201).json({ collection });
}));

router.get('/:collectionId', asyncHandler(async (req, res, next) => {
  const collection = await collections.findCollectionForUser(req.params.collectionId, req.user.id);
  if (!collection) return next(notFound());
  const guides = await collections.listGuidesInCollection(req.params.collectionId, req.user.id);
  res.json({ collection, guides });
}));

router.patch('/:collectionId', asyncHandler(async (req, res, next) => {
  const input = updateCollectionSchema.parse(req.body);
  const collection = await collections.updateCollection({
    collectionId: req.params.collectionId,
    userId: req.user.id,
    name: input.name,
    description: input.description,
  });
  if (!collection) return next(notFound());
  res.json({ collection });
}));

router.delete('/:collectionId', asyncHandler(async (req, res, next) => {
  const deleted = await collections.deleteCollection(req.params.collectionId, req.user.id);
  if (!deleted) return next(notFound());
  res.json({ ok: true });
}));

router.post('/:collectionId/guides', asyncHandler(async (req, res, next) => {
  const input = addGuideSchema.parse(req.body);
  const result = await collections.addGuideToCollection({
    collectionId: req.params.collectionId,
    userId: req.user.id,
    guideId: input.guideId,
  });
  if (result.added) {
    res.status(201).json({ ok: true });
    return;
  }
  const error = new Error(
    result.reason === 'not_in_library' ? 'Guide is not in your library.'
      : result.reason === 'collection_not_found' ? 'Collection not found.'
      : 'Could not add guide to collection.'
  );
  error.status = result.reason === 'collection_not_found' ? 404 : 400;
  next(error);
}));

router.delete('/:collectionId/guides/:guideId', asyncHandler(async (req, res, next) => {
  const removed = await collections.removeGuideFromCollection({
    collectionId: req.params.collectionId,
    userId: req.user.id,
    guideId: req.params.guideId,
  });
  if (!removed) return next(notFound());
  res.json({ ok: true });
}));

router.patch('/:collectionId/guides', asyncHandler(async (req, res, next) => {
  const input = reorderGuidesSchema.parse(req.body);
  try {
    await collections.reorderGuides({
      collectionId: req.params.collectionId,
      userId: req.user.id,
      orderedGuideIds: input.order,
    });
  } catch (err) {
    if (err.message === 'Collection not found.') return next(notFound());
    throw err;
  }
  res.json({ ok: true });
}));

router.patch('/', asyncHandler(async (req, res) => {
  const input = reorderCollectionsSchema.parse(req.body);
  await collections.setCollectionPositions({
    userId: req.user.id,
    orderedCollectionIds: input.order,
  });
  res.json({ ok: true });
}));

module.exports = router;
