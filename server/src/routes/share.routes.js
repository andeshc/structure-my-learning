const express = require('express');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const subtopicsDb = require('../db/subtopics');
const shareDb = require('../db/share');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function guideWithTopics(guide) {
  const topics = await topicsDb.listTopicsForGuide(guide.id);
  const statuses = await subtopicsDb.listSubtopicStatusesForGuide(guide.id);

  const byTopicPos = {};
  for (const s of statuses) {
    (byTopicPos[s.topicId] ??= {})[s.position] = s;
  }

  const outline = guide.outline || {
    title: guide.title,
    sections: topics.map((t) => ({ title: t.title, description: t.description, items: [] })),
  };

  const enrichedSections = outline.sections.map((section, si) => {
    const topicId = topics[si]?.id;
    return {
      ...section,
      items: (section.items || []).map((item, pos) => ({
        ...item,
        devStatus: byTopicPos[topicId]?.[pos]?.devStatus ?? 'pending',
        hasContent: byTopicPos[topicId]?.[pos]?.hasContent ?? false,
        illustrationUrls: byTopicPos[topicId]?.[pos]?.illustrationUrls ?? [],
        subtopicId: byTopicPos[topicId]?.[pos]?.subtopicId ?? null,
      })),
    };
  });

  return {
    ...guide,
    outline: { ...outline, sections: enrichedSections },
    topics,
  };
}

// Public — metadata only (for OG tags and unauthenticated preview)
router.get('/:token', asyncHandler(async (req, res, next) => {
  const guide = await guides.findGuideByShareToken(req.params.token);
  if (!guide) {
    const err = new Error('Shared guide not found.');
    err.status = 404;
    return next(err);
  }
  res.json({
    title: guide.title,
    illustrationUrl: guide.illustrationUrl,
    topicCount: guide.topicCount,
    ownerName: guide.ownerName,
  });
}));

// Authenticated — full guide data for the shared view
router.get('/:token/guide', requireAuth, asyncHandler(async (req, res, next) => {
  const guide = await guides.findGuideByShareToken(req.params.token);
  if (!guide) {
    const err = new Error('Shared guide not found.');
    err.status = 404;
    return next(err);
  }

  const existingAdoption = await shareDb.getExistingAdoption(req.user.id, guide.id);
  if (existingAdoption) {
    return res.json({ alreadyAdopted: true, guideId: guide.id });
  }

  if (guide.userId === null) {
    const err = new Error('This guide is no longer available.');
    err.status = 410;
    return next(err);
  }

  const viewedCount = await shareDb.getViewCount(req.user.id, req.params.token);
  const enriched = await guideWithTopics(guide);

  res.json({ guide: enriched, viewedCount, alreadyAdopted: false });
}));

// Authenticated — full subtopic page data (gate enforced by position)
router.get('/:token/topics/:topicId/subtopics/:position', requireAuth, asyncHandler(async (req, res, next) => {
  const position = parseInt(req.params.position, 10);
  if (isNaN(position) || position < 0) {
    const err = new Error('Invalid subtopic position.'); err.status = 400; return next(err);
  }

  const guide = await guides.findGuideByShareToken(req.params.token);
  if (!guide) {
    const err = new Error('Shared guide not found.'); err.status = 404; return next(err);
  }

  const allTopics = await topicsDb.listTopicsForGuide(guide.id);
  const topic = allTopics.find((t) => t.id === req.params.topicId);
  if (!topic) {
    const err = new Error('Topic not found.'); err.status = 404; return next(err);
  }

  const outline = guide.outline;
  const sectionIndex = topic.position - 1;
  const section = outline?.sections?.[sectionIndex];
  const item = section?.items?.[position];
  if (!item) {
    const err = new Error('Subtopic not found.'); err.status = 404; return next(err);
  }

  const dbSubtopics = await subtopicsDb.listSubtopicsForTopic(req.params.topicId);
  const dbByPosition = Object.fromEntries(dbSubtopics.map((s) => [s.position, s]));
  const dbSubtopic = dbByPosition[position] ?? null;

  // Gate: only applies when there's real content to show
  if (dbSubtopic?.hasContent) {
    const alreadySeen = await shareDb.hasViewedSubtopic(req.user.id, req.params.token, dbSubtopic.id);
    if (!alreadySeen) {
      const currentCount = await shareDb.getViewCount(req.user.id, req.params.token);
      if (currentCount >= 2) {
        return res.json({ gated: true, viewedCount: currentCount });
      }
      await shareDb.recordView(req.user.id, req.params.token, dbSubtopic.id);
    }
  }

  const viewedCount = await shareDb.getViewCount(req.user.id, req.params.token);

  const sectionItems = (section.items || []).map((si, i) => ({
    position: i,
    title: si.title,
    importance: si.importance,
    isCompleted: false,
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
      const nt = allTopics.find((t) => t.position === topic.position + 1);
      if (nt) nextTopic = { id: nt.id, title: nt.title };
    }
  }

  const allSubtopics = await subtopicsDb.listAllSubtopicsForGuide(guide.id);
  const subsByTopicAndPos = {};
  for (const s of allSubtopics) {
    if (!subsByTopicAndPos[s.topicId]) subsByTopicAndPos[s.topicId] = {};
    subsByTopicAndPos[s.topicId][s.position] = s;
  }
  const fullOutline = outline.sections.map((sec, i) => {
    const t = allTopics[i];
    const topicSubs = t ? subsByTopicAndPos[t.id] ?? {} : {};
    return {
      topicId: t?.id ?? null,
      title: sec.title,
      items: sec.items.map((si, pos) => ({
        position: pos,
        title: si.title,
        isCompleted: false,
        hasContent: topicSubs[pos]?.hasContent ?? false,
        devStatus: topicSubs[pos]?.devStatus ?? 'pending',
      })),
    };
  });

  res.json({
    gated: false,
    viewedCount,
    subtopic: dbSubtopic
      ? { ...dbSubtopic, isCompleted: false }
      : { id: null, position, title: item.title, contentHtml: null, hasContent: false, isCompleted: false, completedAt: null, devStatus: 'pending' },
    item,
    sectionItems,
    prevItem,
    nextItem,
    nextTopic,
    fullOutline,
    topic: { id: topic.id, title: topic.title, description: topic.description, position: topic.position },
    guide: { id: guide.id, title: guide.title, ownerName: guide.ownerName },
  });
}));

// Authenticated — adopt guide into the viewer's library (lightweight — no copy)
router.post('/:token/adopt', requireAuth, asyncHandler(async (req, res, next) => {
  const guide = await guides.findGuideByShareToken(req.params.token);
  if (!guide) {
    const err = new Error('Shared guide not found.');
    err.status = 404;
    return next(err);
  }

  // Idempotent — already adopted
  const existingAdoption = await shareDb.getExistingAdoption(req.user.id, guide.id);
  if (existingAdoption) {
    return res.json({ guideId: guide.id });
  }

  if (guide.userId === null) {
    const err = new Error('This guide is no longer available.');
    err.status = 410;
    return next(err);
  }

  await shareDb.recordAdoption(req.user.id, guide.id, req.params.token);

  res.json({ guideId: guide.id });
}));

module.exports = router;
