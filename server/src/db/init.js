const db = require('./index');
const schema = require('./schema');

function initDb() {
  db.exec(schema);
}

module.exports = { initDb };
