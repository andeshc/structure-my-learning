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
  if (uc.length && !uc.includes('referral_source')) {
    await query('ALTER TABLE users ADD COLUMN referral_source TEXT');
    await query('ALTER TABLE users ADD COLUMN referral_source_other TEXT');
  }

  const gc = await cols('guides');
  if (gc.length && !gc.includes('age_level')) {
    await query(`ALTER TABLE guides ADD COLUMN age_level TEXT NOT NULL DEFAULT 'adult_beginner'
      CHECK (age_level IN ('ages_8_10', 'ages_11_13', 'ages_14_17', 'adult_beginner', 'adult_advanced'))`);
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
}

module.exports = { initDb };
