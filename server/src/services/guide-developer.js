const subtopicsDb = require('../db/subtopics');
const subtopicAgent = require('./subtopic-agent');

const BATCH_SIZE = 4;
const activeDevelopments = new Set();

async function developSubtopic(id) {
  const claimed = subtopicsDb.claimSubtopic(id);
  if (!claimed) return; // another instance claimed it first

  const ctx = subtopicsDb.findSubtopicContext(id);
  if (!ctx || !ctx.item) {
    subtopicsDb.setDevStatus(id, 'failed');
    return;
  }

  try {
    let { html, illustrationUrls } = await subtopicAgent.generateSubtopicContent({
      guide: ctx.guide,
      outline: ctx.outline,
      topic: ctx.topic,
      item: ctx.item,
    });
    // Strip markdown code fences if the model wrapped the HTML (e.g. ```html ... ```)
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    if (!html) throw new Error('Model returned empty content');
    subtopicsDb.saveSubtopicContentHtml(id, html);
    if (illustrationUrls.length > 0) subtopicsDb.saveIllustrationUrls(id, illustrationUrls);
    subtopicsDb.setDevStatus(id, 'ready');
  } catch (err) {
    console.error(`[guide-developer] subtopic ${id} failed:`, err.message);
    subtopicsDb.setDevStatus(id, 'failed');
  }
}

async function developGuide(guideId) {
  if (activeDevelopments.has(guideId)) return;
  activeDevelopments.add(guideId);
  try {
    while (true) {
      const pending = subtopicsDb.getPendingSubtopicsForGuide(guideId);
      if (pending.length === 0) break;
      await Promise.all(pending.slice(0, BATCH_SIZE).map((s) => developSubtopic(s.id)));
    }
  } finally {
    activeDevelopments.delete(guideId);
  }
}

module.exports = { developGuide };
