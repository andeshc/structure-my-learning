import { llm, getModel } from '../llm.js';
import { buildGeneratorSystem, buildGeneratorTask } from '../prompts/builders.js';

/**
 * @param {import('../types.js').Slots} slots
 * @param {string} [extra]
 * @param {{ heading: string, content: string }[] | null} [promptLog]
 * @returns {Promise<{ text: string, usage: { inputTokens: number, outputTokens: number } }>}
 */
export async function generate(slots, extra = '', promptLog = null) {
  const system = buildGeneratorSystem(slots);
  const task   = buildGeneratorTask(slots, extra);

  if (promptLog) {
    promptLog.push({ heading: 'Generator System Prompt', content: system });
    promptLog.push({ heading: 'Generator Task Prompt',   content: task   });
  }

  return llm(system, task, { model: getModel('generate'), maxTokens: 8192 });
}
