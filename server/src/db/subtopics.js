const db = require('./index');
const { subtopicId } = require('../utils/ids');
const { touchGuide } = require('./guides');

function toSubtopic(row) {
  if (!row) return null;
  return {
    id: row.id,
    topicId: row.topic_id,
    position: row.position,
    title: row.title,
    contentHtml: row.content_html,
    hasContent: Boolean(row.content_html),
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at,
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

function listSubtopicsForTopic(topicId) {
  return db.prepare(
    'SELECT * FROM subtopics WHERE topic_id = ? ORDER BY position ASC'
  ).all(topicId).map(toSubtopic);
}

function updateSubtopicProgress(subtopicId, isCompleted) {
  const completedAt = isCompleted ? new Date().toISOString() : null;
  db.prepare(
    'UPDATE subtopics SET is_completed = ?, completed_at = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(isCompleted ? 1 : 0, completedAt, subtopicId);

  const row = db.prepare(
    'SELECT s.topic_id, t.guide_id FROM subtopics s JOIN topics t ON t.id = s.topic_id WHERE s.id = ?'
  ).get(subtopicId);
  if (row) touchGuide(row.guide_id);

  return toSubtopic(db.prepare('SELECT * FROM subtopics WHERE id = ?').get(subtopicId));
}

function saveSubtopicContentHtml(subtopicId, contentHtml) {
  db.prepare(
    'UPDATE subtopics SET content_html = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(contentHtml, subtopicId);
}

function initSubtopicsForGuide(sections, topicsByPosition) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO subtopics (id, topic_id, position, title, dev_status)
     VALUES (?, ?, ?, ?, 'pending')`
  );
  db.transaction(() => {
    sections.forEach((section, si) => {
      const topicId = topicsByPosition[si + 1];
      if (!topicId) return;
      section.items.forEach((item, pos) => insert.run(subtopicId(), topicId, pos, item.title));
    });
  })();
}

function claimSubtopic(id) {
  return db.prepare(
    `UPDATE subtopics SET dev_status = 'developing', locked_at = datetime('now')
     WHERE id = ? AND dev_status = 'pending'`
  ).run(id).changes > 0;
}

function setDevStatus(id, status) {
  db.prepare(
    `UPDATE subtopics SET dev_status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(status, id);
}

function getPendingSubtopicsForGuide(guideId) {
  return db.prepare(
    `SELECT s.id, s.topic_id, s.position, s.title FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     WHERE t.guide_id = ? AND s.dev_status = 'pending'
     ORDER BY t.position, s.position`
  ).all(guideId);
}

function findSubtopicContext(id) {
  const row = db.prepare(
    `SELECT s.*, t.id AS t_id, t.title AS t_title, t.description AS t_desc,
            t.position AS t_pos, g.id AS g_id, g.title AS g_title,
            g.prompt AS g_prompt, g.age_level, g.outline_json
     FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     JOIN guides g ON g.id = t.guide_id
     WHERE s.id = ?`
  ).get(id);
  if (!row) return null;
  const outline = row.outline_json ? JSON.parse(row.outline_json) : null;
  const item = outline?.sections?.[row.t_pos - 1]?.items?.[row.position];
  return {
    subtopic: toSubtopic(row),
    topic: { id: row.t_id, title: row.t_title, description: row.t_desc },
    guide: { id: row.g_id, title: row.g_title, prompt: row.g_prompt, ageLevel: row.age_level },
    outline,
    item,
  };
}

function resetFailedSubtopicsForGuide(guideId) {
  db.prepare(
    `UPDATE subtopics SET dev_status = 'pending', locked_at = NULL
     WHERE dev_status = 'failed'
     AND topic_id IN (SELECT id FROM topics WHERE guide_id = ?)`
  ).run(guideId);
}

function resetStaleLocks() {
  db.prepare(
    `UPDATE subtopics SET dev_status = 'pending', locked_at = NULL
     WHERE dev_status = 'developing' AND locked_at < datetime('now', '-10 minutes')`
  ).run();
}

// On startup only: the previous process is provably dead, so reset all developing subtopics
// regardless of lease age. At runtime, use resetStaleLocks() for multi-instance safety.
function resetAllDevelopingOnStartup() {
  db.prepare(
    `UPDATE subtopics SET dev_status = 'pending', locked_at = NULL WHERE dev_status = 'developing'`
  ).run();
}

function getGuidesWithPendingWork() {
  return db.prepare(
    `SELECT DISTINCT t.guide_id FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     WHERE s.dev_status IN ('pending', 'developing')`
  ).all().map((r) => r.guide_id);
}

function listSubtopicStatusesForGuide(guideId) {
  return db.prepare(
    `SELECT s.topic_id, s.position, s.dev_status,
            CASE WHEN s.content_html IS NOT NULL THEN 1 ELSE 0 END AS has_content
     FROM subtopics s JOIN topics t ON t.id = s.topic_id
     WHERE t.guide_id = ? ORDER BY t.position, s.position`
  ).all(guideId).map((r) => ({
    topicId: r.topic_id,
    position: r.position,
    devStatus: r.dev_status,
    hasContent: Boolean(r.has_content),
  }));
}

module.exports = {
  claimSubtopic,
  findOrCreateSubtopic,
  findSubtopicContext,
  findSubtopicForUser,
  getGuidesWithPendingWork,
  getPendingSubtopicsForGuide,
  initSubtopicsForGuide,
  listSubtopicStatusesForGuide,
  listSubtopicsForTopic,
  resetAllDevelopingOnStartup,
  resetFailedSubtopicsForGuide,
  resetStaleLocks,
  saveSubtopicContentHtml,
  setDevStatus,
  updateSubtopicProgress,
};
