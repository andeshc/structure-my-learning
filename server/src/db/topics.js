const { query, getOne, getAll } = require('./index');

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

// { isAdmin } bypasses the ownership/adoption gate so an admin can read any topic.
async function findTopicForUser(topicId, userId, { isAdmin = false } = {}) {
  const accessClause = isAdmin
    ? 'TRUE'
    : `(g.user_id = $2 OR EXISTS (
         SELECT 1 FROM guide_adoptions WHERE guide_id = g.id AND user_id = $2
       ))`;
  // Only bind $2 when the access clause references it — the admin bypass uses TRUE
  // and would otherwise supply an unused parameter (Postgres rejects this).
  const params = isAdmin ? [topicId] : [topicId, userId];
  const row = await getOne(
    `SELECT t.*, g.user_id, g.id AS guide_id, g.title AS guide_title,
            g.prompt AS guide_prompt, g.learning_level, g.coverage, g.outline_json
     FROM topics t
     JOIN guides g ON g.id = t.guide_id
     WHERE t.id = $1
       AND ${accessClause}`,
    params
  );
  if (!row) return null;
  return {
    topic: toTopic(row),
    guide: {
      id: row.guide_id,
      userId: row.user_id,
      title: row.guide_title,
      prompt: row.guide_prompt,
      learningLevel: row.learning_level,
      coverage: row.coverage,
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

module.exports = {
  findTopicForUser,
  listTopicsForGuide,
  saveTopicContent,
  saveTopicContentHtml,
};
