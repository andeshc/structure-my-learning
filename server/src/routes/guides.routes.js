const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const ai = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');
const ids = require('../utils/ids');

const router = express.Router();

const createGuideSchema = z.object({
  prompt: z.string().trim().min(5).max(500),
  ageLevel: z.enum(['ages_8_10', 'ages_11_13', 'ages_14_17', 'adult_beginner', 'adult_advanced']),
});

function guideWithTopics(guide) {
  return {
    ...guide,
    outline: guide.outline || {
      title: guide.title,
      sections: topicsDb.listTopicsForGuide(guide.id).map((topic) => ({
        title: topic.title,
        description: topic.description,
        items: [],
      })),
    },
    topics: topicsDb.listTopicsForGuide(guide.id),
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

    guides.completeGuide({
      id: guideId,
      title: outline.title,
      outlineJson: JSON.stringify(outline),
      illustrationPath: null,
      topics: outline.sections.map((section, index) => ({
        id: ids.topicId(),
        guideId,
        position: index + 1,
        title: section.title,
        description: section.description,
      })),
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
