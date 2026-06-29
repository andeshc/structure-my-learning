const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const subtopicsDb = require('../db/subtopics');
const tutorMessages = require('../db/tutorMessages');
const ai = require('../services/ai.service');
const { estimateCost } = require('../services/cost-rates');
const { getContentModelId } = require('../services/llm');
const asyncHandler = require('../utils/asyncHandler');
const { aiRateLimit } = require('../middleware/rateLimit');
const { transformHtml } = require('../utils/htmlTransformer');

const router = express.Router();

const progressSchema = z.object({
  isCompleted: z.boolean(),
});

const chatSchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(['user', 'assistant', 'system']) }).passthrough()
  ).min(1).max(20),
});

// Resolve the subtopic (creating its row on demand, like the progress route) plus
// the grounding context the tutor needs. Returns either an error descriptor or the
// resolved { found, subtopic, siblingTitles }.
async function resolveSubtopicForUser(req) {
  const position = parseInt(req.params.position, 10);
  if (isNaN(position) || position < 0) {
    return { status: 400, message: 'Invalid subtopic position.' };
  }
  const found = await topicsDb.findTopicForUser(req.params.topicId, req.user.id);
  if (!found) return { status: 404, message: 'Topic not found.' };

  const outline = found.guide.outline;
  const section = outline?.sections?.[found.topic.position - 1];
  const item = section?.items?.[position];
  if (!item) return { status: 404, message: 'Subtopic not found.' };

  const subtopic = await subtopicsDb.findOrCreateSubtopic(req.params.topicId, position, item.title);
  const siblingTitles = (outline?.sections ?? []).flatMap((s) => (s.items ?? []).map((i) => i.title));
  return { found, subtopic, siblingTitles };
}

// Flatten a UIMessage's text parts (or a plain content string) to a trimmed string.
function messageText(msg) {
  if (!msg) return '';
  if (Array.isArray(msg.parts)) {
    return msg.parts.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('').trim();
  }
  return typeof msg.content === 'string' ? msg.content.trim() : '';
}

