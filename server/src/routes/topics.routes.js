const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const ai = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const progressSchema = z.object({
  isCompleted: z.boolean(),
});

router.get('/:topicId', asyncHandler(async (req, res, next) => {
  const found = topicsDb.findTopicForUser(req.params.topicId, req.user.id);

  if (!found) {
    const error = new Error('Topic not found.');
    error.status = 404;
    next(error);
    return;
  }

  let { topic } = found;

  if (!topic.contentMarkdown) {
    const outline = topicsDb.listTopicsForGuide(found.guide.id).map(({ title, description, position }) => ({
      title,
      description,
      position,
    }));
    const generated = await ai.generateTopicContent({ guide: found.guide, outline, topic });
    topicsDb.saveTopicContent(topic.id, generated.contentMarkdown);
    topic = topicsDb.findTopicForUser(topic.id, req.user.id).topic;
  }

  res.json({ guide: found.guide, topic });
}));

router.patch('/:topicId/progress', (req, res, next) => {
  const input = progressSchema.parse(req.body);
  const found = topicsDb.findTopicForUser(req.params.topicId, req.user.id);

  if (!found) {
    const error = new Error('Topic not found.');
    error.status = 404;
    next(error);
    return;
  }

  const topic = topicsDb.updateTopicProgress(req.params.topicId, input.isCompleted);
  const guide = guides.findGuideForUser(topic.guideId, req.user.id);

  res.json({
    topic: {
      id: topic.id,
      isCompleted: topic.isCompleted,
      completedAt: topic.completedAt,
    },
    guide: {
      id: guide.id,
      progressPercentage: guide.progressPercentage,
    },
  });
});

module.exports = router;
