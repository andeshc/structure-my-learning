/**
 * LLM adapter for the lesson generation pipeline.
 * Supports Anthropic and OpenAI; select via AI_PROVIDER env var (default: anthropic).
 *
 * Callers use generate() and review() from pipeline/; they should not call llm() directly.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export const MODELS = {
  anthropic: {
    generate: 'claude-opus-4-7',
    review:   'claude-sonnet-4-6',
  },
  openai: {
    generate: 'gpt-4o',
    review:   'gpt-4o-mini',
  },
};

const DEFAULT_MAX_TOKENS = 4096;

export function getProvider() {
  const p = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  if (p !== 'anthropic' && p !== 'openai') throw new Error(`Unknown AI_PROVIDER: ${p}`);
  return p;
}

export function getModel(role) {
  return MODELS[getProvider()][role];
}

let _anthropic = null;
function getAnthropicClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

let _openai = null;
function getOpenAIClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

async function callAnthropic(system, user, { model, maxTokens, json }) {
  const messages = [{ role: 'user', content: user }];
  if (json) messages.push({ role: 'assistant', content: '{' });
  const response = await getAnthropicClient().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });
  const text = response.content[0].text;
  return json ? `{${text}` : text;
}

async function callOpenAI(system, user, { model, maxTokens, json }) {
  const request = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (json) request.response_format = { type: 'json_object' };
  const response = await getOpenAIClient().chat.completions.create(request);
  return response.choices[0].message.content;
}

/**
 * @param {string} system
 * @param {string} user
 * @param {{ model?: string, maxTokens?: number, json?: boolean }} [opts]
 * @returns {Promise<string>}
 */
export async function llm(system, user, opts = {}) {
  const {
    model = getModel('generate'),
    maxTokens = DEFAULT_MAX_TOKENS,
    json = false,
  } = opts;

  const provider = getProvider();
  return provider === 'openai'
    ? callOpenAI(system, user, { model, maxTokens, json })
    : callAnthropic(system, user, { model, maxTokens, json });
}
