const db = require('./index');
const { subtopicId } = require('../utils/ids');

function toSubtopic(row) {
  if (!row) return null;
  return {
    id: row.id,
    topicId: row.topic_id,
    position: row.position,
    title: row.title,
    contentHtml: row.content_html,
    hasContent: Boolean(row.content_html),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findOrCreateSubtopic(topicId, position, title) {
  const existing = db.prepare(
    'SELECT * FROM subtopics WHERE topic_id = ? AND position = ?'
  ).get(topicId, position);
  if (existing) return toSubtopic(existing);

  const id = subtopicId();
  db.prepare(
    'INSERT INTO subtopics (id, topic_id, position, title) VALUES (?, ?, ?, ?)'
  ).run(id, topicId, position, title);

  return toSubtopic(db.prepare('SELECT * FROM subtopics WHERE id = ?').get(id));
}

function findSubtopicForUser(topicId, position, userId) {
  const row = db.prepare(`
    SELECT s.*, t.guide_id, t.title AS topic_title, t.description AS topic_description,
           t.position AS topic_position,
           g.user_id, g.title AS guide_title, g.prompt AS guide_prompt,
           g.age_level, g.outline_json
    FROM subtopics s
    JOIN topics t ON t.id = s.topic_id
    JOIN guides g ON g.id = t.guide_id
    WHERE s.topic_id = ? AND s.position = ? AND g.user_id = ?
  `).get(topicId, position, userId);

  if (!row) return null;

  return {
    subtopic: toSubtopic(row),
    topic: {
      id: topicId,
      title: row.topic_title,
      description: row.topic_description,
      position: row.topic_position,
    },
    guide: {
      id: row.guide_id,
      title: row.guide_title,
      prompt: row.guide_prompt,
      ageLevel: row.age_level,
      outline: row.outline_json ? JSON.parse(row.outline_json) : null,
    },
  };
}

function saveSubtopicContentHtml(subtopicId, contentHtml) {
  db.prepare(
    'UPDATE subtopics SET content_html = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(contentHtml, subtopicId);
}

module.exports = {
  findOrCreateSubtopic,
  findSubtopicForUser,
  saveSubtopicContentHtml,
};
