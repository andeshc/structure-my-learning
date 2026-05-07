const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const ai = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');
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
  const outline = await ai.generateOutline(input);
  const guideId = ids.guideId();

  guides.createGuideWithTopics({
    guide: {
      id: guideId,
      userId: req.user.id,
      title: outline.title,
      prompt: input.prompt,
      ageLevel: input.ageLevel,
      outlineJson: JSON.stringify(outline),
    },
    topics: outline.sections.map((section, index) => ({
      id: ids.topicId(),
      guideId,
      position: index + 1,
      title: section.title,
      description: section.description,
    })),
  });

  const guide = guides.findGuideForUser(guideId, req.user.id);
  res.status(201).json({ guide: guideWithTopics(guide) });
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
