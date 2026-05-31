/**
 * LLM call 2 — review a draft.
 *
 * Builds the reviewer system + task prompts, calls the LLM requesting JSON,
 * then parses and validates the ReviewResult. Retries once on parse failure.
 * On a second failure returns a synthetic "regenerate" verdict so the
 * orchestrator can recover without crashing.
 *
 * The markers_preserved check (treat as regenerate if false) lives in the
 * orchestrator — review() just returns the raw ReviewResult as parsed.
 */

import { llm, getModel } from '../llm.js';
import { buildReviewerSystem, buildReviewerTask } from '../prompts/builders.js';

const VALID_VERDICTS = new Set(['pass', 'revise', 'regenerate']);

/**
 * Strip ``` json ``` code fences that models sometimes add despite
 * being told not to. With json-prefill in llm() this rarely fires,
 * but it is cheap insurance.
 * @param {string} s
 */
function stripCodeFences(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

/**
 * @param {unknown} parsed
 * @returns {import('../types.js').ReviewResult}
 */
function validateReviewResult(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('response is not an object');
  const p = /** @type {Record<string, unknown>} */ (parsed);
  if (!VALID_VERDICTS.has(/** @type {string} */ (p.verdict))) {
    throw new Error(`invalid verdict: ${p.verdict}`);
  }
  if (!p.checks || typeof p.checks !== 'object') throw new Error('missing checks');
  if (!Array.isArray(p.priority_fixes)) throw new Error('missing priority_fixes');
  return /** @type {import('../types.js').ReviewResult} */ (parsed);
}

/**
 * Fallback when both parse attempts fail.
 * @param {string} reason
 * @returns {import('../types.js').ReviewResult}
 */
function syntheticRegenerate(reason) {
  console.warn(`[review] synthetic regenerate — ${reason}`);
  return {
    verdict: 'regenerate',
    checks: {
      concept_count:     { found: 0, ceiling: 0, pass: false },
      vocabulary:        { pass: false, violations: [] },
      tone_register:     { pass: false },
      scaffolding:       { pass: false },
      coverage_fidelity: { pass: false },
      length:            { found: 0, target: [0, 0], pass: false },
      markers_preserved: { pass: false, note: reason },
      accuracy_flags:    [],
    },
    priority_fixes: [reason],
  };
}

/**
 * @param {import('../types.js').Slots} slots
 * @param {string} draft
 * @returns {Promise<import('../types.js').ReviewResult>}
 */
export async function review(slots, draft) {
  const system   = buildReviewerSystem(slots);
  const baseTask = buildReviewerTask(slots, draft);

  async function attempt(task) {
    const raw = await llm(system, task, { model: getModel('review'), maxTokens: 4096, json: true });
    return validateReviewResult(JSON.parse(stripCodeFences(raw)));
  }

  try {
    return await attempt(baseTask);
  } catch (firstErr) {
    try {
      return await attempt(
        `${baseTask}\n\nReturn ONLY valid JSON matching the schema. No prose, no markdown fences.`,
      );
    } catch (secondErr) {
      return syntheticRegenerate(`JSON invalid after retry: ${secondErr.message}`);
    }
  }
}
