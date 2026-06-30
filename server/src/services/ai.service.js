const { generateObject, generateText, jsonSchema, streamObject, streamText, convertToModelMessages, tool, stepCountIs } = require('ai');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const config = require('../config');
const { getGuideModel, getContentModel, clampTokens, getObjectMode } = require('./llm');
const imageService = require('./image.service');
const contentConfig = require('../config/content-config.json');

const guidePromptTemplate = fs.readFileSync(
  path.join(__dirname, '../prompts/guide-generation-prompt.md'),
  'utf8'
);

const clarifyingQuestionsPromptTemplate = fs.readFileSync(
  path.join(__dirname, '../prompts/clarifying-questions-prompt.md'),
  'utf8'
);

const guideThumbnailPromptTemplate = fs.readFileSync(
  path.join(__dirname, '../prompts/guide-thumbnail-prompt.md'),
  'utf8'
);

function parsePromptSections(markdown) {
  const sections = {};
  const lines = markdown.split('\n');
  let currentKey = null;
  let buffer = [];

  for (const line of lines) {
    const heading = line.match(/^## (.+)/);
    if (heading) {
      if (currentKey) sections[currentKey] = buffer.join('\n').trim();
      currentKey = heading[1].trim();
      buffer = [];
    } else if (currentKey) {
      buffer.push(line);
    }
  }
  if (currentKey) sections[currentKey] = buffer.join('\n').trim();
  return sections;
}

const guidePromptSections = parsePromptSections(guidePromptTemplate);
const clarifyingQuestionsPromptSections = parsePromptSections(clarifyingQuestionsPromptTemplate);
const guideThumbnailPromptSections = parsePromptSections(guideThumbnailPromptTemplate);

const learningLevelGuidance = {
  early_learner:      'Very young child (ages 3–5); use the simplest words, one idea at a time, no assumed background.',
  young_child:        'Child (ages 6–10); simple vocabulary, concrete examples, gentle pacing, no assumed background knowledge.',
  middle_schooler:    'Middle-grade learner (ages 11–13); clear vocabulary, light technical terms with definitions, relatable examples.',
  high_schooler:      'Teen learner (ages 14–18); stronger conceptual depth, school-level terminology, real-world applications.',
  adult_beginner:     'Adult learner new to the subject; respectful tone, practical examples, no childish framing.',
  adult_intermediate: 'Adult with some familiarity; can handle moderate terminology, appreciates nuance and real-world application.',
  adult_advanced:     'Adult or professional learner; deeper explanations, precise terminology, efficient pacing, minimal hand-holding.',
};

const coverageGuidance = {
  overview:      'Overview — high-level survey, key concepts only, no deep dives. Prioritise breadth; keep each topic concise.',
  balanced:      'Balanced — cover core concepts with solid depth. Include important subtopics but stay focused; avoid tangents.',
  comprehensive: 'Comprehensive — go deep on every topic. Include edge cases, nuances, and related concepts; maximise breadth and depth.',
};

const ILLUSTRATION_POSTURE_INSTRUCTION = {
  leading:      'Generate illustration prompts for most subtopics — illustrations lead the lesson for this audience. Describe warm, concrete, friendly scenes directly related to the concept. Avoid anything abstract or symbolic.',
  integrated:   'Generate illustration prompts where a diagram, chart, or concrete scene would meaningfully aid comprehension. Set to null for purely text-based topics.',
  supportive:   'Generate illustration prompts only when a diagram or chart clearly adds value beyond the text. Most subtopics can be null.',
  sparing:      'Generate illustration prompts only for processes, step-by-step comparisons, or system overviews. Set to null for most subtopics — text is usually sufficient for this audience.',
  diagram_only: 'Generate illustration prompts only for subtopics that genuinely require a technical diagram or chart (no decorative images). Describe clean, labelled technical diagrams. Most subtopics should be null.',
};

/**
 * Build a rich learner-profile block for use in prompts, derived from content-config.json.
 * Replaces the old one-liner learningLevelGuidance[levelId] strings.
 */
function buildLearnerProfileBlock(levelId, coverageId) {
  const level  = contentConfig.levels[levelId];
  const policy = contentConfig.image_policy[levelId];
  if (!level || !policy) return `Level: ${levelId}\nCoverage: ${coverageId}`;

  const posture = policy.posture;
  const postureExplanation = contentConfig.posture_explanation[posture] ?? '';
  const captionGuidance    = contentConfig.caption_guidance[levelId]    ?? '';
  const maxImages          = policy.max_images;
  const illustrationNote   = ILLUSTRATION_POSTURE_INSTRUCTION[posture] ?? ILLUSTRATION_POSTURE_INSTRUCTION.integrated;

  return `Learner profile:
- Level: ${level.label}
- Audience mindset: ${level.audience_mindset}
- Vocabulary: ${level.vocabulary}
- Tone: ${level.tone}
- Abstraction: ${level.abstraction}
- Analogies: ${level.analogy_density}
- Avoid: ${level.avoid.join('; ')}
- Coverage: ${coverageId} — ${coverageGuidance[coverageId]}

Illustration guidance for this audience:
- Image posture: ${posture} — ${postureExplanation}
- Max illustration prompts per subtopic: ${maxImages}
- Caption style: ${captionGuidance}
- Rule: ${illustrationNote}`;
}

const maxSubtopics = {
  early_learner:      { overview: 8,  balanced: 12, comprehensive: 18 },
  young_child:        { overview: 10, balanced: 18, comprehensive: 28 },
  middle_schooler:    { overview: 15, balanced: 28, comprehensive: 42 },
  high_schooler:      { overview: 20, balanced: 36, comprehensive: 52 },
  adult_beginner:     { overview: 20, balanced: Infinity, comprehensive: Infinity },
  adult_intermediate: { overview: 25, balanced: Infinity, comprehensive: Infinity },
  adult_advanced:     { overview: 30, balanced: Infinity, comprehensive: Infinity },
};

const outlineItemSchema = z.object({
  importance: z.enum(['Required', 'Optional but recommended', 'Optional and can be skipped']),
  title: z.string().min(2).max(140),
  overview: z.string().min(10).max(400).nullable(),
  details: z.array(z.string().min(2).max(300)).max(12).nullable(),
  illustrationPrompts: z.array(z.string().min(20)).max(2).nullable(),
  contentType: z.enum(['conceptual', 'coding', 'mathematical', 'procedural']),
  codeLanguage: z.string().min(1).max(30).nullable(),
});

const outlineSectionSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(280),
  items: z.array(outlineItemSchema).min(1).max(30),
});

