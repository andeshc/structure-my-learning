#!/usr/bin/env node
// One-time migration: SQLite → PostgreSQL
// Usage: DATABASE_PATH=../data/StructureMyLearning.db DATABASE_URL=postgres://... node scripts/migrate-sqlite-to-postgres.js
'use strict';

require('dotenv').config();
const path = require('path');
const SQLite = require('better-sqlite3');
const { Pool } = require('pg');

const dbPath = process.env.DATABASE_PATH;
const dbUrl = process.env.DATABASE_URL;

if (!dbPath || !dbUrl) {
  console.error('Both DATABASE_PATH and DATABASE_URL must be set.');
  process.exit(1);
}

const sqlite = new SQLite(path.resolve(dbPath));
const pg = new Pool({ connectionString: dbUrl });

async function migrate() {
  const client = await pg.connect();
  try {
    // users
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`Migrating ${users.length} users…`);
    for (const r of users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, avatar_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
        [r.id, r.name, r.email, r.password_hash, r.avatar_url, r.created_at, r.updated_at]
      );
    }

    // oauth_accounts
    const oauth = sqlite.prepare('SELECT * FROM oauth_accounts').all();
    console.log(`Migrating ${oauth.length} oauth_accounts…`);
    for (const r of oauth) {
      await client.query(
        `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
        [r.id, r.user_id, r.provider, r.provider_user_id, r.provider_email, r.created_at, r.updated_at]
      );
    }

    // refresh_tokens
    const tokens = sqlite.prepare('SELECT * FROM refresh_tokens').all();
    console.log(`Migrating ${tokens.length} refresh_tokens…`);
    for (const r of tokens) {
      await client.query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [r.id, r.user_id, r.token_hash, r.expires_at, r.revoked_at, r.created_at]
      );
    }

    // guides
    const guides = sqlite.prepare('SELECT * FROM guides').all();
    console.log(`Migrating ${guides.length} guides…`);
    for (const r of guides) {
      await client.query(
        `INSERT INTO guides (id, user_id, title, prompt, age_level, status, outline_json, illustration_path, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
        [r.id, r.user_id, r.title, r.prompt, r.age_level, r.status, r.outline_json, r.illustration_path, r.created_at, r.updated_at]
      );
    }

    // topics
    const topics = sqlite.prepare('SELECT * FROM topics').all();
    console.log(`Migrating ${topics.length} topics…`);
    for (const r of topics) {
      await client.query(
        `INSERT INTO topics (id, guide_id, position, title, description, content_markdown, content_html, is_completed, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT DO NOTHING`,
        [r.id, r.guide_id, r.position, r.title, r.description, r.content_markdown, r.content_html, r.is_completed, r.completed_at, r.created_at, r.updated_at]
      );
    }

    // subtopics
    const subtopics = sqlite.prepare('SELECT * FROM subtopics').all();
    console.log(`Migrating ${subtopics.length} subtopics…`);
    for (const r of subtopics) {
      await client.query(
        `INSERT INTO subtopics (id, topic_id, position, title, content_html, is_completed, completed_at, dev_status, locked_at, illustration_urls, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING`,
        [r.id, r.topic_id, r.position, r.title, r.content_html, r.is_completed, r.completed_at, r.dev_status, r.locked_at, r.illustration_urls, r.created_at, r.updated_at]
      );
    }

    console.log('Migration complete.');
  } finally {
    client.release();
    await pg.end();
    sqlite.close();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
