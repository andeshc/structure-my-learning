import request from 'supertest';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const app = require('./app');
const db = require('./db');
const { initDb } = require('./db/init');
const aiService = require('./services/ai.service');
const config = require('./config');
const { setAiMocks } = aiService;

function resetDatabase() {
  initDb();
  db.exec(`
    DELETE FROM refresh_tokens;
    DELETE FROM oauth_accounts;
    DELETE FROM topics;
    DELETE FROM guides;
    DELETE FROM users;
  `);
}

async function registerUser(email = 'test@example.com') {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'password123' });

  return response.body.accessToken;
}

describe('API', () => {
  beforeEach(() => {
    resetDatabase();
    setAiMocks({
      generateOutline: async () => ({
        title: 'Mocked Guide',
        tags: ['Learning', 'Mocked'],
        overview: null,
        learningOutcomes: null,
        sections: [
          {
            title: 'Foundations',
            description: 'Learn the basic ideas that support the rest of the subject.',
            items: [
              { importance: 'Required', title: 'Core idea', overview: null, details: null },
              { importance: 'Optional but recommended', title: 'Helpful context', overview: null, details: ['A useful example'] },
            ],
          },
          {
            title: 'Key Vocabulary',
            description: 'Understand the core terms used when discussing this topic.',
            items: [{ importance: 'Required', title: 'Important terms', overview: null, details: null }],
          },
          {
            title: 'Main Process',
            description: 'Explore how the central process works step by step.',
            items: [{ importance: 'Required', title: 'Step-by-step flow', overview: null, details: null }],
          },
          {
            title: 'Examples',
            description: 'See concrete examples that make the ideas easier to apply.',
            items: [{ importance: 'Optional and can be skipped', title: 'Extra worked example', overview: null, details: null }],
          },
          {
            title: 'Review',
            description: 'Summarize the topic and connect it to future learning.',
            items: [{ importance: 'Required', title: 'Final synthesis', overview: null, details: null }],
          },
        ],
      }),
      generateTopicContent: async ({ topic }) => ({
        contentHtml: `<h1>${topic.title}</h1><p>This lesson explains the concept with examples, analogies, and a summary.</p>`.repeat(14),
      }),
      generateGuideIllustration: async ({ guideId }) => `/generated/guide-illustrations/${guideId}.png`,
    });
  });

  it('returns health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'structure-my-learning' });
  });

  it('registers a user and refreshes the session', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'auth@example.com', password: 'password123' });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.accessToken).toBeTruthy();

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', registerResponse.headers['set-cookie']);

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeTruthy();
  });

  it('creates a guide, generates topic content, and tracks progress', async () => {
    const token = await registerUser('guide@example.com');
    const guideResponse = await request(app)
      .post('/api/guides')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'teach me mocked learning', ageLevel: 'adult_beginner' });

    expect(guideResponse.status).toBe(200);

    const lines = guideResponse.text.trim().split('\n').filter(Boolean);
    const doneEvent = JSON.parse(lines[lines.length - 1]);
    expect(doneEvent.type).toBe('done');
    const guide = doneEvent.guide;

    expect(guide.topics).toHaveLength(5);
    expect(guide.outline.tags).toEqual(['Learning', 'Mocked']);
    expect(guide.outline.sections[0].items[0].importance).toBe('Required');

    const topicId = guide.topics[0].id;

    const contentResponse = await request(app)
      .get(`/api/topics/${topicId}/content`)
      .set('Authorization', `Bearer ${token}`);

    expect(contentResponse.status).toBe(200);
    expect(contentResponse.text).toContain('<h1>Foundations</h1>');

    const topicResponse = await request(app)
      .get(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(topicResponse.status).toBe(200);
    expect(topicResponse.body.topic.contentHtml).toContain('<h1>Foundations</h1>');

    const progressResponse = await request(app)
      .patch(`/api/topics/${topicId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isCompleted: true });

    expect(progressResponse.status).toBe(200);
    expect(progressResponse.body.topic.isCompleted).toBe(true);
    expect(progressResponse.body.guide.progressPercentage).toBe(20);
  });

  it('stores the static fallback illustration URL on guide creation', async () => {
    setAiMocks({
      generateOutline: async () => ({
        title: 'Fallback Illustration Guide',
        tags: ['General', 'Learning'],
        overview: null,
        learningOutcomes: null,
        sections: [
          {
            title: 'Foundations',
            description: 'Learn the basic ideas that support the rest of the subject.',
            items: [{ importance: 'Required', title: 'Core idea', overview: null, details: null }],
          },
        ],
      }),
      generateGuideIllustration: async () => '/static/guide-illustrations/generic-guide.svg',
    });

    const token = await registerUser('fallback@example.com');
    const response = await request(app)
      .post('/api/guides')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'teach me fallback illustration behavior', ageLevel: 'adult_beginner' });

    expect(response.status).toBe(200);
    const lines = response.text.trim().split('\n').filter(Boolean);
    const { guide: doneGuide } = JSON.parse(lines[lines.length - 1]);

    // Illustration is set asynchronously after POST completes — fetch guide to verify
    const guideRes = await request(app)
      .get(`/api/guides/${doneGuide.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(guideRes.body.guide.illustrationUrl).toBe('/static/guide-illustrations/generic-guide.svg');
  });

  it('returns the static fallback when image generation is unavailable', async () => {
    const originalFalKey = config.falKey;
    config.falKey = '';
    setAiMocks({});

    let illustrationUrl;
    try {
      illustrationUrl = await aiService.generateGuideIllustration({
        guideId: 'guide_test',
        outline: {
          title: 'Matrix Multiplication',
          tags: ['Math', 'Linear Algebra'],
          sections: [{ title: 'Rows and columns' }],
        },
        prompt: 'teach me matrix multiplication',
      });
    } finally {
      config.falKey = originalFalKey;
    }

    expect(illustrationUrl).toBe('/static/guide-illustrations/generic-guide.svg');
  });
});
