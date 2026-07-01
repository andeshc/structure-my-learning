const { query, getOne } = require('./index');

async function getInProgressSubtopicId(userId, guideId) {
  const row = await getOne(
    'SELECT in_progress_subtopic_id FROM guide_reading_progress WHERE user_id = $1 AND guide_id = $2',
    [userId, guideId]
  );
  return row?.in_progress_subtopic_id ?? null;
}

async function setInProgressSubtopic(userId, guideId, subtopicId) {
  await query(
    `INSERT INTO guide_reading_progress (user_id, guide_id, in_progress_subtopic_id, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, guide_id) DO UPDATE SET in_progress_subtopic_id = $3, updated_at = NOW()`,
    [userId, guideId, subtopicId]
  );
}

async function clearInProgressSubtopic(userId, guideId) {
  await query(
    `UPDATE guide_reading_progress SET in_progress_subtopic_id = NULL, updated_at = NOW()
     WHERE user_id = $1 AND guide_id = $2`,
    [userId, guideId]
  );
}

module.exports = {
  getInProgressSubtopicId,
  setInProgressSubtopic,
  clearInProgressSubtopic,
};
