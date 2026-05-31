const RATES = {
  'gpt-4o':                    { input:  2.50, output:  10.00 },
  'gpt-4o-mini':               { input:  0.15, output:   0.60 },
  'claude-sonnet-4-6':         { input:  3.00, output:  15.00 },
  'claude-opus-4-7':           { input: 15.00, output:  75.00 },
  'claude-haiku-4-5':          { input:  0.80, output:   4.00 },
  'claude-haiku-4-5-20251001': { input:  0.80, output:   4.00 },
};

function estimateCost(usage, modelId) {
  const promptTokens = usage?.promptTokens ?? 0;
  const completionTokens = usage?.completionTokens ?? 0;
  const rate = RATES[modelId];
  const costUsd = rate
    ? (promptTokens / 1e6) * rate.input + (completionTokens / 1e6) * rate.output
    : 0;
  return { tokensIn: promptTokens, tokensOut: completionTokens, costUsd };
}

module.exports = { estimateCost };
