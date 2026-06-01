const path = require('path');
const { generateTopicIllustrationTool } = require('./ai.service');

/**
 * Generate HTML content for a single subtopic using the lesson pipeline.
 *
 * @param {{ guide, outline, topic, item }} ctx
 * @returns {Promise<{ html: string, illustrationUrls: string[], usage: undefined }>}
 */
async function generateSubtopicContent({ guide, item }) {
  const logDir = path.join(__dirname, '../generated-prompts', String(guide.id));
  // Pre-generate illustrations in parallel (same as before)
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

  // Build Illustration objects { id, prompt, url } for the pipeline
  const illustrations = validIllustrations.map((r, i) => ({
    id: String(i + 1),
    prompt: prompts[i] ?? '',
    url: r.url,
  }));

  const { generateLesson } = await import('../lesson/pipeline/orchestrator.js');
  const { html, usage } = await generateLesson(
    item.title,
    guide.learningLevel,
    guide.coverage,
    illustrations,
    { logDir, contentType: item.contentType, codeLanguage: item.codeLanguage, overview: item.overview, details: item.details },
  );

  return { html, illustrationUrls: validIllustrations.map((r) => r.url), usage };
}

module.exports = { generateSubtopicContent };
