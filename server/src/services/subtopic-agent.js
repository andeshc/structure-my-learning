const { generateText, tool, jsonSchema, stepCountIs } = require('ai');
const { getContentModel, clampTokens } = require('./llm');
const { learningLevelGuidance, TOPIC_HTML_SYSTEM, generateTopicIllustrationTool } = require('./ai.service');
const { estimateCost } = require('./cost-rates');
const config = require('../config');

function getContentModelId() {
  if (config.aiProvider === 'claude') return config.anthropicContentModel;
  if (config.aiProvider === 'novita') return config.novitaContentModel;
  if (config.aiProvider === 'together') return config.togetherContentModel;
  return config.openaiContentModel;
}

function logPhase(label, usage) {
  const { tokensIn, tokensOut, costUsd } = estimateCost(usage, getContentModelId());
  console.log(`[subtopic-agent-cost] ${label} — in=${tokensIn} out=${tokensOut} $${costUsd.toFixed(4)}`);
}

const verifyContentPlanTool = tool({
  description: 'Review planned claims for a lesson before writing. Returns a per-claim verdict.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      topic: { type: 'string' },
      planned_claims: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 12,
        description: 'Key facts or claims you plan to state in the lesson',
      },
    },
    required: ['topic', 'planned_claims'],
  }),
  execute: async ({ topic, planned_claims }) => {
    const { text } = await generateText({
      model: getContentModel(),
      maxTokens: 500,
      prompt: `You are a subject-matter expert reviewing planned lesson claims on "${topic}".
For each claim, reply on one line: CORRECT | CLARIFY: <note> | WRONG: <correction>

${planned_claims.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
    });
    return { verification: text };
  },
});

function buildBaseContext({ guide, outline, topic, item }) {
  return `Guide: "${guide.title}"
Goal: "${guide.prompt}"
Level: ${guide.learningLevel} — ${learningLevelGuidance[guide.learningLevel]}
Full outline: ${JSON.stringify(outline)}
Parent section: "${topic.title}" — ${topic.description ?? ''}
Subtopic: "${item.title}"${item.overview ? ` — ${item.overview}` : ''}
Importance: ${item.importance}${item.details && item.details.length > 0 ? `\nKey details: ${item.details.join(', ')}` : ''}`;
}

async function runResearchPhase(baseContext, topicTitle) {
  const { steps, usage } = await generateText({
    model: getContentModel(),
    maxTokens: clampTokens(1500),
    stopWhen: stepCountIs(6),
    tools: { verify_content_plan: verifyContentPlanTool },
    system: `You are a lesson research assistant. Your job is to prepare resources before the lesson is written.
Call verify_content_plan with 5–8 key facts or claims you plan to make in this lesson.
After your tool calls, output a brief structured research summary covering the key verified facts and any corrections noted.`,
    prompt: baseContext,
  });

  const toolResults = steps.flatMap((s) => s.toolResults ?? []);
  const verifications = toolResults.filter((r) => r.toolName === 'verify_content_plan');
  // Aggregate across all steps — generateText.usage only returns the final step
  const totalUsage = steps.reduce(
    (acc, s) => ({
      inputTokens: (acc.inputTokens ?? 0) + (s.usage?.inputTokens ?? 0),
      outputTokens: (acc.outputTokens ?? 0) + (s.usage?.outputTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 }
  );
  return {
    notes: verifications.length > 0
      ? `\n\nFact-check notes — apply corrections before writing:\n${verifications.map((r) => r.output.verification).join('\n')}`
      : '',
    usage: totalUsage,
  };
}

async function runDraftPhase(baseContext, researchNotes, illustrationContext) {
  const { text, usage } = await generateText({
    model: getContentModel(),
    maxTokens: clampTokens(4000),
    system: TOPIC_HTML_SYSTEM,
    prompt: `${baseContext}${researchNotes}${illustrationContext}\n\nWrite the complete HTML lesson now.`,
  });
  return { text, usage };
}

async function runQualityCheckPhase(draft, learningLevel, topicTitle) {
  const { text, usage } = await generateText({
    model: getContentModel(),
    maxTokens: clampTokens(600),
    system: `You are a lesson quality reviewer for a ${learningLevel.replace(/_/g, ' ')} learner.
Evaluate the lesson on:
- Factual accuracy (any incorrect or misleading claims)
- Conceptual completeness (key ideas missing)
- Age-appropriate vocabulary and tone
- Engagement (examples, analogies, visual structure)

Output a concise bullet list of specific improvements. Be direct — the writer will act on each point. If the lesson is excellent, say so briefly.`,
    prompt: `Topic: "${topicTitle}"\n\nLesson draft:\n${draft}`,
  });
  return { text, usage };
}

async function runRefinePhase(baseContext, draft, feedback, illustrationContext) {
  const { text, usage } = await generateText({
    model: getContentModel(),
    maxTokens: clampTokens(4500),
    system: TOPIC_HTML_SYSTEM,
    prompt: `${baseContext}${illustrationContext}

Quality review feedback to apply:
${feedback}

Original draft:
${draft}

Apply the improvements from the quality review. Output the complete revised HTML lesson.`,
  });
  return { text, usage };
}

async function generateSubtopicContent({ guide, outline, topic, item }) {
  const baseContext = buildBaseContext({ guide, outline, topic, item });

  // Pre-generate illustrations decided at outline time, in parallel
  const prompts = item.illustrationPrompts?.filter(Boolean) ?? [];
  const illustrationResults = await Promise.all(
    prompts.map(async (prompt, i) => {
      try {
        return await generateTopicIllustrationTool.execute({
          title: `Illustration ${i + 1} for ${item.title}`,
          prompt,
        });
      } catch {
        return null;
      }
    })
  );
  const validIllustrations = illustrationResults.filter((r) => r?.url);
  const illustrationContext = validIllustrations.length > 0
    ? `\n\nPre-generated illustration images — embed each <img> tag at the most relevant point in the lesson. Do not add a caption, heading, or any text around the image:\n${validIllustrations.map((r) => `<img src="${r.url}" alt="${r.title}" class="lesson-illustration">`).join('\n\n')}`
    : '';

  console.log(`[subtopic-agent] phase 1: research — "${item.title}"`);
  const { notes: researchNotes, usage: u1 } = await runResearchPhase(baseContext, item.title);
  logPhase('phase 1 research', u1);

  console.log(`[subtopic-agent] phase 2: draft — "${item.title}"`);
  const { text: draft, usage: u2 } = await runDraftPhase(baseContext, researchNotes, illustrationContext);
  logPhase('phase 2 draft', u2);

  console.log(`[subtopic-agent] phase 3: quality check — "${item.title}"`);
  const { text: feedback, usage: u3 } = await runQualityCheckPhase(draft, guide.learningLevel, item.title);
  logPhase('phase 3 quality', u3);

  console.log(`[subtopic-agent] phase 4: refine — "${item.title}"`);
  const { text: finalHtml, usage: u4 } = await runRefinePhase(baseContext, draft, feedback, illustrationContext);
  logPhase('phase 4 refine', u4);

  const inp = (u) => u?.inputTokens ?? u?.promptTokens ?? 0;
  const out = (u) => u?.outputTokens ?? u?.completionTokens ?? 0;
  const usage = {
    inputTokens: inp(u1) + inp(u2) + inp(u3) + inp(u4),
    outputTokens: out(u1) + out(u2) + out(u3) + out(u4),
  };

  return { html: finalHtml, illustrationUrls: validIllustrations.map((r) => r.url), usage };
}

module.exports = { generateSubtopicContent };
