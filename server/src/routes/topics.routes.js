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
    devStatus: dbByPosition[i]?.devStatus ?? 'pending',
  }));

  const prevItem = position > 0 ? { position: position - 1, title: section.items[position - 1].title } : null;
  const nextItem = position < section.items.length - 1
    ? { position: position + 1, title: section.items[position + 1].title }
    : null;

  // On the last subtopic of a topic, find the first subtopic of the next topic
  let nextTopic = null;
  if (!nextItem) {
    const nextSection = outline?.sections?.[sectionIndex + 1];
    if (nextSection) {
      const allTopics = topicsDb.listTopicsForGuide(found.guide.id);
      const nt = allTopics.find((t) => t.position === found.topic.position + 1);
      if (nt) nextTopic = { id: nt.id, title: nt.title };
    }
  }

  // May not exist yet (first visit before generation)
  const dbSubtopic = dbByPosition[position] ?? null;

  // Full guide outline with all sections and per-subtopic status (for sidebar nav)
  const allTopics = topicsDb.listTopicsForGuide(found.guide.id);
  const allSubtopics = subtopicsDb.listAllSubtopicsForGuide(found.guide.id);
  const subsByTopicAndPos = {};
  for (const s of allSubtopics) {
    if (!subsByTopicAndPos[s.topicId]) subsByTopicAndPos[s.topicId] = {};
    subsByTopicAndPos[s.topicId][s.position] = s;
  }
  const fullOutline = outline.sections.map((section, i) => {
    const t = allTopics[i];
    const topicSubs = t ? subsByTopicAndPos[t.id] ?? {} : {};
    return {
      topicId: t?.id ?? null,
      title: section.title,
      items: section.items.map((item, pos) => ({
        position: pos,
        title: item.title,
        isCompleted: topicSubs[pos]?.isCompleted ?? false,
        hasContent: topicSubs[pos]?.hasContent ?? false,
        devStatus: topicSubs[pos]?.devStatus ?? 'pending',
      })),
    };
  });

  const guide = guides.findGuideForUser(found.guide.id, req.user.id);
  const totalSubtopics = outline?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
  const completedSubtopics = guide?.completedSubtopicCount ?? 0;
  const subtopicProgressPercentage = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  res.json({
    subtopic: dbSubtopic
      ? dbSubtopic
      : { id: null, position, title: item.title, contentHtml: null, hasContent: false, isCompleted: false, completedAt: null, devStatus: 'pending' },
    item,
    sectionItems,
    prevItem,
    nextItem,
    nextTopic,
    fullOutline,
    topic: { id: found.topic.id, title: found.topic.title, description: found.topic.description, position: found.topic.position },
    guide: { id: found.guide.id, title: found.guide.title, progressPercentage: guide?.progressPercentage ?? 0, subtopicProgressPercentage },
  });
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
