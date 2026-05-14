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
        sections: [
          {
            title: 'Foundations',
            description: 'Learn the basic ideas that support the rest of the subject.',
            items: [
              { importance: 'Required', title: 'Core idea' },
              { importance: 'Optional but recommended', title: 'Helpful context', details: ['A useful example'] },
            ],
          },
          {
            title: 'Key Vocabulary',
            description: 'Understand the core terms used when discussing this topic.',
            items: [{ importance: 'Required', title: 'Important terms' }],
          },
          {
            title: 'Main Process',
            description: 'Explore how the central process works step by step.',
            items: [{ importance: 'Required', title: 'Step-by-step flow' }],
          },
          {
            title: 'Examples',
            description: 'See concrete examples that make the ideas easier to apply.',
            items: [{ importance: 'Optional and can be skipped', title: 'Extra worked example' }],
          },
          {
            title: 'Review',
            description: 'Summarize the topic and connect it to future learning.',
            items: [{ importance: 'Required', title: 'Final synthesis' }],
          },
        ],
      }),
      generateTopicContent: async ({ topic }) => ({
        contentMarkdown: `# ${topic.title}\n\nThis lesson explains the concept with examples, analogies, and a summary. `.repeat(14),
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

    expect(guideResponse.status).toBe(201);
    expect(guideResponse.body.guide.topics).toHaveLength(5);
    expect(guideResponse.body.guide.illustrationUrl).toMatch(/^\/generated\/guide-illustrations\/.+\.png$/);
    expect(guideResponse.body.guide.outline.tags).toEqual(['Learning', 'Mocked']);
    expect(guideResponse.body.guide.outline.sections[0].items[0].importance).toBe('Required');

    const topicId = guideResponse.body.guide.topics[0].id;
    const topicResponse = await request(app)
      .get(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(topicResponse.status).toBe(200);
    expect(topicResponse.body.topic.contentMarkdown).toContain('# Foundations');

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
        sections: [
          {
            title: 'Foundations',
            description: 'Learn the basic ideas that support the rest of the subject.',
            items: [{ importance: 'Required', title: 'Core idea' }],
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

    expect(response.status).toBe(201);
    expect(response.body.guide.illustrationUrl).toBe('/static/guide-illustrations/generic-guide.svg');
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
