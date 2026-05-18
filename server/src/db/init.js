const db = require('./index');
const schema = require('./schema');

function initDb() {
  db.exec(schema);

  const guideColumns = db.prepare('PRAGMA table_info(guides)').all().map((column) => column.name);

  if (guideColumns.length > 0 && !guideColumns.includes('age_level')) {
    db.exec(`
      ALTER TABLE guides
      ADD COLUMN age_level TEXT NOT NULL DEFAULT 'adult_beginner'
        CHECK (age_level IN ('ages_8_10', 'ages_11_13', 'ages_14_17', 'adult_beginner', 'adult_advanced'))
    `);
  }

  if (guideColumns.length > 0 && !guideColumns.includes('outline_json')) {
    db.exec('ALTER TABLE guides ADD COLUMN outline_json TEXT');
  }

  if (guideColumns.length > 0 && !guideColumns.includes('illustration_path')) {
    db.exec('ALTER TABLE guides ADD COLUMN illustration_path TEXT');
  }

  if (guideColumns.length > 0 && !guideColumns.includes('status')) {
    db.exec(`ALTER TABLE guides ADD COLUMN status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'ready', 'failed'))`);
  }

  const topicColumns = db.prepare('PRAGMA table_info(topics)').all().map((column) => column.name);
  if (topicColumns.length > 0 && !topicColumns.includes('content_html')) {
    db.exec('ALTER TABLE topics ADD COLUMN content_html TEXT');
  }

  const subtopicColumns = db.prepare('PRAGMA table_info(subtopics)').all().map((c) => c.name);
  if (subtopicColumns.length > 0 && !subtopicColumns.includes('is_completed')) {
    db.exec('ALTER TABLE subtopics ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0');
    db.exec('ALTER TABLE subtopics ADD COLUMN completed_at TEXT');
  }
  if (subtopicColumns.length > 0 && !subtopicColumns.includes('dev_status')) {
    db.exec(`ALTER TABLE subtopics ADD COLUMN dev_status TEXT NOT NULL DEFAULT 'pending' CHECK (dev_status IN ('pending', 'developing', 'ready', 'failed'))`);
    db.exec(`ALTER TABLE subtopics ADD COLUMN locked_at TEXT`);
    db.exec(`UPDATE subtopics SET dev_status = 'ready' WHERE content_html IS NOT NULL`);
  }
}

module.exports = { initDb };
