const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
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
  tags: z.array(z.string().min(2).max(28)).min(1).max(3).optional(),
  sections: z.array(outlineSectionSchema).min(1).max(60),
});

const contentSchema = z.object({
  contentMarkdown: z.string().min(500).max(12000),
});

const illustrationSchema = z.object({
  svg: z.string().min(500).max(30000),
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
- Generate exactly two short category tags based on the completed guide, not by splitting the title.
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
  "tags": ["Broad category", "Specific subdomain"],
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

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function illustrationKind({ outline, prompt }) {
  const haystack = [
    outline.title,
    prompt,
    ...(outline.tags || []),
    ...outline.sections.flatMap((section) => [
      section.title,
      section.description,
      ...(section.items || []).map((item) => item.title),
      ...(section.subsections || []).map((subsection) => subsection.title),
    ]),
  ].join(' ').toLowerCase();

  if (/(matrix|linear algebra|vector|tensor|calculus|probability|statistics|geometry|algebra|multiplication|dot product)/.test(haystack)) {
    return 'math';
  }

  if (/(transformer|attention|token|embedding|neural|deep learning|language model|llm|machine learning|ai\b)/.test(haystack)) {
    return 'ai';
  }

  if (/(water|cycle|earth|weather|climate|biology|chemistry|physics|ecosystem|science)/.test(haystack)) {
    return 'science';
  }

  if (/(strategy|product|business|marketing|startup|roadmap|customer|market|sales)/.test(haystack)) {
    return 'business';
  }

  if (/(code|programming|javascript|python|react|node|software|database|api|web)/.test(haystack)) {
    return 'code';
  }

  return 'generic';
}

function svgFrame({ title, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024" role="img" aria-label="${escapeXml(title)} illustration">
  <title>${escapeXml(title)} illustration</title>
  <rect width="1536" height="1024" fill="#fbf4e8"/>
  <g fill="#fde68a">
    <circle cx="118" cy="102" r="12"/><circle cx="174" cy="102" r="12"/><circle cx="230" cy="102" r="12"/>
    <circle cx="118" cy="158" r="12"/><circle cx="174" cy="158" r="12"/><circle cx="230" cy="158" r="12"/>
    <circle cx="1286" cy="426" r="12"/><circle cx="1342" cy="426" r="12"/><circle cx="1398" cy="426" r="12"/>
  </g>
  ${body}
</svg>
`;
}

function mathSvg(title) {
  return svgFrame({
    title,
    body: `<g fill="none" stroke="#334155" stroke-linecap="round" stroke-linejoin="round">
    <path d="M468 512h110M866 512h110" stroke-width="12"/>
    <path d="M579 474l38 38-38 38M977 474l38 38-38 38" stroke-width="10"/>
  </g>
  <g font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="#334155">
    <text x="324" y="320">A</text><text x="718" y="320">B</text><text x="1110" y="320">C</text>
  </g>
  <g stroke="#334155" stroke-width="10" fill="#f8fafc">
    <rect x="258" y="356" width="250" height="220" rx="22"/>
    <rect x="650" y="324" width="220" height="300" rx="22"/>
    <rect x="1050" y="356" width="250" height="220" rx="22"/>
  </g>
  <g stroke="#93c5fd" stroke-width="6">
    <path d="M258 430h250M258 502h250M320 356v220M382 356v220M444 356v220"/>
    <path d="M650 384h220M650 444h220M650 504h220M650 564h220M705 324v300M760 324v300M815 324v300"/>
    <path d="M1050 430h250M1050 502h250M1112 356v220M1174 356v220M1236 356v220"/>
  </g>
  <rect x="258" y="430" width="250" height="72" fill="#bfdbfe" opacity=".65"/>
  <rect x="705" y="324" width="55" height="300" fill="#bbf7d0" opacity=".75"/>
  <rect x="1112" y="430" width="62" height="72" fill="#ede9fe" opacity=".9"/>
  <path d="M383 502C486 705 803 704 1143 502" fill="none" stroke="#86efac" stroke-width="8" stroke-linecap="round"/>`,
  });
}

function aiSvg(title) {
  return svgFrame({
    title,
    body: `<g fill="none" stroke="#334155" stroke-linecap="round" stroke-linejoin="round">
    <path d="M336 448h190M1010 448h190M758 228v152M758 646v152" stroke-width="18"/>
    <path d="M526 448h76M914 448h96M526 576h76M914 576h96" stroke-width="14"/>
    <path d="M336 576h190M1010 576h190" stroke-width="18"/>
  </g>
  <rect x="602" y="304" width="312" height="348" rx="56" fill="#dbeafe" stroke="#334155" stroke-width="18"/>
  <rect x="664" y="360" width="188" height="62" rx="18" fill="#bfdbfe" stroke="#334155" stroke-width="10"/>
  <rect x="664" y="458" width="188" height="62" rx="18" fill="#bbf7d0" stroke="#334155" stroke-width="10"/>
  <rect x="664" y="556" width="188" height="62" rx="18" fill="#fde68a" stroke="#334155" stroke-width="10"/>
  <rect x="286" y="484" width="152" height="152" rx="24" fill="#dbeafe" stroke="#93c5fd" stroke-width="12"/>
  <g stroke="#93c5fd" stroke-width="8"><path d="M336 484v152M388 484v152M286 536h152M286 588h152"/></g>
  <rect x="1098" y="402" width="188" height="220" rx="28" fill="#ede9fe" stroke="#334155" stroke-width="12"/>
  <g stroke="#8b5cf6" stroke-linecap="round" stroke-width="14"><path d="M1154 474h76"/><path d="M1154 540h54"/></g>`,
  });
}

function scienceSvg(title) {
  return svgFrame({
    title,
    body: `<path d="M0 720c230-120 420-126 620-36 226 102 456 78 916-44v384H0z" fill="#38bdf8"/>
  <path d="M0 790c250-72 440-40 650 26 270 86 500 34 886-50v258H0z" fill="#14b8a6" opacity=".8"/>
  <path d="M196 704l230-360 160 296 132-190 234 254z" fill="#7dd3fc"/>
  <path d="M330 704l132-204 104 204z" fill="#bfdbfe"/>
  <circle cx="1120" cy="252" r="86" fill="#fbbf24"/>
  <path d="M770 214c148-106 322-94 450 34M1220 248l-42-86M1220 248l-100-4M1140 565c144-44 224-130 248-282M1388 283l48 90M1388 283l-94 40" fill="none" stroke="#2563eb" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#7dd3fc"><ellipse cx="292" cy="250" rx="100" ry="58"/><ellipse cx="410" cy="234" rx="88" ry="70"/><ellipse cx="518" cy="276" rx="118" ry="56"/><ellipse cx="924" cy="414" rx="100" ry="54"/><ellipse cx="1038" cy="390" rx="86" ry="66"/></g>
  <g stroke="#0ea5e9" stroke-width="18" stroke-linecap="round"><path d="M270 380l-30 64M390 374l-30 64M512 382l-30 64M938 514l-30 64M1048 504l-30 64"/></g>`,
  });
}

function businessSvg(title) {
  return svgFrame({
    title,
    body: `<circle cx="452" cy="510" r="244" fill="#fee2e2" stroke="#334155" stroke-width="14"/>
  <circle cx="452" cy="510" r="174" fill="#fff7ed" stroke="#fca5a5" stroke-width="42"/>
  <circle cx="452" cy="510" r="88" fill="#fee2e2" stroke="#fca5a5" stroke-width="34"/>
  <circle cx="452" cy="510" r="28" fill="#ef4444"/>
  <path d="M462 502l398-252" stroke="#1d4ed8" stroke-width="24" stroke-linecap="round"/>
  <path d="M836 268l138-54-46 126z" fill="#3b82f6" stroke="#334155" stroke-width="14"/>
  <g transform="translate(930 312) rotate(7)">
    <rect x="0" y="0" width="356" height="390" rx="34" fill="#ffffff" stroke="#334155" stroke-width="14"/>
    <path d="M82 106l42 42M124 106l-42 42M236 126l-118 132M118 258l-12-74M118 258l74-8M82 316l42 42M124 316l-42 42" stroke="#1d4ed8" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M72 0v-46M144 0v-46M216 0v-46M288 0v-46" stroke="#64748b" stroke-width="12" stroke-linecap="round"/>
  </g>`,
  });
}

function codeSvg(title) {
  return svgFrame({
    title,
    body: `<rect x="328" y="270" width="880" height="540" rx="42" fill="#f8fafc" stroke="#334155" stroke-width="16"/>
  <rect x="328" y="270" width="880" height="92" rx="42" fill="#dbeafe"/>
  <circle cx="402" cy="316" r="16" fill="#f87171"/><circle cx="462" cy="316" r="16" fill="#fbbf24"/><circle cx="522" cy="316" r="16" fill="#34d399"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M520 514l-102 94 102 94M1016 514l102 94-102 94" stroke="#2563eb" stroke-width="26"/>
    <path d="M844 464l-152 306" stroke="#8b5cf6" stroke-width="24"/>
    <path d="M610 452h252M610 548h162M610 748h286" stroke="#94a3b8" stroke-width="18"/>
  </g>`,
  });
}

function genericSvg(title) {
  return aiSvg(title);
}

function semanticIllustrationSvg({ outline, prompt }) {
  const title = outline.title || prompt || 'Learning guide';
  const kind = illustrationKind({ outline, prompt });

  if (kind === 'math') {
    return mathSvg(title);
  }

  if (kind === 'ai') {
    return aiSvg(title);
  }

  if (kind === 'science') {
    return scienceSvg(title);
  }

  if (kind === 'business') {
    return businessSvg(title);
  }

  if (kind === 'code') {
    return codeSvg(title);
  }

  return genericSvg(title);
}

function validateSvg(svg) {
  const trimmed = svg.trim();
  const forbidden = /<\s*(script|foreignObject|iframe|object|embed|link|style)\b|on[a-z]+\s*=|javascript:/i;

  if (!trimmed.startsWith('<svg') || !trimmed.endsWith('</svg>') || forbidden.test(trimmed)) {
    throw new Error('Generated illustration SVG did not pass validation.');
  }

  return trimmed;
}

async function generateGuideSvgWithTextModel({ outline, prompt }) {
  if (testMocks.generateGuideSvg) {
    return validateSvg(testMocks.generateGuideSvg({ outline, prompt }));
  }

  if (!config.openaiApiKey) {
    return semanticIllustrationSvg({ outline, prompt });
  }

  const sectionTitles = outline.sections.slice(0, 8).map((section) => section.title).join(', ');
  const tags = outline.tags && outline.tags.length > 0 ? outline.tags.join(', ') : 'learning, education';
  const systemPrompt = `You create safe SVG illustrations for StructureMyLearning guide cards.

Rules:
- Return only valid JSON.
- The JSON must contain one key: "svg".
- The SVG must be a complete inline SVG string.
- Use width="1536", height="1024", and viewBox="0 0 1536 1024".
- Create a semantic illustration specifically for the guide, not a generic education icon.
- Use flat vector shapes only: rect, circle, ellipse, path, line, polyline, polygon, g, text, title.
- Do not use external images, external fonts, CSS, style tags, scripts, animation, filters, foreignObject, or event handlers.
- Keep text inside the SVG minimal: short labels, symbols, or single words only.
- Use a warm off-white background, dark slate outlines, and soft blue, green, amber, violet, and rose accents.
- The composition must work when center-cropped into a dashboard card header.`;

  const userPrompt = `Create the SVG for this generated learning guide.

Guide title: ${outline.title}
Guide tags: ${tags}
Original learner request: ${prompt}
Major guide sections: ${sectionTitles}

Return JSON matching:
{
  "svg": "<svg ...>...</svg>"
}`;

  const result = illustrationSchema.parse(await completeJson({ systemPrompt, userPrompt }));
  return validateSvg(result.svg);
}

async function generateGuideIllustration({ guideId, outline, prompt }) {
  if (testMocks.generateGuideIllustration) {
    return testMocks.generateGuideIllustration({ guideId, outline, prompt });
  }

  try {
    const relativeDir = '/generated/guide-illustrations';
    const outputDir = path.join(__dirname, '../../public', relativeDir.replace(/^\//, ''));
    fs.mkdirSync(outputDir, { recursive: true });

    const fileName = `${guideId}.svg`;
    let svg;

    try {
      svg = await generateGuideSvgWithTextModel({ outline, prompt });
    } catch (error) {
      if (config.nodeEnv !== 'test') {
        console.warn('Text-model SVG generation failed; using local semantic SVG.', error.message);
      }
      svg = semanticIllustrationSvg({ outline, prompt });
    }

    fs.writeFileSync(path.join(outputDir, fileName), svg, 'utf8');

    return `${relativeDir}/${fileName}`;
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.warn('Semantic guide illustration generation failed; using fallback illustration.', error.message);
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

module.exports = {
  ageGuidance,
  generateGuideIllustration,
  generateOutline,
  generateTopicContent,
  setAiMocks,
};
