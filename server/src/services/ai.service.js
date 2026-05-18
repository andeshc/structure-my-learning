const { generateObject, generateText, jsonSchema, streamObject, streamText, convertToModelMessages, tool, stepCountIs } = require('ai');
const { fal } = require('@fal-ai/client');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const config = require('../config');
const { getModel } = require('./llm');

const guidePromptTemplate = fs.readFileSync(
  path.join(__dirname, '../prompts/guide-generation-prompt.md'),
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

const ageGuidance = {
  ages_8_10: 'Elementary learner; simple vocabulary, concrete examples, gentle pacing, no assumed background knowledge.',
  ages_11_13: 'Middle-grade learner; clear vocabulary, light technical terms with definitions, relatable examples.',
  ages_14_17: 'Teen learner; stronger conceptual depth, school-level terminology, examples that connect to real applications.',
  adult_beginner: 'Adult learner new to the subject; respectful tone, practical examples, simplistic anological terminology, no childish framing.',
  adult_advanced: 'Adult or professional learner; deeper explanations but simple terminology.',
};

const outlineItemSchema = z.object({
  importance: z.enum(['Required', 'Optional but recommended', 'Optional and can be skipped']),
  title: z.string().min(2).max(140),
  overview: z.string().min(10).max(400).nullable(),
  details: z.array(z.string().min(2).max(300)).max(12).nullable(),
});

const outlineSectionSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(280),
  items: z.array(outlineItemSchema).min(1).max(30),
});

