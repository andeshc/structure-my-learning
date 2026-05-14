const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const ai = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');
const { aiRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

const progressSchema = z.object({
  isCompleted: z.boolean(),
});

const chatSchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(['user', 'assistant', 'system']) }).passthrough()
  ).min(1).max(20),
});

router.get('/:topicId', asyncHandler(async (req, res, next) => {
  const found = topicsDb.findTopicForUser(req.params.topicId, req.user.id);

  if (!found) {
    const error = new Error('Topic not found.');
    error.status = 404;
    next(error);
    return;
  }

  const { topic } = found;
  const allTopics = topicsDb.listTopicsForGuide(found.guide.id);
  const currentIdx = allTopics.findIndex((t) => t.id === topic.id);
  const prevItem = currentIdx > 0 ? allTopics[currentIdx - 1] : null;
  const nextItem = currentIdx < allTopics.length - 1 ? allTopics[currentIdx + 1] : null;

  res.json({
    guide: found.guide,
    topic,
    allTopics: allTopics.map((t) => ({
      id: t.id,
      position: t.position,
      title: t.title,
      isCompleted: t.isCompleted,
      hasContent: t.hasContent,
    })),
    prevTopic: prevItem ? { id: prevItem.id, title: prevItem.title } : null,
    nextTopic: nextItem ? { id: nextItem.id, title: nextItem.title } : null,
  });
}));

router.get('/:topicId/content', aiRateLimit, asyncHandler(async (req, res, next) => {
  const found = topicsDb.findTopicForUser(req.params.topicId, req.user.id);

  if (!found) {
    const error = new Error('Topic not found.');
    error.status = 404;
    next(error);
    return;
  }

  if (found.topic.contentMarkdown) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(found.topic.contentMarkdown);
    return;
  }

  const outline = found.guide.outline || {
    title: found.guide.title,
    sections: topicsDb.listTopicsForGuide(found.guide.id).map(({ title, description, position }) => ({
      title,
      description,
      position,
    })),
  };
  const outlineSection = outline.sections?.[found.topic.position - 1] ?? null;
  const topicWithSection = { ...found.topic, outlineSection };

  const result = await ai.streamTopicContent({ guide: found.guide, outline, topic: topicWithSection });

  result.text
    .then((text) => topicsDb.saveTopicContent(found.topic.id, text))
    .catch((err) => console.error('Content save failed:', err.message));

  result.pipeTextStreamToResponse(res);
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

router.post('/:topicId/chat', aiRateLimit, asyncHandler(async (req, res, next) => {
  const { messages } = chatSchema.parse(req.body);
  const found = topicsDb.findTopicForUser(req.params.topicId, req.user.id);

  if (!found) {
    const error = new Error('Topic not found.');
    error.status = 404;
    next(error);
    return;
  }

  const result = await ai.chatWithTutor({ guide: found.guide, topic: found.topic, messages });
  result.pipeUIMessageStreamToResponse(res);
}));

module.exports = router;