// Paper-cut guide-card thumbnail spec. The LLM derives one bold visual metaphor plus a
// palette id; values come from content-config.json so nothing is hardcoded here.
const thumbnailPaletteIds = contentConfig.guide_thumbnail.palette.map((p) => p.id);

const thumbnailSpecSchema = z.object({
  metaphor: z.string().min(10).max(280),
  paletteId: z.enum(thumbnailPaletteIds),
});

// Shared between the outline system prompt (so new guides emit `thumbnail` in the same
// call) and the standalone deriveGuideThumbnailSpec used by backfill — kept in one place
// so the two paths can't drift.
function thumbnailSpecInstruction() {
  const ids = thumbnailPaletteIds.join(', ');
  const max = contentConfig.guide_thumbnail.max_elements;
  return `Thumbnail cover spec (field "thumbnail"): design a concrete, instantly recognizable cover image for a flat-vector course-card thumbnail.
- "metaphor": describe a small, literal scene of a few related objects that a viewer would instantly recognize as THIS guide's topic — NOT an abstract symbol or a single clever glyph. Use up to ${max} simple shapes. Be specific to the subject; avoid generic education clichés (lightbulb, stack of books, graduation cap, plain gears) and avoid lazy category stand-ins (a plain padlock for anything security, a leaf for anything nature). No text, no labelled diagrams.
- "paletteId": pick the palette whose mood best fits the subject, from exactly these ids: ${ids}.`;
}

