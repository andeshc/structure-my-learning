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
}

module.exports = { initDb };
