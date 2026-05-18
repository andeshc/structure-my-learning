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

  // Merge outline items with DB completion state
  const dbSubtopics = subtopicsDb.listSubtopicsForTopic(req.params.topicId);
  const dbByPosition = Object.fromEntries(dbSubtopics.map((s) => [s.position, s]));

  const sectionItems = (section.items || []).map((si, i) => ({
    position: i,
    title: si.title,
    importance: si.importance,
    isCompleted: dbByPosition[i]?.isCompleted ?? false,
    hasContent: dbByPosition[i]?.hasContent ?? false,
  }));

  const prevItem = position > 0 ? { position: position - 1, title: section.items[position - 1].title } : null;
  const nextItem = position < section.items.length - 1
    ? { position: position + 1, title: section.items[position + 1].title }
    : null;

  // May not exist yet (first visit before generation)
  const dbSubtopic = dbByPosition[position] ?? null;

  const guide = guides.findGuideForUser(found.guide.id, req.user.id);
  const totalSubtopics = outline?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
  const completedSubtopics = guide?.completedSubtopicCount ?? 0;
  const subtopicProgressPercentage = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  res.json({
    subtopic: dbSubtopic
      ? dbSubtopic
      : { id: null, position, title: item.title, contentHtml: null, hasContent: false, isCompleted: false, completedAt: null },
    item,
    sectionItems,
    prevItem,
    nextItem,
    topic: { id: found.topic.id, title: found.topic.title, description: found.topic.description, position: found.topic.position },
    guide: { id: found.guide.id, title: found.guide.title, progressPercentage: guide?.progressPercentage ?? 0, subtopicProgressPercentage },
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

router.patch('/:topicId/subtopics/:position/progress', asyncHandler(async (req, res, next) => {
  const { isCompleted } = progressSchema.parse(req.body);
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
  subtopicsDb.updateSubtopicProgress(subtopic.id, isCompleted);

  // Roll up: mark parent topic complete if all subtopics in section are done
  const totalItems = section.items.length;
  const allDbSubtopics = subtopicsDb.listSubtopicsForTopic(req.params.topicId);
  const completedCount = allDbSubtopics.filter((s) => s.isCompleted).length;
  topicsDb.updateTopicProgress(req.params.topicId, completedCount >= totalItems);

  const guide = guides.findGuideForUser(found.guide.id, req.user.id);
  const totalSubtopics = outline?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
  const completedSubtopicsCount = guide?.completedSubtopicCount ?? 0;
  const subtopicProgressPercentage = totalSubtopics > 0 ? Math.round((completedSubtopicsCount / totalSubtopics) * 100) : 0;

  res.json({
    isCompleted,
    guide: { id: found.guide.id, progressPercentage: guide?.progressPercentage ?? 0, subtopicProgressPercentage },
  });
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