router.get('/:topicId/subtopics/:position', asyncHandler(async (req, res, next) => {
  const position = parseInt(req.params.position, 10);
  if (isNaN(position) || position < 0) {
    const error = new Error('Invalid subtopic position.');
    error.status = 400;
    return next(error);
  }

  const found = await topicsDb.findTopicForUser(req.params.topicId, req.user.id);
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

  const dbSubtopics = await subtopicsDb.listSubtopicsForTopic(req.params.topicId);
  const dbByPosition = Object.fromEntries(dbSubtopics.map((s) => [s.position, s]));
  const dbSubtopic = dbByPosition[position] ?? null;

  // Per-user progress
  const userProgress = dbSubtopic
    ? await subtopicsDb.getSubtopicProgressForUser(req.user.id, dbSubtopic.id)
    : { isCompleted: false, completedAt: null };

  // Per-user section items
  const allSubtopicsForSection = await subtopicsDb.listAllSubtopicsForGuide(found.guide.id, req.user.id);
  const subtopicsByTopicPos = {};
  for (const s of allSubtopicsForSection) {
    if (!subtopicsByTopicPos[s.topicId]) subtopicsByTopicPos[s.topicId] = {};
    subtopicsByTopicPos[s.topicId][s.position] = s;
  }
  const topicSubs = subtopicsByTopicPos[req.params.topicId] ?? {};

  const sectionItems = (section.items || []).map((si, i) => ({
    position: i,
    title: si.title,
    importance: si.importance,
    isCompleted: topicSubs[i]?.isCompleted ?? false,
    hasContent: dbByPosition[i]?.hasContent ?? false,
    devStatus: dbByPosition[i]?.devStatus ?? 'pending',
  }));

  const prevItem = position > 0 ? { position: position - 1, title: section.items[position - 1].title } : null;
  const nextItem = position < section.items.length - 1
    ? { position: position + 1, title: section.items[position + 1].title }
    : null;

  let nextTopic = null;
  if (!nextItem) {
    const nextSection = outline?.sections?.[sectionIndex + 1];
    if (nextSection) {
      const allTopics = await topicsDb.listTopicsForGuide(found.guide.id);
      const nt = allTopics.find((t) => t.position === found.topic.position + 1);
      if (nt) nextTopic = { id: nt.id, title: nt.title };
    }
  }

  const allTopics = await topicsDb.listTopicsForGuide(found.guide.id);
  const fullOutline = outline.sections.map((sec, i) => {
    const t = allTopics[i];
    const tSubs = t ? subtopicsByTopicPos[t.id] ?? {} : {};
    return {
      topicId: t?.id ?? null,
      title: sec.title,
      items: sec.items.map((si, pos) => ({
        position: pos,
        title: si.title,
        isCompleted: tSubs[pos]?.isCompleted ?? false,
        hasContent: tSubs[pos]?.hasContent ?? false,
        devStatus: tSubs[pos]?.devStatus ?? 'pending',
      })),
    };
  });

  // Progress percentage for this user+guide
  const guide = await guides.findGuideForUser(found.guide.id, req.user.id);
  const totalSubtopics = outline?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
  const completedSubtopics = guide?.completedSubtopicCount ?? 0;
  const subtopicProgressPercentage = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  res.json({
    subtopic: dbSubtopic
      ? { ...dbSubtopic, contentHtml: transformHtml(dbSubtopic.contentHtml), isCompleted: userProgress.isCompleted, completedAt: userProgress.completedAt }
      : { id: null, position, title: item.title, contentHtml: null, hasContent: false, isCompleted: false, completedAt: null, devStatus: 'pending' },
    item,
    sectionItems,
    prevItem,
    nextItem,
    nextTopic,
    fullOutline,
    topic: { id: found.topic.id, title: found.topic.title, description: found.topic.description, position: found.topic.position },
    guide: { id: found.guide.id, title: found.guide.title, subtopicProgressPercentage },
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

  const found = await topicsDb.findTopicForUser(req.params.topicId, req.user.id);
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

  const subtopic = await subtopicsDb.findOrCreateSubtopic(req.params.topicId, position, item.title);
  await subtopicsDb.updateSubtopicProgress(req.user.id, subtopic.id, isCompleted);

  const guide = await guides.findGuideForUser(found.guide.id, req.user.id);
  const totalSubtopics = outline?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
  const completedSubtopics = guide?.completedSubtopicCount ?? 0;
  const subtopicProgressPercentage = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  res.json({
    isCompleted,
    guide: { id: found.guide.id, subtopicProgressPercentage },
  });
}));

// Subtopic-scoped AI Tutor chat: grounded in the lesson on screen + the guide
// outline, with the conversation persisted per (user, subtopic).
router.post('/:topicId/subtopics/:position/chat', aiRateLimit, asyncHandler(async (req, res, next) => {
  const { messages } = chatSchema.parse(req.body);
  const resolved = await resolveSubtopicForUser(req);
  if (resolved.status) {
    const error = new Error(resolved.message);
    error.status = resolved.status;
    return next(error);
  }
  const { found, subtopic, siblingTitles } = resolved;

  // Persist the latest user turn before streaming the reply.
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'user') {
    const text = messageText(lastMessage);
    if (text) {
      await tutorMessages.appendTutorMessage({
        userId: req.user.id, subtopicId: subtopic.id, role: 'user', content: text,
      });
    }
  }

  const result = await ai.chatWithTutor({
    guide: found.guide,
    subtopic,
    siblingTitles,
    messages,
    onFinish: async ({ text, usage }) => {
      try {
        if (text) {
          await tutorMessages.appendTutorMessage({
            userId: req.user.id, subtopicId: subtopic.id, role: 'assistant', content: text,
          });
        }
        // Tutor turns count toward the guide's token/cost totals — but only when
        // the OWNER is chatting. An adopter's tutor usage must not be billed to the
        // creator's guide (adopters reuse content at zero generation cost).
        if (found.guide.userId === req.user.id) {
          const { tokensIn, tokensOut, costUsd } = estimateCost(usage, getContentModelId());
          if (tokensIn || tokensOut) {
            await guides.incrementGuideCost(found.guide.id, tokensIn, tokensOut, costUsd);
          }
        }
      } catch (err) {
        console.error('Failed to persist tutor reply / cost:', err);
      }
    },
  });
  result.pipeUIMessageStreamToResponse(res);
}));

// Load the saved thread as UIMessages so the client can hydrate useChat directly.
router.get('/:topicId/subtopics/:position/chat', asyncHandler(async (req, res, next) => {
  const resolved = await resolveSubtopicForUser(req);
  if (resolved.status) {
    const error = new Error(resolved.message);
    error.status = resolved.status;
    return next(error);
  }
  const rows = await tutorMessages.listTutorMessages(req.user.id, resolved.subtopic.id);
  res.json({
    messages: rows.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text', text: m.content }],
    })),
  });
}));

router.delete('/:topicId/subtopics/:position/chat', asyncHandler(async (req, res, next) => {
  const resolved = await resolveSubtopicForUser(req);
  if (resolved.status) {
    const error = new Error(resolved.message);
    error.status = resolved.status;
    return next(error);
  }
  await tutorMessages.clearTutorMessages(req.user.id, resolved.subtopic.id);
  res.json({ ok: true });
}));

module.exports = router;