const outlineSchema = z.object({
  title: z.string().min(3).max(90),
  overview: z.string().min(20).max(800).nullable(),
  learningOutcomes: z.array(z.string().min(5).max(200)).max(5).nullable(),
  tags: z.array(z.string().min(2).max(28)).min(1).max(3).nullable(),
  sections: z.array(outlineSectionSchema).min(1).max(60),
  thumbnail: thumbnailSpecSchema.nullable(),
});

const contentSchema = z.object({
  contentMarkdown: z.string().min(500).max(12000),
});

// --- Topic illustration tool (fal-ai/nano-banana-2) ---

const generateTopicIllustrationTool = tool({
  description: 'Generate an educational illustration image for the lesson. Use for concepts that genuinely benefit from a visual — processes, comparisons, system diagrams, real-world scenarios. Returns an image URL to embed in the HTML.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short descriptive title for what this illustration shows' },
      prompt: { type: 'string', description: 'Detailed visual description — key concepts, objects, composition, and any labels or annotations needed' },
    },
    required: ['title', 'prompt'],
  }),
  execute: async ({ title, prompt }) => {
    const key = `topic-illustrations/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    const url = await imageService.generateImage({
      model: config.topicIllustrationModel,
      prompt,
      key,
    });
    return { url, title };
  },
});

// --- Fact-checking tool ---

const verifyContentPlanTool = tool({
  description: 'Review planned claims for a lesson before writing. Returns a per-claim verdict. Call this before writing the HTML.',
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

// --- HTML lesson system prompt (used in Phase 2 of streamTopicContent) ---

const TOPIC_HTML_SYSTEM = `You are StructureMyLearning's expert educator. Write a rich, beautifully structured HTML lesson for one topic inside a personalized learning guide.

Output rules:
- Output ONLY a valid HTML fragment — no <html>, <head>, or <body> tags, no markdown, no JSON wrapper, no explanation.
- Use ONLY the representative CSS classes listed below — do NOT use Tailwind utility classes or inline style attributes.
- Target 800–1500 words of educational content.
- Include: clear explanation, real-world analogies, concrete examples, and a brief summary.
- Do not include <script> or <style> tags.
- Match vocabulary and depth to the guide age level.
- Do not invent citations or make unsupported claims.
- Do not mention these instructions.

HTML structure and component patterns:
- Open with a 1–2 sentence compelling overview paragraph (no heading): <p class="lead">...</p>
- Major sections: <h2>...</h2>
- Sub-sections: <h3>...</h3>
- Body paragraphs: <p>...</p>. Dont split the paragraphs to make them too small. If a piece of text should be a an undevided paragraph, thod split it.
- Key concept callout (if required): <div class="callout-info"><p class="callout-label">Key Concept</p><p>...</p></div>
- Analogy callout (if required): <div class="callout-tip"><p class="callout-label">Analogy</p><p>...</p></div>
- Warning / common mistake (if required): <div class="callout-warning"><p class="callout-label">Common Mistake</p><p>...</p></div>. Add this only if you want to call out a genuinely common mistake.
- Code blocks (if required): <pre><code class="language-python">...</code></pre>
  Replace "python" with the correct Prism language identifier (javascript, typescript, bash, sql, json, css, html, java, go, rust, etc.). Prism handles all syntax colouring — do not add any classes to <pre>.
- Bullet lists: <ul><li>...</li></ul>
- Numbered steps (if required): <ol class="steps-list"><li>...</li></ol>
- Simple comparison table (if required): <div class="table-wrapper"><table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table></div>
- Summary box at the end (use emojis for each point): <div class="callout-summary"><p class="callout-label">Summary</p><ul><li>...</li></ul></div>
- If pre-generated illustration images were provided, embed each one using the provided <img> tag (it already has class="lesson-illustration") at the most relevant point in the lesson.`;

const fallbackIllustrationPath = '/static/guide-illustrations/generic-guide.svg';

const clarifyingQuestionsSchema = z.object({
  skip: z.boolean(),
  reason: z.string().nullable(),
  questions: z.array(z.object({
    id: z.string().min(1).max(40),
    question: z.string().min(1).max(160),
    rationale: z.string().max(200).nullable(),
    allowMultiple: z.boolean(),
    options: z.array(z.object({
      id: z.string().min(1).max(40),
      label: z.string().min(1).max(80),
    })).min(2).max(6),
  })).max(5),
});

let testMocks = {};

function setAiMocks(mocks) {
  testMocks = mocks || {};
}

function streamOutline({ prompt, learningLevel, coverage, clarifications, freeText }) {
  if (testMocks.generateOutline) {
    const outlinePromise = Promise.resolve(testMocks.generateOutline({ prompt, learningLevel, coverage, clarifications, freeText }))
      .then((r) => outlineSchema.parse(r));
    return {
      partialObjectStream: (async function* () { yield await outlinePromise; })(),
      object: outlinePromise,
    };
  }

  const max = maxSubtopics[learningLevel][coverage];
  const subtopicLimitRule = isFinite(max)
    ? `- The total number of items across ALL sections must not exceed ${max}. Distribute items across sections accordingly — do not exceed this budget.`
    : '';

  const learnerProfile = buildLearnerProfileBlock(learningLevel, coverage);
  const maxImages = contentConfig.image_policy[learningLevel]?.max_images ?? 2;

  const system = `${guidePromptSections['System Prompt']}

${guidePromptSections['Instructions']}

${learnerProfile}

Additional output rules:
- Arrange sections from foundational to advanced.
- Every learning item must be labeled as "Required", "Optional but recommended", or "Optional and can be skipped".
- Add "details" arrays for items that naturally have sub-bullets, examples, variants, or common failure modes.
- Keep section titles specific and short.
- Generate exactly two short category tags based on the completed guide, not by splitting the title.
- Make each section description exactly one sentence.
- Do not include content lessons yet.
- Write a one-sentence "overview" (under 400 characters) for every item that states what it is and why it matters at this learner level.
- Avoid unsupported claims, hype, and filler.
- For "illustrationPrompts": follow the illustration guidance in the learner profile above. When generating prompts, describe the visual composition, key elements, labels, and layout in full. Generate at most ${maxImages} prompt(s) per subtopic.${subtopicLimitRule ? `\n${subtopicLimitRule}` : ''}
- If a "Learner clarifications" block is present in the user prompt, treat its content as authoritative refinements of the learning goal — let it shape topic selection, emphasis, and examples.

${thumbnailSpecInstruction()}`;

  let userPrompt = guidePromptSections['User Prompt']
    .replace('`{{SUBJECT}}`', `"${prompt}"`)
    .replace('`{{LEARNING_LEVEL}}`', learningLevel)
    .replace('`{{COVERAGE}}`', coverage);

  if (clarifications?.length > 0 || freeText) {
    const lines = (clarifications || []).map((c) => `- ${c.question}: ${c.answers.join(', ')}`);
    if (freeText) lines.push(`Additional notes: ${freeText}`);
    userPrompt += `\n\nLearner clarifications (treat as authoritative refinements of the learning goal):\n${lines.join('\n')}`;
  }

  if (getObjectMode() === 'tool') {
    const resultPromise = generateObject({
      model: getGuideModel(),
      schema: outlineSchema,
      mode: 'tool',
      system,
      prompt: userPrompt,
    });
    return {
      partialObjectStream: (async function* () { yield await resultPromise.then((r) => r.object); })(),
      object: resultPromise.then((r) => r.object),
      usage: resultPromise.then((r) => r.usage),
    };
  }
  return streamObject({ model: getGuideModel(), schema: outlineSchema, system, prompt: userPrompt });
}

async function generateClarifyingQuestions({ prompt, learningLevel, coverage }) {
  if (testMocks.generateClarifyingQuestions) {
    return clarifyingQuestionsSchema.parse(
      await testMocks.generateClarifyingQuestions({ prompt, learningLevel, coverage })
    );
  }

  const system = `${clarifyingQuestionsPromptSections['System Prompt']}\n\n${clarifyingQuestionsPromptSections['Instructions']}`;
  const userPrompt = clarifyingQuestionsPromptSections['User Prompt']
    .replace('`{{SUBJECT}}`', `"${prompt}"`)
    .replace('`{{LEARNING_LEVEL}}`', learningLevel)
    .replace('`{{COVERAGE}}`', coverage);

  const { object, usage } = await generateObject({
    model: getGuideModel(),
    schema: clarifyingQuestionsSchema,
    mode: getObjectMode(),
    system,
    prompt: userPrompt,
  });

  try {
    const { estimateCost } = require('./cost-rates');
    const { tokensIn, tokensOut, costUsd } = estimateCost(usage, config.anthropicGuideModel || config.openaiGuideModel);
    console.log(`[cost] clarifying-questions in=${tokensIn} out=${tokensOut} $${costUsd.toFixed(4)}`);
  } catch (err) {
    console.warn('[cost] failed to log clarifying-questions cost:', err.message);
  }

  return object;
}

function resolveThumbnailPalette(paletteId) {
  const palette = contentConfig.guide_thumbnail.palette;
  return palette.find((p) => p.id === paletteId) || palette[0];
}

// Build the flat-vector thumbnail prompt by filling the canonical template
// (src/prompts/guide-thumbnail-prompt.md) with the derived metaphor + resolved palette.
function guideThumbnailPrompt({ spec }) {
  const { background, accent } = resolveThumbnailPalette(spec.paletteId);
  return guideThumbnailPromptSections['Prompt']
    .replaceAll('{{METAPHOR}}', spec.metaphor)
    .replaceAll('{{MAX_ELEMENTS}}', String(contentConfig.guide_thumbnail.max_elements))
    .replaceAll('{{BACKGROUND}}', background)
    .replaceAll('{{ACCENT}}', accent);
}

// Derive a thumbnail spec from a guide's title + outline. New guides get this for free
// inside the outline call (outline.thumbnail); this standalone path is for backfilling
// existing guides and as a runtime fallback when an outline lacks a thumbnail.
async function deriveGuideThumbnailSpec({ title, outline }) {
  if (testMocks.deriveGuideThumbnailSpec) {
    return thumbnailSpecSchema.parse(await testMocks.deriveGuideThumbnailSpec({ title, outline }));
  }

  const sectionTitles = (outline?.sections || []).slice(0, 10).map((s) => s.title).join(', ');
  const tags = outline?.tags && outline.tags.length > 0 ? outline.tags.join(', ') : '';

  const system = `You design course-card cover thumbnails for a learning app.\n\n${thumbnailSpecInstruction()}`;
  const userPrompt = `Guide title: ${title}${tags ? `\nTags: ${tags}` : ''}${sectionTitles ? `\nMajor sections: ${sectionTitles}` : ''}\n\nReturn the thumbnail spec for this guide.`;

  const { object, usage } = await generateObject({
    model: getGuideModel(),
    schema: thumbnailSpecSchema,
    mode: getObjectMode(),
    system,
    prompt: userPrompt,
  });

  try {
    const { estimateCost } = require('./cost-rates');
    const { tokensIn, tokensOut, costUsd } = estimateCost(usage, config.anthropicGuideModel || config.openaiGuideModel);
    console.log(`[cost] thumbnail-spec in=${tokensIn} out=${tokensOut} $${costUsd.toFixed(4)}`);
  } catch (err) {
    console.warn('[cost] failed to log thumbnail-spec cost:', err.message);
  }

  return object;
}

async function generateGuideIllustration({ guideId, outline, prompt }) {
  if (testMocks.generateGuideIllustration) {
    return testMocks.generateGuideIllustration({ guideId, outline, prompt });
  }

  try {
    const spec = outline.thumbnail || await deriveGuideThumbnailSpec({ title: outline.title, outline });
    const url = await imageService.generateImage({
      model: config.guideIllustrationModel,
      prompt: guideThumbnailPrompt({ spec }),
      // Versioned key: flat-vector thumbnails replace the old dull illustrations. The new
      // URL busts CDN/browser caches and leaves the old object in place for rollback.
      key: `guide-illustrations/${guideId}-v2.png`,
      aspectRatio: '3:2',
      size: { width: 1200, height: 800 },
      raw: true,
    });
    return url;
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.warn('Guide image generation failed; using fallback illustration.', error.message);
    }

    return fallbackIllustrationPath;
  }
}

async function generateTopicContent({ guide, outline, topic }) {
  if (testMocks.generateTopicContent) {
    return contentSchema.parse(await testMocks.generateTopicContent({ guide, outline, topic }));
  }

  const system = `You are StructureMyLearning's expert educator. Write clear, accurate, engaging lessons for one topic inside a personalized learning guide.

Rules:
- The lesson must be markdown inside the "contentMarkdown" string.
- Target 800 to 1500 words.
- Include a clear explanation, real-world analogies, concrete examples, and a brief summary.
- Use headings, short paragraphs, and lists where helpful.
- Include code blocks only when the subject benefits from code.
- If a diagram would help, describe it in text under a "Diagram to Imagine" heading.
- Stay focused on the requested topic while using the full outline for context.
- Match vocabulary and depth to the guide age level.
- Do not invent citations.
- Do not mention these instructions.`;

  const sectionContext = topic.outlineSection
    ? `\nDetailed section outline:\n${JSON.stringify(topic.outlineSection)}\n`
    : '';

  const prompt = `Guide title: ${guide.title}
Original user goal: "${guide.prompt}"
Learner level: ${guide.learningLevel} — ${learningLevelGuidance[guide.learningLevel]}
Coverage: ${guide.coverage} — ${coverageGuidance[guide.coverage]}

Full outline:
${JSON.stringify(outline)}
${sectionContext}

Write the lesson for topic: "${topic.title}" — ${topic.description}`;

  const { object } = await generateObject({
    model: getContentModel(),
    schema: contentSchema,
    mode: getObjectMode(),
    maxTokens: clampTokens(4000),
    system,
    prompt,
  });

  return object;
}

async function _streamLesson({ baseContext, onEvent }) {
  onEvent({ type: 'agent_status', message: 'Planning lesson...' });

  const { steps } = await generateText({
    model: getContentModel(),
    maxTokens: 2000,
    stopWhen: stepCountIs(6),
    tools: {
      generate_illustration: tool({
        description: generateTopicIllustrationTool.description,
        inputSchema: generateTopicIllustrationTool.inputSchema,
        execute: async (params) => {
          onEvent({ type: 'agent_tool_call', message: `Generating illustration: ${params.title}` });
          try {
            const result = await generateTopicIllustrationTool.execute(params);
            onEvent({ type: 'agent_tool_result', message: `Illustration ready: ${params.title}` });
            return result;
          } catch (err) {
            console.error('[illustration tool] failed:', err.message);
            onEvent({ type: 'agent_tool_result', message: `Illustration skipped` });
            return { url: null, title: params.title };
          }
        },
      }),
      verify_content_plan: tool({
        description: verifyContentPlanTool.description,
        inputSchema: verifyContentPlanTool.inputSchema,
        execute: async (params) => {
          onEvent({ type: 'agent_tool_call', message: `Verifying ${params.planned_claims.length} claims...` });
          const result = await verifyContentPlanTool.execute(params);
          onEvent({ type: 'agent_tool_result', message: 'Claims verified' });
          return result;
        },
      }),
    },
    system: `You are a lesson-preparation assistant. Do NOT write the HTML lesson yet — that happens next.
Your job is to prepare resources for the lesson writer:
1. Call verify_content_plan with 5–10 key claims you plan to make in this lesson.
2. Call generate_illustration for images that would genuinely aid understanding (0–2 max). Skip if the topic is purely abstract or text-only is sufficient.
3. After your tool calls, output only: { "ready": true }`,
    prompt: baseContext,
  });

  const toolResults = steps.flatMap((s) => s.toolResults ?? []);
  const illustrations = toolResults.filter((r) => r.toolName === 'generate_illustration');
  const verifications = toolResults.filter((r) => r.toolName === 'verify_content_plan');

  const validIllustrations = illustrations.filter((r) => r.output?.url);
  const illustrationContext = validIllustrations.length > 0
    ? `\n\nPre-generated illustration images — embed each <img> tag at the most relevant point in the lesson. Do not add a caption, heading, or any text around the image:\n${validIllustrations.map((r) => `<img src="${r.output.url}" alt="${r.output.title}" class="lesson-illustration">`).join('\n\n')}`
    : '';

  const verifyContext = verifications.length > 0
    ? `\n\nFact-check notes — apply any corrections before writing:\n${verifications.map((r) => r.output.verification).join('\n')}`
    : '';

  onEvent({ type: 'agent_status', message: 'Writing lesson...' });

  return streamText({
    model: getContentModel(),
    maxTokens: 4000,
    system: TOPIC_HTML_SYSTEM,
    prompt: `${baseContext}${illustrationContext}${verifyContext}\n\nWrite the complete HTML lesson now.`,
  });
}

async function streamTopicContent({ guide, outline, topic, onEvent = () => {} }) {
  if (testMocks.generateTopicContent) {
    const result = await testMocks.generateTopicContent({ guide, outline, topic });
    const content = result.contentHtml || result.contentMarkdown;
    return {
      textStream: (async function* () { yield content; })(),
      text: Promise.resolve(content),
    };
  }

  const sectionContext = topic.outlineSection
    ? `\nDetailed section outline:\n${JSON.stringify(topic.outlineSection)}\n`
    : '';

  const baseContext = `Guide: "${guide.title}"
Goal: "${guide.prompt}"
Level: ${guide.learningLevel} — ${learningLevelGuidance[guide.learningLevel]}
Coverage: ${guide.coverage} — ${coverageGuidance[guide.coverage]}
Full outline: ${JSON.stringify(outline)}
${sectionContext}
Topic: "${topic.title}" — ${topic.description}`;

  return _streamLesson({ baseContext, onEvent });
}

async function streamSubtopicContent({ guide, outline, topic, item, onEvent = () => {} }) {
  if (testMocks.generateTopicContent) {
    const result = await testMocks.generateTopicContent({ guide, outline, topic });
    const content = result.contentHtml || result.contentMarkdown;
    return {
      textStream: (async function* () { yield content; })(),
      text: Promise.resolve(content),
    };
  }

  const baseContext = `Guide: "${guide.title}"
Goal: "${guide.prompt}"
Level: ${guide.learningLevel} — ${learningLevelGuidance[guide.learningLevel]}
Coverage: ${guide.coverage} — ${coverageGuidance[guide.coverage]}
Full outline: ${JSON.stringify(outline)}
Parent section: "${topic.title}" — ${topic.description}
Subtopic: "${item.title}"${item.overview ? ` — ${item.overview}` : ''}
Importance: ${item.importance}${item.details && item.details.length > 0 ? `\nKey details: ${item.details.join(', ')}` : ''}`;

  return _streamLesson({ baseContext, onEvent });
}

async function refineOutline({ guideTitle, existingSections, userPrompt, learningLevel, coverage }) {
  const sectionSummary = existingSections.map((s, i) =>
    `Section ${i + 1}: "${s.title}" — ${s.description}\n   Subtopics: ${s.items?.map((st) => `"${st.title}"`).join(', ') || 'none'}`
  ).join('\n\n');

  const { object } = await generateObject({
    model: getGuideModel(),
    schema: z.object({
      newSections: z.array(outlineSectionSchema).min(1).max(20),
      insertAfterIndex: z.number().int().min(-1),
    }),
    mode: getObjectMode(),
    system: `You are StructureMyLearning's curriculum designer. A user wants to add new sections to an existing guide outline. Return ONLY the new sections to insert, plus insertAfterIndex — the 0-based index of the existing section after which they should be inserted (-1 = before all existing sections). Do NOT reproduce existing sections in your output.`,
    prompt: `Guide title: "${guideTitle}"
${buildLearnerProfileBlock(learningLevel, coverage)}

Existing sections (context only — do NOT reproduce these in your output):
${sectionSummary}

User's request: "${userPrompt}"

Return only the new sections to add and the insertAfterIndex indicating where they fit best in the learning progression.`,
  });

  return { newSections: object.newSections, insertAfterIndex: object.insertAfterIndex };
}

