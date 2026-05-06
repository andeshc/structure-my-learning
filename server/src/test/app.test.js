import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { setAiMocks } from '../services/ai.service.js';

function resetDatabase() {
  db.exec(`
    DELETE FROM refresh_tokens;
    DELETE FROM oauth_accounts;
    DELETE FROM topics;
    DELETE FROM guides;
    DELETE FROM users;
  `);
}

async function registerUser(app, email = 'test@example.com') {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'password123' });

  return {
    accessToken: response.body.accessToken,
    cookies: response.headers['set-cookie']
  };
}

describe('API', () => {
  let app;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    app = createApp();
    resetDatabase();
    setAiMocks({
      outlineGenerator: async () => ({
        title: 'Mock Learning Guide',
        topics: [
          { title: 'Topic One', description: 'Understand the first foundational topic in this guide.' },
          { title: 'Topic Two', description: 'Understand the second topic and how it builds context.' },
          { title: 'Topic Three', description: 'Understand the third topic with practical framing.' },
          { title: 'Topic Four', description: 'Understand the fourth topic through applied examples.' },
          { title: 'Topic Five', description: 'Understand the final topic and summarize the learning path.' }
        ]
      }),
      topicContentGenerator: async ({ topic }) => ({
        contentMarkdown: `# ${topic.title}\n\nThis is a complete mocked lesson with enough content to satisfy validation. It explains the idea, gives an analogy, includes examples, and closes with a useful summary for the learner. `.repeat(8)
      })
    });
  });

  afterEach(() => {
    resetDatabase();
    setAiMocks({});
  });

  it('returns health status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'structure-my-learning' });
  });

  it('registers, refreshes, and protects account routes', async () => {
    const registered = await registerUser(app);

    expect(registered.accessToken).toBeTruthy();

    const accountResponse = await request(app)
      .get('/api/account')
      .set('Authorization', `Bearer ${registered.accessToken}`);
    expect(accountResponse.status).toBe(200);
    expect(accountResponse.body.user.email).toBe('test@example.com');

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', registered.cookies);
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeTruthy();
  });

  it('creates a guide, generates topic content, and updates progress', async () => {
    const { accessToken } = await registerUser(app, 'guide@example.com');

    const guideResponse = await request(app)
      .post('/api/guides')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt: 'teach me mocked testing' });

    expect(guideResponse.status).toBe(201);
    expect(guideResponse.body.guide.topics).toHaveLength(5);

    const topicId = guideResponse.body.guide.topics[0].id;
    const topicResponse = await request(app)
      .get(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(topicResponse.status).toBe(200);
    expect(topicResponse.body.topic.contentMarkdown).toContain('# Topic One');

    const progressResponse = await request(app)
      .patch(`/api/topics/${topicId}/progress`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isCompleted: true });
    expect(progressResponse.status).toBe(200);
    expect(progressResponse.body.topic.isCompleted).toBe(true);
  });
});
