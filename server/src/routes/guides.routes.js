const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const subtopicsDb = require('../db/subtopics');
const ai = require('../services/ai.service');
const guideDeveloper = require('../services/guide-developer');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');
const ids = require('../utils/ids');

const router = express.Router();

const createGuideSchema = z.object({
  prompt: z.string().trim().min(5).max(500),
  ageLevel: z.enum(['ages_8_10', 'ages_11_13', 'ages_14_17', 'adult_beginner', 'adult_advanced']),
});

function guideWithTopics(guide) {
  const topics = topicsDb.listTopicsForGuide(guide.id);
  const statuses = subtopicsDb.listSubtopicStatusesForGuide(guide.id);

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
      })),
    };
  });

  const isBeingDeveloped = statuses.some((s) => s.devStatus === 'pending' || s.devStatus === 'developing');

  return {
    ...guide,
    outline: { ...outline, sections: enrichedSections },
    topics,
    isBeingDeveloped,
  };
}

router.get('/', (req, res) => {
  res.json({ guides: guides.listGuidesForUser(req.user.id) });
});

router.post('/', asyncHandler(async (req, res) => {
  const input = createGuideSchema.parse(req.body);
  const guideId = ids.guideId();
  guides.createPendingGuide({ id: guideId, userId: req.user.id, prompt: input.prompt, ageLevel: input.ageLevel });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const result = ai.streamOutline({ prompt: input.prompt, ageLevel: input.ageLevel });

    for await (const partial of result.partialObjectStream) {
      if (aborted) break;
      res.write(JSON.stringify({ type: 'partial', outline: partial }) + '\n');
    }

    if (aborted) { guides.markGuideFailed(guideId); return; }

    const outline = await result.object;

    const topicObjects = outline.sections.map((section, index) => ({
      id: ids.topicId(),
      guideId,
      position: index + 1,
      title: section.title,
      description: section.description,
    }));

    guides.completeGuide({
      id: guideId,
      title: outline.title,
      outlineJson: JSON.stringify(outline),
      illustrationPath: null,
      topics: topicObjects,
    });

    const topicsByPosition = {};
    topicObjects.forEach((t) => { topicsByPosition[t.position] = t.id; });
    subtopicsDb.initSubtopicsForGuide(outline.sections, topicsByPosition);
    guideDeveloper.developGuide(guideId).catch((err) => {
      if (config.nodeEnv !== 'test') console.error('[guide-developer]', err.message);
    });

    ai.generateGuideIllustration({ guideId, outline, prompt: input.prompt })
      .then((path) => guides.setGuideIllustration(guideId, path))
      .catch((err) => { if (config.nodeEnv !== 'test') console.error('Illustration failed:', err.message); });

    const completedGuide = guides.findGuideForUser(guideId, req.user.id);
    res.write(JSON.stringify({ type: 'done', guide: guideWithTopics(completedGuide) }) + '\n');
    res.end();
  } catch (err) {
    if (!aborted) guides.markGuideFailed(guideId);
    if (!res.writableEnded) {
      res.write(JSON.stringify({ type: 'error', message: 'Guide generation failed.' }) + '\n');
      res.end();
    }
  }
}));

router.get('/:guideId', (req, res, next) => {
  const guide = guides.findGuideForUser(req.params.guideId, req.user.id);

  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    next(error);
    return;
  }

  res.json({ guide: guideWithTopics(guide) });
});

router.post('/:guideId/develop', asyncHandler(async (req, res, next) => {
  const guide = guides.findGuideForUser(req.params.guideId, req.user.id);
  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    return next(error);
  }

  subtopicsDb.resetFailedSubtopicsForGuide(req.params.guideId);
  guideDeveloper.developGuide(req.params.guideId).catch((err) => {
    if (config.nodeEnv !== 'test') console.error('[guide-developer]', err.message);
  });

  res.json({ guide: guideWithTopics(guide) });
}));

router.delete('/:guideId', (req, res, next) => {
  const result = guides.deleteGuideForUser(req.params.guideId, req.user.id);

  if (result.changes === 0) {
    const error = new Error('Guide not found.');
    error.status = 404;
    next(error);
    return;
  }

  res.json({ ok: true });
});

module.exports = router;
