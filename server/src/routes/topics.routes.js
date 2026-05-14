const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const subtopicsDb = require('../db/subtopics');
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

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  if (found.topic.contentHtml) {
    res.write(JSON.stringify({ type: 'content_chunk', text: found.topic.contentHtml }) + '\n');
    res.end();
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

  const onEvent = (event) => {
    if (!res.writableEnded) res.write(JSON.stringify(event) + '\n');
  };

  try {
    const result = await ai.streamTopicContent({ guide: found.guide, outline, topic: topicWithSection, onEvent });

    result.text
      .then((html) => topicsDb.saveTopicContentHtml(found.topic.id, html))
      .catch((err) => console.error('Content save failed:', err.message));

    for await (const chunk of result.textStream) {
      if (res.writableEnded) break;
      res.write(JSON.stringify({ type: 'content_chunk', text: chunk }) + '\n');
    }
  } catch (err) {
    console.error('[content] generation error:', err);
    if (!res.writableEnded) {
      res.write(JSON.stringify({ type: 'error', message: 'Content generation failed.' }) + '\n');
    }
  }

  if (!res.writableEnded) res.end();
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

router.get('/:topicId/subtopics/:position', asyncHandler(async (req, res, next) => {
  const position = parseInt(req.params.position, 10);
  if (isNaN(position) || position < 0) {
    const error = new Error('Invalid subtopic position.');
    error.status = 400;
    return next(error);
  }

  const found = topicsDb.findTopicForUser(req.params.topicId, req.user.id);
  if (!found) {
    const error = new Error('Topic not found.');
    error.status = 404;
    return next(error);
  }

  const outline = found.guide.outline;
  const sectionIndex = found.topic.position - 1;
  const section = outline?.sections?.[sectionIndex];
  const item = section?.items?.[position];

  if (!item) {
    const error = new Error('Subtopic not found.');
    error.status = 404;
    return next(error);
  }

  const subtopic = subtopicsDb.findSubtopicForUser(req.params.topicId, position, req.user.id);

  res.json({
    subtopic: subtopic?.subtopic ?? { id: null, position, title: item.title, contentHtml: null, hasContent: false },
    item,
    topic: { id: found.topic.id, title: found.topic.title, description: found.topic.description, position: found.topic.position },
    guide: { id: found.guide.id, title: found.guide.title },
  });
}));

router.get('/:topicId/subtopics/:position/content', aiRateLimit, asyncHandler(async (req, res, next) => {
  const position = parseInt(req.params.position, 10);
  if (isNaN(position) || position < 0) {
    const error = new Error('Invalid subtopic position.');
    error.status = 400;
    return next(error);
  }

  const found = topicsDb.findTopicForUser(req.params.topicId, req.user.id);
  if (!found) {
    const error = new Error('Topic not found.');
    error.status = 404;
    return next(error);
  }

  const outline = found.guide.outline;
  const sectionIndex = found.topic.position - 1;
  const section = outline?.sections?.[sectionIndex];
  const item = section?.items?.[position];

  if (!item) {
    const error = new Error('Subtopic not found.');
    error.status = 404;
    return next(error);
  }

  const subtopic = subtopicsDb.findOrCreateSubtopic(req.params.topicId, position, item.title);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  if (subtopic.contentHtml) {
    res.write(JSON.stringify({ type: 'content_chunk', text: subtopic.contentHtml }) + '\n');
    res.end();
    return;
  }

  const onEvent = (event) => {
    if (!res.writableEnded) res.write(JSON.stringify(event) + '\n');
  };

  try {
    const result = await ai.streamSubtopicContent({
      guide: found.guide,
      outline,
      topic: found.topic,
      item,
      onEvent,
    });

    result.text
      .then((html) => subtopicsDb.saveSubtopicContentHtml(subtopic.id, html))
      .catch((err) => console.error('Subtopic content save failed:', err.message));

    for await (const chunk of result.textStream) {
      if (res.writableEnded) break;
      res.write(JSON.stringify({ type: 'content_chunk', text: chunk }) + '\n');
    }
  } catch (err) {
    console.error('[subtopic content] generation error:', err);
    if (!res.writableEnded) {
      res.write(JSON.stringify({ type: 'error', message: 'Content generation failed.' }) + '\n');
    }
  }

  if (!res.writableEnded) res.end();
}));

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
