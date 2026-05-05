import { Router } from 'express';
import { z } from 'zod';
import { findGuideForUser } from '../db/guides.js';
import { findTopicForUser, listTopicsForGuide, saveTopicContent, updateTopicProgress } from '../db/topics.js';
import { generateTopicContent } from '../services/ai.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const topicsRouter = Router();

const progressSchema = z.object({
  isCompleted: z.boolean()
});

topicsRouter.get('/:topicId', asyncHandler(async (req, res) => {
  let topic = findTopicForUser(req.params.topicId, req.user.id);

  if (!topic) {
    const error = new Error('Topic not found.');
    error.status = 404;
    throw error;
  }

  if (!topic.contentMarkdown) {
    const guide = findGuideForUser(topic.guideId, req.user.id);
    const outline = listTopicsForGuide(topic.guideId).map(({ title, description, position }) => ({
      position,
      title,
      description
    }));
    const result = await generateTopicContent({ guide, outline, topic });
    saveTopicContent(topic.id, topic.guideId, result.contentMarkdown);
    topic = findTopicForUser(req.params.topicId, req.user.id);
  }

  res.json({ topic });
}));

topicsRouter.patch('/:topicId/progress', (req, res, next) => {
  const input = progressSchema.parse(req.body);
  const topic = updateTopicProgress(req.params.topicId, req.user.id, input.isCompleted);

  if (!topic) {
    const error = new Error('Topic not found.');
    error.status = 404;
    next(error);
    return;
  }

  const guide = findGuideForUser(topic.guideId, req.user.id);
  res.json({
    topic: {
      id: topic.id,
      isCompleted: topic.isCompleted,
      completedAt: topic.completedAt
    },
    guide: {
      id: guide.id,
      progressPercentage: Number(guide.progressPercentage || 0)
    }
  });
});
