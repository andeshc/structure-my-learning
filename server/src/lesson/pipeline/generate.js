import { llm, getModel } from '../llm.js';
import { buildGeneratorSystem, buildGeneratorTask } from '../prompts/builders.js';

/**
 * @param {import('../types.js').Slots} slots
 * @param {string} [extra]
 * @returns {Promise<{ text: string, usage: { inputTokens: number, outputTokens: number } }>}
 */
export async function generate(slots, extra = '') {
  const system = buildGeneratorSystem(slots);
  const task   = buildGeneratorTask(slots, extra);
  return llm(system, task, { model: getModel('generate'), maxTokens: 8192 });
}
