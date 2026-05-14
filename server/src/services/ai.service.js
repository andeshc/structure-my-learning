const { generateObject, streamObject, streamText, convertToModelMessages } = require('ai');
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
  adult_beginner: 'Adult learner new to the subject; respectful tone, practical examples, no childish framing.',
  adult_advanced: 'Adult or professional learner; deeper explanations, precise terminology, more nuance, and efficient pacing.',
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

async function streamTopicContent({ guide, outline, topic }) {
  if (testMocks.generateTopicContent) {
    const result = await testMocks.generateTopicContent({ guide, outline, topic });
    const content = result.contentHtml || result.contentMarkdown;
    return {
      pipeTextStreamToResponse: (res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(content);
      },
      text: Promise.resolve(content),
    };
  }

  const system = `You are StructureMyLearning's expert educator. Write a rich, beautifully structured HTML lesson for one topic inside a personalized learning guide.

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
- Key concept callout: <div class="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl px-5 py-4 my-6"><p class="font-semibold text-blue-900 mb-1">Key Concept</p><p class="text-blue-800 leading-relaxed">...</p></div>
- Analogy callout: <div class="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-4 my-6"><p class="font-semibold text-amber-900 mb-1">Analogy</p><p class="text-amber-800 leading-relaxed">...</p></div>
- Warning / common mistake: <div class="bg-red-50 border-l-4 border-red-400 rounded-r-xl px-5 py-4 my-6"><p class="font-semibold text-red-900 mb-1">Common Mistake</p><p class="text-red-800 leading-relaxed">...</p></div>
- Code blocks: <pre class="bg-slate-900 rounded-xl p-5 overflow-x-auto my-6 text-sm"><code class="text-emerald-300 font-mono">...</code></pre>
- Bullet lists: <ul class="list-disc list-inside space-y-2 text-slate-700 mb-4 pl-2">
- Numbered steps: <ol class="space-y-3 mb-6"> with items: <li class="flex gap-3 items-start"><span class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">1</span><div class="text-slate-700 leading-relaxed">...</div></li>
- Simple comparison table: <div class="overflow-x-auto my-6"><table class="w-full border-collapse text-sm"><thead><tr class="bg-slate-100"><th class="text-left px-4 py-2 font-semibold text-slate-700 border-b border-slate-200">...</th></tr></thead><tbody><tr class="border-b border-slate-100 hover:bg-slate-50"><td class="px-4 py-3 text-slate-700">...</td></tr></tbody></table></div>
- Summary box at the end: <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-5 mt-10"><p class="font-bold text-emerald-900 mb-3">Summary</p><ul class="space-y-2 text-emerald-800 text-sm leading-relaxed">...</ul></div>
- For diagrams that add real value, use inline SVG with appropriate viewBox and Tailwind classes for sizing.`;

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

Write the full lesson for topic: "${topic.title}" — ${topic.description}`;

  return streamText({ model: getModel(), system, prompt, maxTokens: 4000 });
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
  generateTopicContent,
  streamOutline,
  streamTopicContent,
  setAiMocks,
};
