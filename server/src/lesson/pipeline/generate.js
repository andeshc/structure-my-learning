/**
 * LLM call 1 — generate a raw draft.
 *
 * Builds the generator system + task prompts from a resolved Slots object,
 * calls the LLM, and returns the raw output including [[IMAGE_*]] markers
 * and the ===IMAGES=== trailer (if images were passed).
 *
 * The readability gate, review, image insertion, and sanitization are all
 * downstream of this function — generateLesson() in the orchestrator
 * coordinates the full pipeline.
 */

import { llm, getModel } from '../llm.js';
import { buildGeneratorSystem, buildGeneratorTask } from '../prompts/builders.js';

/**
 * @param {import('../types.js').Slots} slots
 * @param {string} [extra] - appended to the task prompt verbatim; carries
 *   down-shift notes (readability retries) or priority-fix notes (regenerate)
 * @returns {Promise<string>} raw draft
 */
export async function generate(slots, extra = '') {
  return llm(
    buildGeneratorSystem(slots),
    buildGeneratorTask(slots, extra),
    { model: getModel('generate'), maxTokens: 8192 },
  );
}