async function generateAdditionalSections({ guideTitle, existingSections, userPrompt, learningLevel, coverage }) {
  const existingTitles = existingSections.map((s) => s.title).join('\n- ');

  const { object } = await generateObject({
    model: getGuideModel(),
    schema: z.object({ sections: z.array(outlineSectionSchema).min(1).max(3) }),
    mode: getObjectMode(),
    system: `You are StructureMyLearning's curriculum designer. Generate 1–3 additional learning guide sections based on a user's request. The new sections must complement the existing outline without duplicating any topic already covered.`,
    prompt: `Guide title: "${guideTitle}"
${buildLearnerProfileBlock(learningLevel, coverage)}

Existing sections (do not duplicate):
- ${existingTitles}

User request: "${userPrompt}"

Generate 1–3 new guide sections that fulfill the user's request. Each section must be distinct from existing sections and add genuine value to the guide.`,
  });

  return object.sections;
}

// Lightweight HTML subset the tutor may emit in chat. Structural tags are
// derived from the canonical allow-list in content-config.json (so the chat
// stays in sync with the lesson pipeline); `a` is appended because links are
// chat-only and not part of the lesson allow-list.
const TUTOR_TAG_WHITELIST = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h3'];
const tutorAllowedTags = [
  ...contentConfig.html_allowed_tags.filter((t) => TUTOR_TAG_WHITELIST.includes(t)),
  'a',
];

