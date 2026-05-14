const db = require('./index');
const { touchGuide } = require('./guides');

function toTopic(row) {
  if (!row) {
    return null;
  }

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

function listTopicsForGuide(guideId) {
  return db.prepare(`
    SELECT * FROM topics
    WHERE guide_id = ?
    ORDER BY position ASC
  `).all(guideId).map(toTopic);
}

function findTopicForUser(topicId, userId) {
  const row = db.prepare(`
    SELECT t.*, g.user_id, g.title AS guide_title, g.prompt AS guide_prompt, g.age_level, g.outline_json
    FROM topics t
    JOIN guides g ON g.id = t.guide_id
    WHERE t.id = ? AND g.user_id = ?
  `).get(topicId, userId);

  if (!row) {
    return null;
  }

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

function saveTopicContent(topicId, contentMarkdown) {
  db.prepare(`
    UPDATE topics
    SET content_markdown = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(contentMarkdown, topicId);
}

function saveTopicContentHtml(topicId, contentHtml) {
  db.prepare(`
    UPDATE topics
    SET content_html = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(contentHtml, topicId);
}

function updateTopicProgress(topicId, isCompleted) {
  const completedAt = isCompleted ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE topics
    SET is_completed = ?, completed_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(isCompleted ? 1 : 0, completedAt, topicId);

  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);

  if (topic) {
    touchGuide(topic.guide_id);
  }

  return toTopic(topic);
}

module.exports = {
  findTopicForUser,
  listTopicsForGuide,
  saveTopicContent,
  saveTopicContentHtml,
  updateTopicProgress,
};