const outlineSchema = z.object({
  title: z.string().min(3).max(90),
  overview: z.string().min(20).max(800).nullable(),
  learningOutcomes: z.array(z.string().min(5).max(200)).max(5).nullable(),
  tags: z.array(z.string().min(2).max(28)).min(1).max(3).nullable(),
  sections: z.array(outlineSectionSchema).min(1).max(60),
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
    const relativeDir = '/generated/topic-illustrations';
    const outputDir = path.join(__dirname, '../../public', relativeDir.replace(/^\//, ''));
    fs.mkdirSync(outputDir, { recursive: true });

    fal.config({ credentials: config.falKey });

    const result = await fal.subscribe('fal-ai/nano-banana-2', {
      input: {
        prompt: `Educational illustration for a learning app. Clean flat vector style, white plain background, soft colors. ${prompt}. No watermarks, no text unless labeled in description.`,
        output_format: 'png',
        num_images: 1,
        resolution: '0.5K'
      },
    });

    const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
    if (!imageUrl) throw new Error('fal-ai/nano-banana-2 did not return an image URL.');

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error('fal.ai image URL could not be downloaded.');

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, Buffer.from(await imageResponse.arrayBuffer()));

    return { url: `${relativeDir}/${fileName}`, title };
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
      model: getModel(),
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
- Use Tailwind CSS utility classes for ALL styling — the page loads the Tailwind CDN, so every class works.
- Target 800–1500 words of educational content.
- Include: clear explanation, real-world analogies, concrete examples, and a brief summary.
- Do not use inline style attributes (use Tailwind classes instead).
- Do not include <script> or <style> tags.
- Match vocabulary and depth to the guide age level.
- Do not invent citations or make unsupported claims.
- Do not mention these instructions.

HTML structure and component patterns:
- Open with a 1–2 sentence compelling overview paragraph (no heading): <p class="text-lg text-slate-600 leading-relaxed mb-8">...</p>
- Major sections: <h2 class="text-2xl font-bold text-slate-900 mt-10 mb-4">...</h2>
- Sub-sections: <h3 class="text-lg font-semibold text-slate-800 mt-6 mb-2">...</h3>
- Body paragraphs: <p class="text-slate-700 leading-7 mb-4">...</p>
- Key concept callout (if required): <div class="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl px-5 py-4 my-6"><p class="font-semibold text-blue-900 mb-1">Key Concept</p><p class="text-blue-800 leading-relaxed">...</p></div>
- Analogy callout (if required): <div class="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-4 my-6"><p class="font-semibold text-amber-900 mb-1">Analogy</p><p class="text-amber-800 leading-relaxed">...</p></div>
- Warning / common mistake (if required): <div class="bg-red-50 border-l-4 border-red-400 rounded-r-xl px-5 py-4 my-6"><p class="font-semibold text-red-900 mb-1">Common Mistake</p><p class="text-red-800 leading-relaxed">...</p></div>
- Code blocks (if required): <pre class="rounded-xl overflow-x-auto my-6 text-sm"><code class="language-python">...</code></pre>
  Replace "python" with the correct Prism language identifier (javascript, typescript, bash, sql, json, css, html, java, go, rust, etc.). Prism handles all syntax colouring — do not add text-colour Tailwind classes to the <code> element.
- Bullet lists: <ul class="list-disc list-inside space-y-2 text-slate-700 mb-4 pl-2">
- Numbered steps (if required): <ol class="space-y-3 mb-6"> with items: <li class="flex gap-3 items-start"><span class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">1</span><div class="text-slate-700 leading-relaxed">...</div></li>
- Simple comparison table (if required): <div class="overflow-x-auto my-6"><table class="w-full border-collapse text-sm"><thead><tr class="bg-slate-100"><th class="text-left px-4 py-2 font-semibold text-slate-700 border-b border-slate-200">...</th></tr></thead><tbody><tr class="border-b border-slate-100 hover:bg-slate-50"><td class="px-4 py-3 text-slate-700">...</td></tr></tbody></table></div>
- Summary box at the end (use emojis for each point here): <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-5 mt-10"><p class="font-bold text-emerald-900 mb-3">Summary</p><ul class="space-y-2 text-emerald-800 text-sm leading-relaxed">...</ul></div>
- If pre-generated illustration images were provided, embed each one using the provided <img> tag at the most relevant point in the lesson.`;

const fallbackIllustrationPath = '/static/guide-illustrations/generic-guide.svg';

let testMocks = {};

function setAiMocks(mocks) {
  testMocks = mocks || {};
}

function streamOutline({ prompt, ageLevel }) {
  if (testMocks.generateOutline) {
    const outlinePromise = Promise.resolve(testMocks.generateOutline({ prompt, ageLevel }))
      .then((r) => outlineSchema.parse(r));
    return {
      partialObjectStream: (async function* () { yield await outlinePromise; })(),
      object: outlinePromise,
    };
  }

  const system = `${guidePromptSections['System Prompt']}

${guidePromptSections['Instructions']}

Additional output rules:
- Arrange sections from foundational to advanced.
- Every learning item must be labeled as "Required", "Optional but recommended", or "Optional and can be skipped".
- Add "details" arrays for items that naturally have sub-bullets, examples, variants, or common failure modes.
- Keep section titles specific and short.
- Generate exactly two short category tags based on the completed guide, not by splitting the title.
- Make each section description exactly one sentence.
- Do not include content lessons yet.
- Write a one-sentence "overview" (under 400 characters) for every item that states what it is and why it matters at this learner level.
- Avoid unsupported claims, hype, and filler.`;

  const userPrompt = guidePromptSections['User Prompt']
    .replace('`{{SUBJECT}}`', `"${prompt}"`)
    .replace('`{{DEPTH_LEVEL}}`', ageLevel);

  return streamObject({ model: getModel(), schema: outlineSchema, system, prompt: userPrompt });
}

function guideIllustrationPrompt({ outline, prompt }) {
  const sectionTitles = outline.sections.slice(0, 8).map((section) => section.title).join(', ');
  const tags = outline.tags && outline.tags.length > 0 ? outline.tags.join(', ') : 'learning, education';

  return `Create a clean educational illustration for a learning guide card.
Guide title: ${outline.title}
Original learner request: ${prompt}
Major guide sections: ${sectionTitles}

Scene and style:
- Warm off-white classroom-paper background.
- Flat modern app illustration, vector-like, crisp edges.
- Dark slate outlines with soft blue, green, amber, violet, and rose accents.
- Centered composition with generous padding.
- No shadows, no photorealism, no watermark, no logos.

Subject requirements:
- Make the visual semantically match this exact guide.
- For math topics, show mathematical objects such as matrices, grids, graphs, vectors, highlighted rows/columns, or equations.
- For science topics, show simple scientific processes, natural systems, diagrams, or labeled parts.
- For AI/software topics, show model architecture, tokens, nodes, code windows, or system diagrams.
- For business topics, show plans, targets, workflows, charts, or strategy artifacts.
- Avoid generic education imagery unless the guide is genuinely broad.
- Use only tiny labels, symbols, or single letters when needed. Avoid long readable text.`;
}

async function generateGuideIllustration({ guideId, outline, prompt }) {
  if (testMocks.generateGuideIllustration) {
    return testMocks.generateGuideIllustration({ guideId, outline, prompt });
  }

  try {
    const relativeDir = '/generated/guide-illustrations';
    const outputDir = path.join(__dirname, '../../public', relativeDir.replace(/^\//, ''));
    fs.mkdirSync(outputDir, { recursive: true });

    if (!config.falKey) {
      return fallbackIllustrationPath;
    }

    fal.config({ credentials: config.falKey });

    const result = await fal.subscribe('xai/grok-imagine-image/quality/text-to-image', {
      input: {
        prompt: guideIllustrationPrompt({ outline, prompt }),
        num_images: 1,
        aspect_ratio: '3:2',
        resolution: '1k',
        output_format: 'png',
      },
    });

    const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('fal.ai did not return an image URL.');
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('fal.ai image URL could not be downloaded.');
    }

    const fileName = `${guideId}.png`;
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, Buffer.from(await imageResponse.arrayBuffer()));

    return `${relativeDir}/${fileName}`;
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
Learner age level: ${guide.ageLevel}
Age-level guidance: ${ageGuidance[guide.ageLevel]}

Full outline:
${JSON.stringify(outline)}
${sectionContext}

Write the lesson for topic: "${topic.title}" — ${topic.description}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: contentSchema,
    system,
    prompt,
  });

  return object;
}

async function _streamLesson({ baseContext, onEvent }) {
  onEvent({ type: 'agent_status', message: 'Planning lesson...' });

  const { steps } = await generateText({
    model: getModel(),
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
    ? `\n\nPre-generated illustration images — embed these <img> tags at the most relevant point in the lesson:\n${validIllustrations.map((r) => `<!-- ${r.output.title} -->\n<img src="${r.output.url}" alt="${r.output.title}" class="w-full rounded-xl my-6">`).join('\n\n')}`
    : '';

  const verifyContext = verifications.length > 0
    ? `\n\nFact-check notes — apply any corrections before writing:\n${verifications.map((r) => r.output.verification).join('\n')}`
    : '';

  onEvent({ type: 'agent_status', message: 'Writing lesson...' });

  return streamText({
    model: getModel(),
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
Level: ${guide.ageLevel} — ${ageGuidance[guide.ageLevel]}
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
Level: ${guide.ageLevel} — ${ageGuidance[guide.ageLevel]}
Full outline: ${JSON.stringify(outline)}
Parent section: "${topic.title}" — ${topic.description}
Subtopic: "${item.title}"${item.overview ? ` — ${item.overview}` : ''}
Importance: ${item.importance}${item.details && item.details.length > 0 ? `\nKey details: ${item.details.join(', ')}` : ''}`;

  return _streamLesson({ baseContext, onEvent });
}

async function chatWithTutor({ guide, topic, messages }) {
  try {
    return streamText({
      model: getModel(),
      system: `You are StructureMyLearning's AI Tutor. The student is learning "${topic.title}" from the guide "${guide.title}". Answer questions about this topic clearly and concisely. Stay focused on the topic. Keep responses under 150 words unless the student explicitly asks for more depth. Match the learner level: ${guide.ageLevel.replaceAll('_', ' ')}.`,
      messages: await convertToModelMessages(messages),
      maxTokens: 300,
    });
  } catch (error) {
    const err = new Error('The AI tutor is unavailable right now. Please try again.');
    err.status = 502;
    err.expose = true;
    throw err;
  }
}

module.exports = {
  ageGuidance,
  chatWithTutor,
  generateGuideIllustration,
  streamOutline,
  streamSubtopicContent,
  setAiMocks,
};