function buildTutorSystemPrompt({ guide, subtopic, siblingTitles }) {
  const learnerProfile = buildLearnerProfileBlock(guide.learningLevel, guide.coverage);
  const lessonBody = subtopic.contentHtml
    ? subtopic.contentHtml
    : '(This lesson is still being generated — no body text is available yet.)';
  const outlineList = siblingTitles.length
    ? siblingTitles.map((t) => `- ${t}`).join('\n')
    : '- (outline unavailable)';

  return `You are StructureMyLearning's AI Tutor, helping a student work through the guide "${guide.title}".

${learnerProfile}

The student is currently reading the lesson "${subtopic.title}". Ground your answers in THIS lesson's content below; when helpful, connect ideas to other lessons in the guide by name. Stay focused on the guide's subject.

=== CURRENT LESSON: ${subtopic.title} ===
${lessonBody}
=== END CURRENT LESSON ===

Other lessons in this guide (titles only, for cross-references):
${outlineList}

Response format — IMPORTANT:
- Reply with an HTML fragment ONLY. Do NOT use Markdown (no \`#\`, \`*\`, \`-\`, or \`\`\` fences).
- Allowed tags: ${tutorAllowedTags.map((t) => `<${t}>`).join(', ')}. Use no other tags (no images, tables, headings above <h3>, or inline styles).
- For multi-line code, use <pre><code class="language-XXX">…</code></pre> where XXX is the language (e.g. language-python) so it is syntax-highlighted. Use inline <code> for short snippets.
- Keep answers concise (aim for under ~150 words) unless the student explicitly asks for more depth.`;
}

async function chatWithTutor({ guide, subtopic, siblingTitles = [], messages, onFinish }) {
  try {
    return streamText({
      model: getContentModel(),
      system: buildTutorSystemPrompt({ guide, subtopic, siblingTitles }),
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 800,
      onFinish,
    });
  } catch (error) {
    const err = new Error('The AI tutor is unavailable right now. Please try again.');
    err.status = 502;
    err.expose = true;
    throw err;
  }
}

module.exports = {
  learningLevelGuidance,
  chatWithTutor,
  generateAdditionalSections,
  generateClarifyingQuestions,
  generateGuideIllustration,
  deriveGuideThumbnailSpec,
  guideThumbnailPrompt,
  refineOutline,
  streamOutline,
  streamSubtopicContent,
  setAiMocks,
  TOPIC_HTML_SYSTEM,
  generateTopicIllustrationTool,
};
