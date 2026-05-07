const OpenAI = require('openai');
const { z } = require('zod');
const config = require('../config');

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
  details: z.array(z.string().min(2).max(160)).max(12).optional(),
});

const outlineSubsectionSchema = z.object({
  title: z.string().min(3).max(120),
  items: z.array(outlineItemSchema).min(1).max(30),
});

const outlineSectionSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(280),
  items: z.array(outlineItemSchema).max(30).optional(),
  subsections: z.array(outlineSubsectionSchema).max(12).optional(),
}).refine((section) => {
  return (section.items && section.items.length > 0) || (section.subsections && section.subsections.length > 0);
}, 'Each section must include items or subsections.');

const outlineSchema = z.object({
  title: z.string().min(3).max(90),
  sections: z.array(outlineSectionSchema).min(1).max(60),
});

const contentSchema = z.object({
  contentMarkdown: z.string().min(500).max(12000),
});

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

  const systemPrompt = `You are StructureMyLearning's expert curriculum designer. Create concise, accurate, learner-friendly course outlines from plain-language learning goals.

Rules:
- Return only valid JSON.
- Arrange topics from foundational to advanced.
- Create a detailed curriculum roadmap, not a short summary.
- Use top-level sections for major learning stages.
- Use subsections when a stage has multiple prerequisite areas or architecture families.
- Every learning item must be labeled as "Required", "Optional but recommended", or "Optional and can be skipped".
- Add "details" arrays for items that naturally have sub-bullets, examples, variants, or common failure modes.
- Match the topic sequence, vocabulary, assumed background knowledge, and depth to the provided age level.
- Keep titles specific and short.
- Make each description exactly one sentence.
- Do not include markdown.
- Do not include content lessons yet.
- Avoid unsupported claims, hype, and filler.`;

  const userPrompt = `Create a structured learning guide for this user goal:

"${prompt}"

Learner age level: ${ageLevel}
Age-level guidance: ${ageGuidance[ageLevel]}

Return JSON matching this schema:
{
  "title": "Short guide title",
  "sections": [
    {
      "title": "Major section title",
      "description": "One sentence explaining what this section covers.",
      "items": [
        {
          "importance": "Required",
          "title": "Specific concept to learn",
          "details": ["Optional sub-point", "Optional variant or example"]
        }
      ],
      "subsections": [
        {
          "title": "Subsection title",
          "items": [
            {
              "importance": "Optional but recommended",
              "title": "Specific concept to learn",
              "details": ["Optional sub-point"]
            }
          ]
        }
      ]
    }
  ]
}`;

  return outlineSchema.parse(await completeJson({ systemPrompt, userPrompt }));
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

module.exports = {
  ageGuidance,
  generateOutline,
  generateTopicContent,
  setAiMocks,
};
