const { query, getOne } = require('./index');

async function recordView(userId, shareToken, subtopicId) {
  await query(
    `INSERT INTO shared_guide_views (user_id, share_token, subtopic_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userId, shareToken, subtopicId]
  );
}

async function getViewCount(userId, shareToken) {
  const row = await getOne(
    `SELECT COUNT(*) AS count FROM shared_guide_views WHERE user_id = $1 AND share_token = $2`,
    [userId, shareToken]
  );
  return Number(row?.count ?? 0);
}

async function hasViewedSubtopic(userId, shareToken, subtopicId) {
  const row = await getOne(
    `SELECT 1 FROM shared_guide_views WHERE user_id = $1 AND share_token = $2 AND subtopic_id = $3`,
    [userId, shareToken, subtopicId]
  );
  return !!row;
}

async function getExistingAdoption(userId, guideId) {
  return getOne(
    `SELECT guide_id FROM guide_adoptions WHERE user_id = $1 AND guide_id = $2`,
    [userId, guideId]
  );
}

async function recordAdoption(userId, guideId, shareToken) {
  await query(
    `INSERT INTO guide_adoptions (user_id, guide_id, share_token)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userId, guideId, shareToken]
  );
}

module.exports = { recordView, getViewCount, hasViewedSubtopic, getExistingAdoption, recordAdoption };
