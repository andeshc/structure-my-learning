const { query, getOne, getAll } = require('./index');
const { touchGuide } = require('./guides');

function toTopic(row) {
  if (!row) return null;
  return {
    id: row.id,
    guideId: row.guide_id,
    position: row.position,
    title: row.title,
    description: row.description,
    contentMarkdown: row.content_markdown,
    contentHtml: row.content_html,
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at,
    hasContent: Boolean(row.content_html || row.content_markdown),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTopicsForGuide(guideId) {
  const rows = await getAll(
    `SELECT * FROM topics WHERE guide_id = $1 ORDER BY position ASC`,
    [guideId]
  );
  return rows.map(toTopic);
}

async function findTopicForUser(topicId, userId) {
  const row = await getOne(
    `SELECT t.*, g.user_id, g.id AS guide_id, g.title AS guide_title,
            g.prompt AS guide_prompt, g.age_level, g.outline_json
     FROM topics t
     JOIN guides g ON g.id = t.guide_id
     WHERE t.id = $1 AND g.user_id = $2`,
    [topicId, userId]
  );
  if (!row) return null;
  return {
    topic: toTopic(row),
    guide: {
      id: row.guide_id,
      title: row.guide_title,
      prompt: row.guide_prompt,
      ageLevel: row.age_level,
      outline: row.outline_json ? JSON.parse(row.outline_json) : null,
    },
  };
}

async function saveTopicContent(topicId, contentMarkdown) {
  await query(
    `UPDATE topics SET content_markdown = $1, updated_at = NOW() WHERE id = $2`,
    [contentMarkdown, topicId]
  );
}

async function saveTopicContentHtml(topicId, contentHtml) {
  await query(
    `UPDATE topics SET content_html = $1, updated_at = NOW() WHERE id = $2`,
    [contentHtml, topicId]
  );
}

async function updateTopicProgress(topicId, isCompleted) {
  const completedAt = isCompleted ? new Date().toISOString() : null;
  await query(
    `UPDATE topics SET is_completed = $1, completed_at = $2, updated_at = NOW() WHERE id = $3`,
    [isCompleted ? 1 : 0, completedAt, topicId]
  );
  const topic = await getOne('SELECT * FROM topics WHERE id = $1', [topicId]);
  if (topic) await touchGuide(topic.guide_id);
  return toTopic(topic);
}

module.exports = {
  findTopicForUser,
  listTopicsForGuide,
  saveTopicContent,
  saveTopicContentHtml,
  updateTopicProgress,
};
