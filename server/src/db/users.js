const db = require('./index');
const ids = require('../utils/ids');

function toUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createPasswordUser({ name, email, passwordHash }) {
  const user = {
    id: ids.userId(),
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
  };

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash)
    VALUES (@id, @name, @email, @password_hash)
  `).run(user);

  return findUserById(user.id);
}

function createOAuthUser({ name, email, avatarUrl }) {
  const user = {
    id: ids.userId(),
    name,
    email: email.toLowerCase(),
    avatar_url: avatarUrl || null,
  };

  db.prepare(`
    INSERT INTO users (id, name, email, avatar_url)
    VALUES (@id, @name, @email, @avatar_url)
  `).run(user);

  return findUserById(user.id);
}

function findUserByEmail(email) {
  return toUser(db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()));
}

function findUserById(id) {
  return toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
}

function findOAuthAccount(provider, providerUserId) {
  return db.prepare(`
    SELECT oa.*, u.name, u.email, u.avatar_url, u.created_at, u.updated_at
    FROM oauth_accounts oa
    JOIN users u ON u.id = oa.user_id
    WHERE oa.provider = ? AND oa.provider_user_id = ?
  `).get(provider, providerUserId);
}

function linkOAuthAccount({ userId, provider, providerUserId, providerEmail }) {
  db.prepare(`
    INSERT OR IGNORE INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email)
    VALUES (?, ?, ?, ?, ?)
  `).run(ids.oauthId(), userId, provider, providerUserId, providerEmail || null);
}

function listProviders(userId) {
  const providers = [];
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);

  if (user && user.password_hash) {
    providers.push('password');
  }

  const oauthProviders = db.prepare(`
    SELECT provider FROM oauth_accounts WHERE user_id = ? ORDER BY provider
  `).all(userId).map((row) => row.provider);

  return providers.concat(oauthProviders);
}

module.exports = {
  createOAuthUser,
  createPasswordUser,
  findOAuthAccount,
  findUserByEmail,
  findUserById,
  linkOAuthAccount,
  listProviders,
};
