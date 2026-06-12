const { query, getOne, getAll } = require('./index');
const ids = require('../utils/ids');

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url,
    emailVerified: row.email_verified,
    signupProvider: row.signup_provider,
    referralSource: row.referral_source,
    referralSourceOther: row.referral_source_other,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createPasswordUser({ name, email, passwordHash, referralSource, referralSourceOther }) {
  const row = await getOne(
    `INSERT INTO users (id, name, email, password_hash, signup_provider, referral_source, referral_source_other)
     VALUES ($1, $2, $3, $4, 'password', $5, $6) RETURNING id`,
    [ids.userId(), name, email.toLowerCase(), passwordHash, referralSource || null, referralSourceOther || null]
  );
  return findUserById(row.id);
}

async function createOAuthUser({ provider, name, email, avatarUrl }) {
  const row = await getOne(
    `INSERT INTO users (id, name, email, avatar_url, signup_provider, email_verified) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
    [ids.userId(), name, email.toLowerCase(), avatarUrl || null, provider]
  );
  return findUserById(row.id);
}

async function markUserVerified(id) {
  await query(`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
}

async function findUserByEmail(email) {
  return toUser(await getOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]));
}

async function findUserById(id) {
  return toUser(await getOne('SELECT * FROM users WHERE id = $1', [id]));
}

async function findOAuthAccount(provider, providerUserId) {
  return getOne(
    `SELECT oa.*, u.name, u.email, u.avatar_url, u.created_at, u.updated_at
     FROM oauth_accounts oa
     JOIN users u ON u.id = oa.user_id
     WHERE oa.provider = $1 AND oa.provider_user_id = $2`,
    [provider, providerUserId]
  );
}

async function linkOAuthAccount({ userId, provider, providerUserId, providerEmail }) {
  await query(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [ids.oauthId(), userId, provider, providerUserId, providerEmail || null]
  );
}

async function listProviders(userId) {
  const providers = [];
  const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (user && user.password_hash) providers.push('password');

  const oauthProviders = await getAll(
    `SELECT provider FROM oauth_accounts WHERE user_id = $1 ORDER BY provider`,
    [userId]
  );
  return providers.concat(oauthProviders.map((r) => r.provider));
}

async function updateUserSetup(id, { name, referralSource, referralSourceOther, passwordHash }) {
  await query(
    `UPDATE users SET name=$1, referral_source=$2, referral_source_other=$3,
      password_hash=COALESCE($4, password_hash), updated_at=NOW() WHERE id=$5`,
    [name, referralSource, referralSourceOther || null, passwordHash || null, id]
  );
  return findUserById(id);
}

async function updateUserProfile(id, { name, passwordHash }) {
  await query(
    `UPDATE users SET name=COALESCE($1, name),
      password_hash=COALESCE($2, password_hash), updated_at=NOW() WHERE id=$3`,
    [name || null, passwordHash || null, id]
  );
  return findUserById(id);
}

module.exports = {
  createOAuthUser,
  createPasswordUser,
  findOAuthAccount,
  findUserByEmail,
  findUserById,
  linkOAuthAccount,
  listProviders,
  markUserVerified,
  updateUserSetup,
  updateUserProfile,
};
