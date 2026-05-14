const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

console.log(`[llm] provider: ${config.aiProvider}`);

function openaiClient() {
  if (!config.openaiApiKey) {
    const error = new Error("We couldn't generate your content right now. Please try again in a moment.");
    error.status = 503;
    error.expose = true;
    throw error;
  }
  return new OpenAI({ apiKey: config.openaiApiKey });
}

function anthropicClient() {
  if (!config.anthropicApiKey) {
    const error = new Error("We couldn't generate your content right now. Please try again in a moment.");
    error.status = 503;
    error.expose = true;
    throw error;
  }
  return new Anthropic({ apiKey: config.anthropicApiKey });
}

async function openaiCompleteJson({ systemPrompt, userPrompt }) {
  const response = await openaiClient().chat.completions.create({
    model: config.openaiModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return JSON.parse(response.choices[0].message.content);
}

async function claudeCompleteJson({ systemPrompt, userPrompt }) {
  const response = await anthropicClient().messages.create({
    model: config.anthropicModel,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const text = response.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function completeJson({ systemPrompt, userPrompt }) {
  let lastError;
  const fn = config.aiProvider === 'claude' ? claudeCompleteJson : openaiCompleteJson;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fn({ systemPrompt, userPrompt });
    } catch (error) {
      lastError = error;
      if (error.expose) throw error;
    }
  }

  const error = new Error("We couldn't generate your content right now. Please try again in a moment.");
  error.status = 502;
  error.expose = true;
  error.cause = lastError;
  throw error;
}

async function openaiChatComplete({ systemPrompt, messages, maxTokens }) {
  const response = await openaiClient().chat.completions.create({
    model: config.openaiModel,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  });
  return response.choices[0].message.content;
}

async function claudeChatComplete({ systemPrompt, messages, maxTokens }) {
  const response = await anthropicClient().messages.create({
    model: config.anthropicModel,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text;
}

async function chatComplete({ systemPrompt, messages, maxTokens }) {
  const fn = config.aiProvider === 'claude' ? claudeChatComplete : openaiChatComplete;
  return fn({ systemPrompt, messages, maxTokens });
}

module.exports = { completeJson, chatComplete };
