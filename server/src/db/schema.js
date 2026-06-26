const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  referral_source TEXT,
  referral_source_other TEXT,
  guides_created_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (email <> '')
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'apple', 'facebook', 'linkedin', 'microsoft')),
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  learning_level TEXT NOT NULL DEFAULT 'adult_beginner' CHECK (learning_level IN ('early_learner', 'young_child', 'middle_schooler', 'high_schooler', 'adult_beginner', 'adult_intermediate', 'adult_advanced')),
  coverage TEXT NOT NULL DEFAULT 'balanced' CHECK (coverage IN ('overview', 'balanced', 'comprehensive')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'ready', 'failed')),
  outline_json TEXT,
  illustration_path TEXT,
  share_token TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  clarifications JSONB,
  free_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  guide_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_markdown TEXT,
  content_html TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guide_id, position),
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subtopics (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  completed_at TIMESTAMPTZ,
  dev_status TEXT NOT NULL DEFAULT 'pending' CHECK (dev_status IN ('pending', 'developing', 'ready', 'failed')),
  locked_at TIMESTAMPTZ,
  illustration_urls TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (topic_id, position),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shared_guide_views (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL,
  subtopic_id TEXT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, share_token, subtopic_id)
);

CREATE TABLE IF NOT EXISTS guide_adoptions (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guide_id    TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL,
  adopted_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, guide_id)
);

CREATE TABLE IF NOT EXISTS subtopic_progress (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtopic_id  TEXT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, subtopic_id)
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guides_user_updated ON guides(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_guide_position ON topics(guide_id, position);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_position ON subtopics(topic_id, position);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_adoptions_user ON guide_adoptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subtopic_progress_user ON subtopic_progress(user_id, subtopic_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  product_id TEXT NOT NULL,
  customer_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ltd_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ltd_seat_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  seats_sold INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name <> ''),
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_guides (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  guide_id      TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, guide_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_user_position ON collections(user_id, position);
CREATE INDEX IF NOT EXISTS idx_collection_guides_collection ON collection_guides(collection_id, position);
CREATE INDEX IF NOT EXISTS idx_collection_guides_guide ON collection_guides(guide_id);
`;

module.exports = schema;
