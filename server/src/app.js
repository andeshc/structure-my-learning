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
const { requireAuth } = require('./middleware/auth');
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

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/account', requireAuth, accountRouter);

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
