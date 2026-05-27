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
const contactRouter = require('./routes/contact.routes');
const geoRouter = require('./routes/geo.routes');
const adminRouter = require('./routes/admin.routes');
const shareRouter = require('./routes/share.routes');
const guidesDb = require('./db/guides');
const { requireAuth } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/admin');
const { aiRateLimit, authRateLimit } = require('./middleware/rateLimit');
const passport = require('./passport');

const app = express();

app.set('trust proxy', 1);

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
app.use('/api/contact', authRateLimit, contactRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.use('/api/share', shareRouter);
app.use('/api', geoRouter);
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Serve built client in production
const distPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(distPath)) {
  function escAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  app.get('/share/:token', async (req, res) => {
    try {
      const guide = await guidesDb.findGuideByShareToken(req.params.token);
      const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
      if (!guide) return res.send(indexHtml);
      const title = `${guide.title} | StructureMyLearning`;
      const desc = `Learn "${guide.title}" — an AI-generated structured guide, shared by ${guide.ownerName}.`;
      const illustrationUrl = escAttr(guide.illustrationUrl || 'https://structuremylearning.com/og-image.png');
      const shareUrl = escAttr(`${config.appUrl}/share/${req.params.token}`);
      const injected = indexHtml
        .replace(/<title>[^<]*<\/title>/, `<title>${escAttr(title)}</title>`)
        .replace(/(<meta name="description"\s+content=")[^"]*(")/,         `$1${escAttr(desc)}$2`)
        .replace(/(<meta property="og:url"\s+content=")[^"]*(")/,          `$1${shareUrl}$2`)
        .replace(/(<meta property="og:title"\s+content=")[^"]*(")/,        `$1${escAttr(title)}$2`)
        .replace(/(<meta property="og:description"\s+content=")[^"]*(")/,  `$1${escAttr(desc)}$2`)
        .replace(/(<meta property="og:image"\s+content=")[^"]*(")/,        `$1${illustrationUrl}$2`)
        .replace(/(<meta property="og:image:width"\s+content=")[^"]*(")/,  '$11200$2')
        .replace(/(<meta property="og:image:height"\s+content=")[^"]*(")/,  '$1630$2')
        .replace(/(<meta property="og:image:alt"\s+content=")[^"]*(")/,    `$1${escAttr(title)}$2`)
        .replace(/(<meta name="twitter:title"\s+content=")[^"]*(")/,       `$1${escAttr(title)}$2`)
        .replace(/(<meta name="twitter:description"\s+content=")[^"]*(")/,  `$1${escAttr(desc)}$2`)
        .replace(/(<meta name="twitter:image"\s+content=")[^"]*(")/,       `$1${illustrationUrl}$2`)
        .replace(/(<meta name="twitter:image:alt"\s+content=")[^"]*(")/,   `$1${escAttr(title)}$2`);
      res.send(injected);
    } catch {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });

  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
