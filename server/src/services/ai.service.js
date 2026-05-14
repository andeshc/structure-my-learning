const OpenAI = require('openai');
const { fal } = require('@fal-ai/client');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const config = require('../config');

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
  overview: z.string().min(10).max(220).optional(),
  details: z.array(z.string().min(2).max(300)).max(12).optional(),
});

const outlineSectionSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(280),
  items: z.array(outlineItemSchema).min(1).max(30),
});

const outlineSchema = z.object({
  title: z.string().min(3).max(90),
  overview: z.string().min(20).max(800).optional(),
  learningOutcomes: z.array(z.string().min(5).max(200)).max(5).optional(),
  tags: z.array(z.string().min(2).max(28)).min(1).max(3).optional(),
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

function openAiClient() {
  if (!config.openaiApiKey) {
    const error = new Error("We couldn't generate your content right now. Please try again in a moment.");
    error.status = 503;
    error.expose = true;
    throw error;
  }

  return new OpenAI({ apiKey: config.openaiApiKey });
}

async function completeJson({ systemPrompt, userPrompt }) {
  if (!config.openaiApiKey) {
    openAiClient();
  }

  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await openAiClient().chat.completions.create({
        model: config.openaiModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error("We couldn't generate your content right now. Please try again in a moment.");
  error.status = 502;
  error.expose = true;
  error.cause = lastError;
  throw error;
}

async function generateOutline({ prompt, ageLevel }) {
  if (testMocks.generateOutline) {
    return outlineSchema.parse(await testMocks.generateOutline({ prompt, ageLevel }));
  }

  const systemPrompt = `${guidePromptSections['System Prompt']}

${guidePromptSections['Instructions']}

Additional output rules:
- Return only valid JSON. Do not include markdown fences.
- Arrange sections from foundational to advanced.
- Every learning item must be labeled as "Required", "Optional but recommended", or "Optional and can be skipped".
- Add "details" arrays for items that naturally have sub-bullets, examples, variants, or common failure modes.
- Keep section titles specific and short.
- Generate exactly two short category tags based on the completed guide, not by splitting the title.
- Make each section description exactly one sentence.
- Do not include content lessons yet.
- Write a one-sentence "overview" for every item that states what it is and why it matters at this learner level.
- Avoid unsupported claims, hype, and filler.`;

  const filledUserPrompt = guidePromptSections['User Prompt']
    .replace('`{{SUBJECT}}`', `"${prompt}"`)
    .replace('`{{DEPTH_LEVEL}}`', ageLevel);

  const userPrompt = `${filledUserPrompt}

Return JSON matching this schema exactly:
{
  "title": "Short guide title",
  "overview": "2-3 sentence course overview: purpose, audience, and what they'll be able to do.",
  "learningOutcomes": ["Concrete measurable skill 1", "Concrete measurable skill 2"],
  "tags": ["Broad category", "Specific subdomain"],
  "sections": [
    {
      "title": "Major section title",
      "description": "One sentence explaining what this section covers.",
      "items": [
        {
          "importance": "Required",
          "title": "Specific concept or subtopic",
          "overview": "One sentence explaining what this concept is and why it matters."
        }
      ]
    }
  ]
}`;

  return outlineSchema.parse(await completeJson({ systemPrompt, userPrompt }));
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

  const systemPrompt = `You are StructureMyLearning's expert educator. Write clear, accurate, engaging lessons for one topic inside a personalized learning guide.

Rules:
- Return only valid JSON.
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

  const userPrompt = `Guide title: ${guide.title}
Original user goal: "${guide.prompt}"
Learner age level: ${guide.ageLevel}
Age-level guidance: ${ageGuidance[guide.ageLevel]}

Full outline:
${JSON.stringify(outline)}
${sectionContext}

Write the lesson for this topic:
{
  "title": "${topic.title}",
  "description": "${topic.description}"
}

Return JSON matching this schema:
{
  "contentMarkdown": "markdown lesson content"
}`;

  return contentSchema.parse(await completeJson({ systemPrompt, userPrompt }));
}

async function chatWithTutor({ guide, topic, messages }) {
  if (testMocks.chatWithTutor) {
    return testMocks.chatWithTutor({ guide, topic, messages });
  }

  try {
    const response = await openAiClient().chat.completions.create({
      model: config.openaiModel,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are StructureMyLearning's AI Tutor. The student is learning "${topic.title}" from the guide "${guide.title}". Answer questions about this topic clearly and concisely. Stay focused on the topic. Keep responses under 150 words unless the student explicitly asks for more depth. Match the learner level: ${guide.ageLevel.replaceAll('_', ' ')}.`,
        },
        ...messages,
      ],
    });
    return { reply: response.choices[0].message.content };
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
  generateOutline,
  generateTopicContent,
  setAiMocks,
};
