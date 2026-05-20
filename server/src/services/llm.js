const { createOpenAI } = require('@ai-sdk/openai');
const { createAnthropic } = require('@ai-sdk/anthropic');
const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');
const config = require('../config');

console.log(`[llm] provider: ${config.aiProvider}`);

const novita = createOpenAICompatible({
  name: 'novita',
  apiKey: config.novitaApiKey,
  baseURL: 'https://api.novita.ai/openai/v1',
});

const together = createOpenAICompatible({
  name: 'togetherai',
  apiKey: config.togetherApiKey,
  baseURL: 'https://api.together.xyz/v1',
  supportsStructuredOutputs: true,
});

function getGuideModel() {
  if (config.aiProvider === 'claude') {
    return createAnthropic({ apiKey: config.anthropicApiKey, cacheControl: { type: 'ephemeral' } })(config.anthropicGuideModel);
  }
  if (config.aiProvider === 'novita') return novita(config.novitaGuideModel);
  if (config.aiProvider === 'together') return together(config.togetherGuideModel);
  return createOpenAI({ apiKey: config.openaiApiKey })(config.openaiGuideModel);
}

function getContentModel() {
  if (config.aiProvider === 'claude') {
    return createAnthropic({ apiKey: config.anthropicApiKey, cacheControl: { type: 'ephemeral' } })(config.anthropicContentModel);
  }
  if (config.aiProvider === 'novita') return novita(config.novitaContentModel);
  if (config.aiProvider === 'together') return together(config.togetherContentModel);
  return createOpenAI({ apiKey: config.openaiApiKey })(config.openaiContentModel);
}

const providerMaxTokens = {
  novita: config.novitaMaxTokens,
};

function clampTokens(requested) {
  const limit = providerMaxTokens[config.aiProvider];
  return limit ? Math.min(requested, limit) : requested;
}

// Novita doesn't support json_schema responseFormat — use tool-calling mode instead.
function getObjectMode() {
  if (config.aiProvider === 'novita') return 'tool';
  return 'auto';
}

module.exports = { getGuideModel, getContentModel, clampTokens, getObjectMode };
