const { createOpenAI } = require('@ai-sdk/openai');
const { createAnthropic } = require('@ai-sdk/anthropic');
const config = require('../config');

console.log(`[llm] provider: ${config.aiProvider}`);

function getModel() {
  if (config.aiProvider === 'claude') {
    return createAnthropic({ apiKey: config.anthropicApiKey, cacheControl: { type: 'ephemeral' } })(config.anthropicModel);
  }
  return createOpenAI({ apiKey: config.openaiApiKey })(config.openaiModel);
}

module.exports = { getModel };
