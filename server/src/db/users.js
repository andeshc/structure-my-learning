import { db } from './index.js';

const publicUserColumns = `
  id,
  name,
  email,
  avatar_url AS avatarUrl,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export function createUser({ id, name, email, passwordHash = null, avatarUrl = null }) {
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, avatar_url)
     VALUES (@id, @name, @email, @passwordHash, @avatarUrl)`
  ).run({ id, name, email: email.toLowerCase(), passwordHash, avatarUrl });

  return findUserById(id);
}

export function findUserByEmail(email) {
  return db.prepare(
    `SELECT ${publicUserColumns}, password_hash AS passwordHash
     FROM users
     WHERE email = ?`
  ).get(email.toLowerCase());
}

export function findUserById(id) {
  return db.prepare(
    `SELECT ${publicUserColumns}
     FROM users
     WHERE id = ?`
  ).get(id);
}

export function findUserWithPasswordById(id) {
  return db.prepare(
    `SELECT ${publicUserColumns}, password_hash AS passwordHash
     FROM users
     WHERE id = ?`
  ).get(id);
}

export function upsertOAuthUser({ id, provider, providerUserId, email, name, avatarUrl }) {
  const normalizedEmail = email || `${providerUserId}@${provider}.oauth.local`;
  const existingAccount = db.prepare(
    `SELECT user_id AS userId
     FROM oauth_accounts
     WHERE provider = ? AND provider_user_id = ?`
  ).get(provider, providerUserId);

  if (existingAccount) {
    return findUserById(existingAccount.userId);
  }

  const existingUser = findUserByEmail(normalizedEmail);
  const userId = existingUser?.id || id;

  const transaction = db.transaction(() => {
    if (!existingUser) {
      createUser({ id: userId, name, email: normalizedEmail, avatarUrl });
    }

    db.prepare(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email)
       VALUES (@accountId, @userId, @provider, @providerUserId, @email)`
    ).run({
      accountId: `${provider}_${providerUserId}`,
      userId,
      provider,
      providerUserId,
      email: normalizedEmail
    });
  });

  transaction();
  return findUserById(userId);
}

export function listUserProviders(userId) {
  const oauthProviders = db.prepare(
    `SELECT provider
     FROM oauth_accounts
     WHERE user_id = ?
     ORDER BY provider`
  ).all(userId).map((row) => row.provider);

  const user = findUserWithPasswordById(userId);
  return [user?.passwordHash ? 'password' : null, ...oauthProviders].filter(Boolean);
}
