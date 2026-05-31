const subtopicsDb = require('../db/subtopics');
const guidesDb = require('../db/guides');
const subtopicAgent = require('./subtopic-agent');
const { estimateCost } = require('./cost-rates');
const config = require('../config');

function getContentModelId() {
  if (config.aiProvider === 'claude') return config.anthropicContentModel;
  if (config.aiProvider === 'novita') return config.novitaContentModel;
  if (config.aiProvider === 'together') return config.togetherContentModel;
  return config.openaiContentModel;
}

const BATCH_SIZE = parseInt(process.env.SUBTOPIC_BATCH_SIZE, 10) || 4;
const activeDevelopments = new Set();

async function developSubtopic(id) {
  const claimed = await subtopicsDb.claimSubtopic(id);
  if (!claimed) return; // another instance claimed it first

  const ctx = await subtopicsDb.findSubtopicContext(id);
  if (!ctx || !ctx.item) {
    await subtopicsDb.setDevStatus(id, 'failed');
    return;
  }

  try {
    let { html, illustrationUrls, usage } = await subtopicAgent.generateSubtopicContent({
      guide: ctx.guide,
      outline: ctx.outline,
      topic: ctx.topic,
      item: ctx.item,
    });
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    if (!html) throw new Error('Model returned empty content');
    await subtopicsDb.saveSubtopicContentHtml(id, html);
    if (illustrationUrls.length > 0) await subtopicsDb.saveIllustrationUrls(id, illustrationUrls);
    await subtopicsDb.setDevStatus(id, 'ready');
    const { tokensIn, tokensOut, costUsd } = estimateCost(usage, getContentModelId());
    await guidesDb.incrementGuideCost(ctx.guide.id, tokensIn, tokensOut, costUsd);
    console.log(`[cost] subtopic ${id} — in=${tokensIn} out=${tokensOut} $${costUsd.toFixed(4)}`);
  } catch (err) {
    console.error(`[guide-developer] subtopic ${id} failed:`, err.message);
    await subtopicsDb.setDevStatus(id, 'failed');
  }
}

async function developGuide(guideId) {
  if (activeDevelopments.has(guideId)) return;
  activeDevelopments.add(guideId);
  try {
    while (true) {
      const pending = await subtopicsDb.getPendingSubtopicsForGuide(guideId);
      if (pending.length === 0) break;
      await Promise.all(pending.slice(0, BATCH_SIZE).map((s) => developSubtopic(s.id)));
    }
  } finally {
    activeDevelopments.delete(guideId);
  }
}

module.exports = { developGuide };
