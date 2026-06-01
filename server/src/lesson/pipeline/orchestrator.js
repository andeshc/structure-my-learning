/**
 * generateLesson — top-level orchestrator.
 *
 * Coordinates: resolve → generate → readability gate → review → verdict branch
 * → insertImageMarkers → sanitizeHtml.
 *
 * Two LLM calls (generate, review); all other steps are deterministic.
 * Readability gate is skipped for tiers with fk_max > 12 (only adult_advanced).
 * Generation is capped at MAX_GENERATES total across readability retries and
 * review→regenerate cycles; if the cap is reached, the best available draft is used.
 *
 * Returns { html, usage } where usage aggregates token counts across all LLM calls.
 */

import { loadConfig } from '../config/load.js';
import { resolve } from '../prompts/slots.js';
import { generate } from './generate.js';
import { readabilityGate, stripForReadability } from './readability.js';
import { review } from './review.js';
import { insertImageMarkers } from './insert.js';
import { sanitizeHtml } from './sanitize.js';
import { savePromptFile, slug } from '../prompt-logger.js';

const MAX_GENERATES = 3;
const FK_GATE_THRESHOLD = 12;

function addUsage(a, b) {
  return {
    inputTokens:  (a.inputTokens  ?? 0) + (b.inputTokens  ?? 0),
    outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
  };
}

/**
 * @param {string} topic
 * @param {string} levelId
 * @param {string} coverageId
 * @param {import('../types.js').Illustration[]} [illustrations]
 * @param {{ logDir?: string }} [options]
 * @returns {Promise<{ html: string, usage: { inputTokens: number, outputTokens: number } }>}
 */
export async function generateLesson(topic, levelId, coverageId, illustrations = [], { logDir } = {}) {
  const cfg = loadConfig();
  const slots = resolve(cfg, topic, levelId, coverageId, illustrations);

  let generateCount = 0;
  let totalUsage = { inputTokens: 0, outputTokens: 0 };
  const promptLog = logDir ? [] : null;

  async function doGenerate(extra) {
    generateCount++;
    const { text, usage } = await generate(slots, extra, generateCount === 1 ? promptLog : null);
    totalUsage = addUsage(totalUsage, usage);
    return text;
  }

  // ── 1. initial generate ─────────────────────────────────────────────────────
  let draft = await doGenerate();

  // ── 2. readability gate (skip for tiers with fk_max > 12) ──────────────────
  if (slots.fk_max <= FK_GATE_THRESHOLD) {
    for (let i = 0; i < 2; i++) {
      if (generateCount >= MAX_GENERATES) break;
      const { grade, pass } = readabilityGate(stripForReadability(draft), slots.fk_min, slots.fk_max);
      if (pass) break;
      const note =
        `The previous draft read at grade ${grade.toFixed(1)}; rewrite at grade ${slots.fk_max} or below — shorter sentences, more common words, no new ideas added.`;
      draft = await doGenerate(note);
    }
  }

  // ── 3. review ──────────────────────────────────────────────────────────────
  const { result, usage: reviewUsage } = await review(slots, draft, promptLog);
  totalUsage = addUsage(totalUsage, reviewUsage);

  // ── 4. markers_preserved override ──────────────────────────────────────────
  // If markers were altered, do not salvage the draft or revised_essay — regenerate.
  const markersAltered =
    result.checks?.markers_preserved?.pass === false && result.verdict !== 'regenerate';

  // ── 5. verdict branching ───────────────────────────────────────────────────
  let essay;

  if (markersAltered || result.verdict === 'regenerate') {
    if (generateCount < MAX_GENERATES) {
      const fixes = [
        ...(markersAltered
          ? ['Preserve all [[IMAGE_id]] markers and the ===IMAGES=== trailer exactly as given']
          : []),
        ...(result.priority_fixes ?? []),
      ].join('\n');
      essay = await doGenerate(`AVOID THESE ISSUES:\n${fixes}`);
    } else {
      console.warn('[generateLesson] generation cap reached; using best draft');
      essay = draft;
    }
  } else if (result.verdict === 'revise') {
    essay = result.revised_essay ?? draft;
  } else {
    essay = draft;
  }

  // ── 6. insert images + sanitize ────────────────────────────────────────────
  if (logDir && promptLog?.length) {
    savePromptFile(logDir, `${slug(topic)}.md`, promptLog);
  }

  return {
    html:  sanitizeHtml(insertImageMarkers(essay, slots._imgs), slots.allowed_tags),
    usage: totalUsage,
  };
}
