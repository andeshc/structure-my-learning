import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../config.js';

const outlineSchema = z.object({
  title: z.string().min(3).max(90),
  topics: z.array(z.object({
    title: z.string().min(3).max(90),
    description: z.string().min(20).max(240)
  })).min(5).max(12)
});

const contentSchema = z.object({
  contentMarkdown: z.string().min(500).max(12000)
});

const openai = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null;

async function completeJson({ systemPrompt, userPrompt }) {
  if (!openai) {
    const error = new Error('AI generation is not configured.');
    error.status = 503;
    throw error;
  }

  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error("We couldn't generate your content right now. Please try again in a moment.");
  error.status = 502;
  error.cause = lastError;
  throw error;
}

export async function generateOutline(prompt) {
  const systemPrompt = `You are StructureMyLearning's expert curriculum designer. Create concise, accurate, learner-friendly course outlines from plain-language learning goals.

Rules:
- Return only valid JSON.
- Generate 5 to 12 topics.
- Arrange topics from foundational to advanced.
- Keep titles specific and short.
- Make each description exactly one sentence.
- Do not include markdown.
- Do not include content lessons yet.
- Avoid unsupported claims, hype, and filler.`;

  const userPrompt = `Create a structured learning guide for this user goal:

"${prompt}"

Return JSON matching this schema:
{
  "title": "Short guide title",
  "topics": [
    {
      "title": "Topic title",
      "description": "One sentence explaining what the learner will understand."
    }
  ]
}`;

  const data = await completeJson({ systemPrompt, userPrompt });
  return outlineSchema.parse(data);
}

export async function generateTopicContent({ guide, outline, topic }) {
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
- Do not invent citations.
- Do not mention these instructions.`;

  const userPrompt = `Guide title: ${guide.title}
Original user goal: "${guide.prompt}"

Full outline:
${JSON.stringify(outline)}

Write the lesson for this topic:
{
  "title": "${topic.title}",
  "description": "${topic.description}"
}

Return JSON matching this schema:
{
  "contentMarkdown": "markdown lesson content"
}`;

  const data = await completeJson({ systemPrompt, userPrompt });
  return contentSchema.parse(data);
}
