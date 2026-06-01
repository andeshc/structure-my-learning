const express = require('express');
const { z } = require('zod');
const guides = require('../db/guides');
const topicsDb = require('../db/topics');
const subtopicsDb = require('../db/subtopics');
const usersDb = require('../db/users');
const ai = require('../services/ai.service');
const guideDeveloper = require('../services/guide-developer');
const { sendGuideReadyEmail } = require('../services/email.service');
const { estimateCost } = require('../services/cost-rates');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');
const ids = require('../utils/ids');

function getGuideModelId() {
  if (config.aiProvider === 'claude') return config.anthropicGuideModel;
  if (config.aiProvider === 'novita') return config.novitaGuideModel;
  if (config.aiProvider === 'together') return config.togetherGuideModel;
  return config.openaiGuideModel;
}

const router = express.Router();

const createGuideSchema = z.object({
  prompt: z.string().trim().min(5).max(500),
  learningLevel: z.enum(['early_learner', 'young_child', 'middle_schooler', 'high_schooler', 'adult_beginner', 'adult_intermediate', 'adult_advanced']),
  coverage: z.enum(['overview', 'balanced', 'comprehensive']),
});

const extendGuideSchema = z.object({
  userPrompt: z.string().trim().min(3).max(300),
});

const finalizeGuideSchema = z.object({
  extraSections: z.array(z.object({
    title: z.string().min(1),
    description: z.string(),
    items: z.array(z.any()).default([]),
  })).max(9).default([]),
});

async function guideWithTopics(guide, userId) {
  const topics = await topicsDb.listTopicsForGuide(guide.id);
  const statuses = await subtopicsDb.listSubtopicStatusesForGuide(guide.id);
  const allProgress = await subtopicsDb.listAllSubtopicsForGuide(guide.id, userId);

  const byTopicPos = {};
  for (const s of statuses) {
    (byTopicPos[s.topicId] ??= {})[s.position] = s;
  }
  const progressByTopicPos = {};
  for (const s of allProgress) {
    (progressByTopicPos[s.topicId] ??= {})[s.position] = s;
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
        isCompleted: progressByTopicPos[topicId]?.[pos]?.isCompleted ?? false,
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

async function generateOutlineInBackground({ guideId, prompt, learningLevel, coverage }) {
  try {
    const result = ai.streamOutline({ prompt, learningLevel, coverage, guideId });
    let lastSavedCount = 0;

    for await (const partial of result.partialObjectStream) {
      const count = partial?.sections?.length ?? 0;
      if (count > lastSavedCount) {
        lastSavedCount = count;
        await guides.updatePartialOutline(guideId, JSON.stringify(partial));
      }
    }

    const [outline, outlineUsage] = await Promise.all([result.object, result.usage]);
    try {
      const { tokensIn, tokensOut, costUsd } = estimateCost(outlineUsage, getGuideModelId());
      await guides.incrementGuideCost(guideId, tokensIn, tokensOut, costUsd);
      console.log(`[cost] outline ${guideId} — in=${tokensIn} out=${tokensOut} $${costUsd.toFixed(4)}`);
    } catch (err) {
      console.warn('[cost] failed to record outline cost:', err.message);
    }
    const topicObjects = outline.sections.map((section, index) => ({
      id: ids.topicId(),
      guideId,
      position: index + 1,
      title: section.title,
      description: section.description,
    }));

    await guides.completeGuide({
      id: guideId,
      title: outline.title,
      outlineJson: JSON.stringify(outline),
      illustrationPath: null,
      topics: topicObjects,
    });

    const topicsByPosition = {};
    topicObjects.forEach((t) => { topicsByPosition[t.position] = t.id; });
    await subtopicsDb.initSubtopicsForGuide(outline.sections, topicsByPosition);

    ai.generateGuideIllustration({ guideId, outline, prompt })
      .then((path) => guides.setGuideIllustration(guideId, path))
      .catch((err) => { if (config.nodeEnv !== 'test') console.error('Illustration failed:', err.message); });

  } catch (err) {
    if (config.nodeEnv !== 'test') console.error('[outline-background]', err.message);
    await guides.markGuideFailed(guideId);
  }
}

router.get('/', asyncHandler(async (req, res) => {
  res.json({ guides: await guides.listGuidesForUser(req.user.id) });
}));

router.post('/', asyncHandler(async (req, res, next) => {
  // SUSPENDED: guide creation cap temporarily disabled
  // const count = await guides.getGuidesCreatedCount(req.user.id);
  // if (count >= 3) {
  //   const err = new Error('Guide limit reached. Upgrade to create more guides.');
  //   err.status = 403;
  //   return next(err);
  // }
  const input = createGuideSchema.parse(req.body);
  const guideId = ids.guideId();
  await guides.createPendingGuide({ id: guideId, userId: req.user.id, prompt: input.prompt, learningLevel: input.learningLevel, coverage: input.coverage });
  await guides.incrementGuidesCreatedCount(req.user.id);
  await guides.setNeedsReview(guideId, true);
  generateOutlineInBackground({ guideId, prompt: input.prompt, learningLevel: input.learningLevel, coverage: input.coverage });
  res.json({ guideId });
}));

router.get('/:guideId/outline-status', asyncHandler(async (req, res, next) => {
  const guide = await guides.findGuideForUser(req.params.guideId, req.user.id);
  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    return next(error);
  }
  res.json({ status: guide.status, outline: guide.outline });
}));

router.get('/:guideId', asyncHandler(async (req, res, next) => {
  const guide = await guides.findGuideForUser(req.params.guideId, req.user.id);

  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    next(error);
    return;
  }

  const enriched = await guideWithTopics(guide, req.user.id);
  const adoptionCount = enriched.isAdopted ? null : await guides.getAdoptionCount(req.params.guideId);
  res.json({ guide: { ...enriched, adoptionCount } });
}));

