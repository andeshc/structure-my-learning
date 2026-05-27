// Railway has no IPv6 outbound — force all DNS lookups to prefer IPv4
require('dns').setDefaultResultOrder('ipv4first');

const { initDb } = require('./db/init');
const config = require('./config');
const app = require('./app');
const subtopicsDb = require('./db/subtopics');
const guideDeveloper = require('./services/guide-developer');

(async () => {
  await initDb();
  await subtopicsDb.resetAllDevelopingOnStartup();
  const pending = await subtopicsDb.getGuidesWithPendingWork();
  pending.forEach((id) =>
    guideDeveloper.developGuide(id).catch((err) => console.error('[guide-developer] startup resume:', err.message))
  );
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${config.port}`);
  });
})();
