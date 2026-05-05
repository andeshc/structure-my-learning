const { initDb } = require('./db/init');
const config = require('./config');
const app = require('./app');

initDb();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${config.port}`);
});