router.post('/:guideId/develop', asyncHandler(async (req, res, next) => {
  const guide = await guides.findOwnedGuideForUser(req.params.guideId, req.user.id);
  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    return next(error);
  }

  await subtopicsDb.resetFailedSubtopicsForGuide(req.params.guideId);
  guideDeveloper.developGuide(req.params.guideId).catch((err) => {
    if (config.nodeEnv !== 'test') console.error('[guide-developer]', err.message);
  });

  res.json({ guide: await guideWithTopics(guide, req.user.id) });
}));

router.post('/:guideId/extend', asyncHandler(async (req, res, next) => {
  const { guideId } = req.params;
  const input = extendGuideSchema.parse(req.body);

  const guide = await guides.findOwnedGuideForUser(guideId, req.user.id);
  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    return next(error);
  }

  const sections = await ai.generateAdditionalSections({
    guideTitle: guide.title,
    existingSections: guide.outline?.sections ?? [],
    userPrompt: input.userPrompt,
    learningLevel: guide.learningLevel,
    coverage: guide.coverage,
  });

  res.json({ sections });
}));

router.post('/:guideId/finalize', asyncHandler(async (req, res, next) => {
  const { guideId } = req.params;
  const input = finalizeGuideSchema.parse(req.body);

  const guide = await guides.findOwnedGuideForUser(guideId, req.user.id);
  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    return next(error);
  }

  if (input.extraSections.length > 0) {
    const existingTopics = await topicsDb.listTopicsForGuide(guideId);
    const startPosition = existingTopics.length + 1;

    const newTopicObjects = input.extraSections.map((section, index) => ({
      id: ids.topicId(),
      guideId,
      position: startPosition + index,
      title: section.title,
      description: section.description,
    }));

    const updatedOutline = {
      ...(guide.outline ?? {}),
      sections: [...(guide.outline?.sections ?? []), ...input.extraSections],
    };

    await guides.appendSectionsToGuide({
      id: guideId,
      outlineJson: JSON.stringify(updatedOutline),
      topics: newTopicObjects,
    });

    const topicsByPosition = {};
    newTopicObjects.forEach((t, index) => { topicsByPosition[index + 1] = t.id; });
    await subtopicsDb.initSubtopicsForGuide(input.extraSections, topicsByPosition);
  }

  await guides.setNeedsReview(guideId, false);

  const { id: userId } = req.user;
  const guideTitle = guide.outline?.title || guide.title;
  const guideSections = guide.outline?.sections || [];

  guideDeveloper.developGuide(guideId)
    .then(() => {
      console.log(`[guide-ready-email] Development complete for guide ${guideId}, sending email`);
      return usersDb.findUserById(userId);
    })
    .then((user) => {
      if (!user) {
        console.warn(`[guide-ready-email] User ${userId} not found — skipping email`);
        return;
      }
      console.log(`[guide-ready-email] Sending to ${user.email}`);
      return sendGuideReadyEmail({
        email: user.email,
        name: user.name,
        guideTitle,
        guideUrl: `${config.appUrl}/guides/${guideId}`,
        sections: guideSections,
      });
    })
    .then(() => { console.log(`[guide-ready-email] Done for guide ${guideId}`); })
    .catch((err) => { console.error(`[guide-ready-email] Failed for guide ${guideId}:`, err.message); });

  const completedGuide = await guides.findGuideForUser(guideId, req.user.id);
  res.json({ guide: await guideWithTopics(completedGuide, req.user.id) });
}));

router.post('/:guideId/share', asyncHandler(async (req, res, next) => {
  const guide = await guides.findGuideForUser(req.params.guideId, req.user.id);
  if (!guide) {
    const error = new Error('Guide not found.');
    error.status = 404;
    return next(error);
  }
  // Adopted guides already have the original share token; owned guides may need one generated
  const token = guide.shareToken || await guides.enableSharing(req.params.guideId, req.user.id);
  if (!token) {
    const error = new Error('Could not generate share link.');
    error.status = 500;
    return next(error);
  }
  res.json({ shareUrl: `${config.appUrl}/share/${token}` });
}));

router.patch('/:guideId/sharing', asyncHandler(async (req, res, next) => {
  const isPublic = Boolean(req.body.public);
  const result = await guides.setGuidePublic(req.params.guideId, req.user.id, isPublic);
  if (!result) {
    const err = new Error('Guide not found.');
    err.status = 404;
    return next(err);
  }
  const shareUrl = result.shareToken ? `${config.appUrl}/share/${result.shareToken}` : null;
  res.json({ isPublic: result.isPublic, shareToken: result.shareToken, shareUrl });
}));

router.delete('/:guideId', asyncHandler(async (req, res, next) => {
  const owned = await guides.findOwnedGuideForUser(req.params.guideId, req.user.id);
  if (owned) {
    const adoptionCount = await guides.getAdoptionCount(req.params.guideId);
    if (adoptionCount > 0) {
      await guides.tombstoneGuide(req.params.guideId, req.user.id);
    } else {
      await guides.deleteGuideForUser(req.params.guideId, req.user.id);
    }
  } else {
    const removed = await guides.removeAdoption(req.user.id, req.params.guideId);
    if (!removed) {
      const error = new Error('Guide not found.');
      error.status = 404;
      return next(error);
    }
    await guides.cleanupTombstonedGuide(req.params.guideId);
  }

  res.json({ ok: true });
}));

module.exports = router;
