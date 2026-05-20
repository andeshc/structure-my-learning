const { generateText, tool, jsonSchema, stepCountIs } = require('ai');
const { getContentModel, clampTokens } = require('./llm');
const { ageGuidance, TOPIC_HTML_SYSTEM, generateTopicIllustrationTool } = require('./ai.service');

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
Level: ${guide.ageLevel} — ${ageGuidance[guide.ageLevel]}
Full outline: ${JSON.stringify(outline)}
Parent section: "${topic.title}" — ${topic.description ?? ''}
Subtopic: "${item.title}"${item.overview ? ` — ${item.overview}` : ''}
Importance: ${item.importance}${item.details && item.details.length > 0 ? `\nKey details: ${item.details.join(', ')}` : ''}`;
}

async function runResearchPhase(baseContext, topicTitle) {
  const { steps } = await generateText({
    model: getContentModel(),
    maxTokens: clampTokens(1500),
    stopWhen: stepCountIs(6),
    tools: {
      verify_content_plan: verifyContentPlanTool,
      generate_illustration: tool({
        description: generateTopicIllustrationTool.description,
        inputSchema: generateTopicIllustrationTool.inputSchema,
        execute: async (params) => {
          try {
            return await generateTopicIllustrationTool.execute(params);
          } catch {
            return { url: null, title: params.title };
          }
        },
      }),
    },
    system: `You are a lesson research assistant. Your job is to prepare resources before the lesson is written.
1. Call verify_content_plan with 5–8 key facts or claims you plan to make in this lesson.
2. Call generate_illustration for visuals that would genuinely aid understanding (0–2 max). Skip for purely abstract or text-only topics.
After your tool calls, output a brief structured research summary covering the key verified facts and any corrections noted.`,
    prompt: baseContext,
  });

  const toolResults = steps.flatMap((s) => s.toolResults ?? []);
  const illustrations = toolResults.filter((r) => r.toolName === 'generate_illustration' && r.output?.url);
  const verifications = toolResults.filter((r) => r.toolName === 'verify_content_plan');

  const illustrationContext = illustrations.length > 0
    ? `\n\nPre-generated illustration images — embed each <img> tag at the most relevant point in the lesson. Do not add a caption, heading, or any text around the image:\n${illustrations.map((r) => `<img src="${r.output.url}" alt="${r.output.title}" class="lesson-illustration">`).join('\n\n')}`
    : '';

  const researchNotes = verifications.length > 0
    ? `\n\nFact-check notes — apply corrections before writing:\n${verifications.map((r) => r.output.verification).join('\n')}`
    : '';

  return { researchNotes, illustrationContext };
}

async function runDraftPhase(baseContext, researchNotes, illustrationContext) {
  const { text } = await generateText({
    model: getContentModel(),
    maxTokens: clampTokens(4000),
    system: TOPIC_HTML_SYSTEM,
    prompt: `${baseContext}${researchNotes}${illustrationContext}\n\nWrite the complete HTML lesson now.`,
  });
  return text;
}

async function runQualityCheckPhase(draft, ageLevel, topicTitle) {
  const { text } = await generateText({
    model: getContentModel(),
    maxTokens: clampTokens(600),
    system: `You are a lesson quality reviewer for a ${ageLevel.replace(/_/g, ' ')} learner.
Evaluate the lesson on:
- Factual accuracy (any incorrect or misleading claims)
- Conceptual completeness (key ideas missing)
- Age-appropriate vocabulary and tone
- Engagement (examples, analogies, visual structure)

Output a concise bullet list of specific improvements. Be direct — the writer will act on each point. If the lesson is excellent, say so briefly.`,
    prompt: `Topic: "${topicTitle}"\n\nLesson draft:\n${draft}`,
  });
  return text;
}

async function runRefinePhase(baseContext, draft, feedback, illustrationContext) {
  const { text } = await generateText({
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
  return text;
}

async function generateSubtopicContent({ guide, outline, topic, item }) {
  const baseContext = buildBaseContext({ guide, outline, topic, item });

  console.log(`[subtopic-agent] phase 1: research — "${item.title}"`);
  const { researchNotes, illustrationContext } = await runResearchPhase(baseContext, item.title);

  console.log(`[subtopic-agent] phase 2: draft — "${item.title}"`);
  const draft = await runDraftPhase(baseContext, researchNotes, illustrationContext);

  console.log(`[subtopic-agent] phase 3: quality check — "${item.title}"`);
  const feedback = await runQualityCheckPhase(draft, guide.ageLevel, item.title);

  console.log(`[subtopic-agent] phase 4: refine — "${item.title}"`);
  const finalHtml = await runRefinePhase(baseContext, draft, feedback, illustrationContext);

  return finalHtml;
}

module.exports = { generateSubtopicContent };
