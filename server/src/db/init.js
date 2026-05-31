const { query, getAll } = require('./index');
const schema = require('./schema');

async function cols(table) {
  const rows = await getAll(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table]
  );
  return rows.map((r) => r.column_name);
}

async function initDb() {
  await query(schema);

  const uc = await cols('users');
  if (uc.length && !uc.includes('email_verified')) {
    await query(`ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE`);
    // Existing OAuth users are already verified via their provider
    await query(`
      UPDATE users SET email_verified = TRUE
      WHERE id IN (SELECT user_id FROM oauth_accounts)
    `);
    // Existing password users who are already in the system: treat as verified
    // (only new signups after this migration go through verification)
    await query(`UPDATE users SET email_verified = TRUE WHERE signup_provider = 'password'`);
  }
  if (uc.length && !uc.includes('referral_source')) {
    await query('ALTER TABLE users ADD COLUMN referral_source TEXT');
    await query('ALTER TABLE users ADD COLUMN referral_source_other TEXT');
  }
  if (uc.length && !uc.includes('signup_provider')) {
    await query(`ALTER TABLE users ADD COLUMN signup_provider TEXT NOT NULL DEFAULT 'password'`);
    await query(`
      UPDATE users u SET signup_provider = oa.provider
      FROM oauth_accounts oa
      WHERE oa.user_id = u.id
    `);
  }

  const gc = await cols('guides');
  if (gc.length && gc.includes('age_level') && !gc.includes('learning_level')) {
    await query(`ALTER TABLE guides RENAME COLUMN age_level TO learning_level`);
    await query(`ALTER TABLE guides DROP CONSTRAINT IF EXISTS guides_age_level_check`);
    await query(`UPDATE guides SET learning_level = CASE learning_level
      WHEN 'ages_8_10'  THEN 'young_child'
      WHEN 'ages_11_13' THEN 'middle_schooler'
      WHEN 'ages_14_17' THEN 'high_schooler'
      ELSE learning_level END`);
    await query(`ALTER TABLE guides ADD CONSTRAINT guides_learning_level_check
      CHECK (learning_level IN ('early_learner','young_child','middle_schooler','high_schooler','adult_beginner','adult_intermediate','adult_advanced'))`);
  }
  if (gc.length && !gc.includes('coverage')) {
    await query(`ALTER TABLE guides ADD COLUMN coverage TEXT NOT NULL DEFAULT 'balanced'
      CHECK (coverage IN ('overview', 'balanced', 'comprehensive'))`);
  }
  if (gc.length && !gc.includes('outline_json')) {
    await query('ALTER TABLE guides ADD COLUMN outline_json TEXT');
  }
  if (gc.length && !gc.includes('illustration_path')) {
    await query('ALTER TABLE guides ADD COLUMN illustration_path TEXT');
  }
  if (gc.length && !gc.includes('status')) {
    await query(`ALTER TABLE guides ADD COLUMN status TEXT NOT NULL DEFAULT 'ready'
      CHECK (status IN ('pending', 'ready', 'failed'))`);
  }
  if (gc.length && !gc.includes('needs_review')) {
    await query(`ALTER TABLE guides ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT FALSE`);
  }
  if (gc.length && !gc.includes('share_token')) {
    await query(`ALTER TABLE guides ADD COLUMN share_token TEXT UNIQUE`);
  }
  if (gc.length && !gc.includes('is_public')) {
    await query(`ALTER TABLE guides ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false`);
  }
  if (gc.length && !gc.includes('tokens_in')) {
    await query(`ALTER TABLE guides ADD COLUMN tokens_in INTEGER NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE guides ADD COLUMN tokens_out INTEGER NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE guides ADD COLUMN cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0`);
  }
  // Allow guides.user_id to be NULL for tombstoned guides (owner deleted, adopters retain access)
  if (gc.length) {
    await query(`ALTER TABLE guides ALTER COLUMN user_id DROP NOT NULL`);
  }

  if (uc.length && !uc.includes('guides_created_count')) {
    await query(`ALTER TABLE users ADD COLUMN guides_created_count INTEGER NOT NULL DEFAULT 0`);
    await query(`
      UPDATE users SET guides_created_count = (
        SELECT COUNT(*) FROM guides WHERE user_id = users.id
      )
    `);
  }

  const tc = await cols('topics');
  if (tc.length && !tc.includes('content_html')) {
    await query('ALTER TABLE topics ADD COLUMN content_html TEXT');
  }

  const sc = await cols('subtopics');
  if (sc.length && !sc.includes('is_completed')) {
    await query('ALTER TABLE subtopics ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0');
    await query('ALTER TABLE subtopics ADD COLUMN completed_at TIMESTAMPTZ');
  }
  if (sc.length && !sc.includes('dev_status')) {
    await query(`ALTER TABLE subtopics ADD COLUMN dev_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (dev_status IN ('pending', 'developing', 'ready', 'failed'))`);
    await query('ALTER TABLE subtopics ADD COLUMN locked_at TIMESTAMPTZ');
    await query(`UPDATE subtopics SET dev_status = 'ready' WHERE content_html IS NOT NULL`);
  }
  if (sc.length && !sc.includes('illustration_urls')) {
    await query('ALTER TABLE subtopics ADD COLUMN illustration_urls TEXT');
  }

  // Seed subtopic_progress from legacy subtopics.is_completed (one-time, idempotent)
  const spc = await cols('subtopic_progress');
  if (!spc.length) {
    await query(`
      INSERT INTO subtopic_progress (user_id, subtopic_id, is_completed, completed_at)
      SELECT g.user_id, s.id, true, s.completed_at
      FROM subtopics s
      JOIN topics t ON t.id = s.topic_id
      JOIN guides g ON g.id = t.guide_id
      WHERE s.is_completed = 1
      ON CONFLICT DO NOTHING
    `);
  }
}

module.exports = { initDb };
