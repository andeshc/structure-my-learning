const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const errorHandler = require('./middleware/error');
const healthRouter = require('./routes/health.routes');
const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');
const guidesRouter = require('./routes/guides.routes');
const topicsRouter = require('./routes/topics.routes');
const { requireAuth } = require('./middleware/auth');
const { aiRateLimit, authRateLimit } = require('./middleware/rateLimit');
const passport = require('./passport');

const app = express();

app.use(cors({
  origin: config.clientUrl.split(',').map(u => u.trim()),
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(passport.initialize());

app.use('/generated', express.static(path.join(__dirname, '../public/generated')));
app.use('/static', express.static(path.join(__dirname, '../public/static')));

app.use('/api', healthRouter);
app.use('/api/auth', authRateLimit, authRouter);
app.use('/api/account', requireAuth, accountRouter);
app.use('/api/guides', requireAuth, aiRateLimit, guidesRouter);
app.use('/api/topics', requireAuth, aiRateLimit, topicsRouter);
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Serve built client in production
const distPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
