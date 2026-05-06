import request from 'supertest';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const app = require('./app');
const db = require('./db');
const { initDb } = require('./db/init');
const { setAiMocks } = require('./services/ai.service');

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
        topics: [
          { title: 'Foundations', description: 'Learn the basic ideas that support the rest of the subject.' },
          { title: 'Key Vocabulary', description: 'Understand the core terms used when discussing this topic.' },
          { title: 'Main Process', description: 'Explore how the central process works step by step.' },
          { title: 'Examples', description: 'See concrete examples that make the ideas easier to apply.' },
          { title: 'Review', description: 'Summarize the topic and connect it to future learning.' },
        ],
      }),
      generateTopicContent: async ({ topic }) => ({
        contentMarkdown: `# ${topic.title}\n\nThis lesson explains the concept with examples, analogies, and a summary. `.repeat(14),
      }),
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
});
