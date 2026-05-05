import { Router } from 'express';
import { z } from 'zod';
import { createGuideWithTopics, deleteGuideForUser, findGuideForUser, listGuidesForUser } from '../db/guides.js';
import { listTopicsForGuide } from '../db/topics.js';
import { generateOutline } from '../services/ai.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createId } from '../utils/ids.js';

export const guidesRouter = Router();

const createGuideSchema = z.object({
  prompt: z.string().trim().min(5).max(500)
});

function buildGuidePayload(guide) {
  return {
    ...guide,
    progressPercentage: Number(guide.progressPercentage || 0),
    topics: listTopicsForGuide(guide.id)
  };
}

guidesRouter.get('/', (req, res) => {
  res.json({ guides: listGuidesForUser(req.user.id) });
});

guidesRouter.post('/', asyncHandler(async (req, res) => {
  const input = createGuideSchema.parse(req.body);
  const outline = await generateOutline(input.prompt);
  const guideId = createId('gde');

  createGuideWithTopics({
    guide: {
      id: guideId,
      userId: req.user.id,
      title: outline.title,
      prompt: input.prompt
    },
    topics: outline.topics.map((topic, index) => ({
      id: createId('top'),
      guideId,
      position: index + 1,
      title: topic.title,
      description: topic.description
    }))
  });

  const guide = findGuideForUser(guideId, req.user.id);
  res.status(201).json({ guide: buildGuidePayload(guide) });
}));

guidesRouter.get('/:guideId', (req, res, next) => {
  const guide = findGuideForUser(req.params.guideId, req.user.id);

  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    next(error);
    return;
  }

  res.json({ guide: buildGuidePayload(guide) });
});

guidesRouter.delete('/:guideId', (req, res, next) => {
  const result = deleteGuideForUser(req.params.guideId, req.user.id);

  if (result.changes === 0) {
    const error = new Error('Guide not found.');
    error.status = 404;
    next(error);
    return;
  }

  res.json({ ok: true });
});
