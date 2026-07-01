const { query, getOne, getAll, withTransaction } = require('./index');
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
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    devStatus: row.dev_status ?? 'pending',
  };
}

async function findOrCreateSubtopic(topicId, position, title) {
  const existing = await getOne(
    'SELECT * FROM subtopics WHERE topic_id = $1 AND position = $2',
    [topicId, position]
  );
  if (existing) return toSubtopic(existing);

  const id = subtopicId();
  await query(
    'INSERT INTO subtopics (id, topic_id, position, title) VALUES ($1, $2, $3, $4)',
    [id, topicId, position, title]
  );
  return toSubtopic(await getOne('SELECT * FROM subtopics WHERE id = $1', [id]));
}

async function findSubtopicForUser(topicId, position, userId) {
  const row = await getOne(
    `SELECT s.*, t.guide_id, t.title AS topic_title, t.description AS topic_description,
            t.position AS topic_position,
            g.user_id, g.title AS guide_title, g.prompt AS guide_prompt,
            g.learning_level, g.coverage, g.outline_json
     FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     JOIN guides g ON g.id = t.guide_id
     WHERE s.topic_id = $1 AND s.position = $2 AND g.user_id = $3`,
    [topicId, position, userId]
  );
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
      learningLevel: row.learning_level,
      coverage: row.coverage,
      outline: row.outline_json ? JSON.parse(row.outline_json) : null,
    },
  };
}

async function listSubtopicsForTopic(topicId) {
  const rows = await getAll(
    'SELECT * FROM subtopics WHERE topic_id = $1 ORDER BY position ASC',
    [topicId]
  );
  return rows.map(toSubtopic);
}

async function updateSubtopicProgress(userId, subtopicId, isCompleted) {
  const completedAt = isCompleted ? new Date().toISOString() : null;
  await query(
    `INSERT INTO subtopic_progress (user_id, subtopic_id, is_completed, completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, subtopic_id) DO UPDATE SET is_completed = $3, completed_at = $4`,
    [userId, subtopicId, isCompleted, completedAt]
  );
}

async function getSubtopicProgressForUser(userId, subtopicId) {
  const row = await getOne(
    'SELECT is_completed, completed_at FROM subtopic_progress WHERE user_id = $1 AND subtopic_id = $2',
    [userId, subtopicId]
  );
  return { isCompleted: row?.is_completed ?? false, completedAt: row?.completed_at ?? null };
}

async function saveSubtopicContentHtml(subtopicId, contentHtml) {
  await query(
    'UPDATE subtopics SET content_html = $1, updated_at = NOW() WHERE id = $2',
    [contentHtml, subtopicId]
  );
}

async function initSubtopicsForGuide(sections, topicsByPosition) {
  await withTransaction(async (client) => {
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const topicId = topicsByPosition[si + 1];
      if (!topicId) continue;
      for (let pos = 0; pos < section.items.length; pos++) {
        const item = section.items[pos];
        await client.query(
          `INSERT INTO subtopics (id, topic_id, position, title, dev_status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (topic_id, position) DO NOTHING`,
          [subtopicId(), topicId, pos, item.title]
        );
      }
    }
  });
}

async function claimSubtopic(id) {
  const result = await query(
    `UPDATE subtopics SET dev_status = 'developing', locked_at = NOW()
     WHERE id = $1 AND dev_status = 'pending'`,
    [id]
  );
  return result.rowCount > 0;
}

async function setDevStatus(id, status) {
  await query(
    `UPDATE subtopics SET dev_status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id]
  );
}

async function getPendingSubtopicsForGuide(guideId) {
  return getAll(
    `SELECT s.id, s.topic_id, s.position, s.title FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     WHERE t.guide_id = $1 AND s.dev_status = 'pending'
     ORDER BY t.position, s.position`,
    [guideId]
  );
}

async function findSubtopicContext(id) {
  const row = await getOne(
    `SELECT s.*, t.id AS t_id, t.title AS t_title, t.description AS t_desc,
            t.position AS t_pos, g.id AS g_id, g.title AS g_title,
            g.prompt AS g_prompt, g.learning_level, g.coverage, g.outline_json
     FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     JOIN guides g ON g.id = t.guide_id
     WHERE s.id = $1`,
    [id]
  );
  if (!row) return null;
  const outline = row.outline_json ? JSON.parse(row.outline_json) : null;
  const item = outline?.sections?.[row.t_pos - 1]?.items?.[row.position];
  return {
    subtopic: toSubtopic(row),
    topic: { id: row.t_id, title: row.t_title, description: row.t_desc },
    guide: { id: row.g_id, title: row.g_title, prompt: row.g_prompt, learningLevel: row.learning_level, coverage: row.coverage },
    outline,
    item,
  };
}

async function resetFailedSubtopicsForGuide(guideId) {
  await query(
    `UPDATE subtopics SET dev_status = 'pending', locked_at = NULL
     WHERE dev_status = 'failed'
     AND topic_id IN (SELECT id FROM topics WHERE guide_id = $1)`,
    [guideId]
  );
}

async function resetStaleLocks() {
  await query(
    `UPDATE subtopics SET dev_status = 'pending', locked_at = NULL
     WHERE dev_status = 'developing' AND locked_at < NOW() - INTERVAL '10 minutes'`
  );
}

async function resetAllDevelopingOnStartup() {
  await query(
    `UPDATE subtopics SET dev_status = 'pending', locked_at = NULL WHERE dev_status = 'developing'`
  );
}

async function getGuidesWithPendingWork() {
  const rows = await getAll(
    `SELECT DISTINCT t.guide_id FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     WHERE s.dev_status IN ('pending', 'developing')`
  );
  return rows.map((r) => r.guide_id);
}

async function listAllSubtopicsForGuide(guideId, userId) {
  const rows = await getAll(
    `SELECT s.id AS subtopic_id, s.topic_id, s.position, s.dev_status,
            COALESCE(sp.is_completed, false) AS is_completed,
            CASE WHEN s.content_html IS NOT NULL AND s.content_html != '' THEN 1 ELSE 0 END AS has_content
     FROM subtopics s
     JOIN topics t ON t.id = s.topic_id
     LEFT JOIN subtopic_progress sp ON sp.subtopic_id = s.id AND sp.user_id = $2
     WHERE t.guide_id = $1 ORDER BY t.position, s.position`,
    [guideId, userId]
  );
  return rows.map((r) => ({
    id: r.subtopic_id,
    topicId: r.topic_id,
    position: r.position,
    devStatus: r.dev_status ?? 'pending',
    isCompleted: Boolean(r.is_completed),
    hasContent: Boolean(r.has_content),
  }));
}

async function listSubtopicStatusesForGuide(guideId) {
  const rows = await getAll(
    `SELECT s.id, s.topic_id, s.position, s.dev_status, s.illustration_urls,
            CASE WHEN s.content_html IS NOT NULL AND s.content_html != '' THEN 1 ELSE 0 END AS has_content
     FROM subtopics s JOIN topics t ON t.id = s.topic_id
     WHERE t.guide_id = $1 ORDER BY t.position, s.position`,
    [guideId]
  );
  return rows.map((r) => ({
    subtopicId: r.id,
    topicId: r.topic_id,
    position: r.position,
    devStatus: r.dev_status,
    hasContent: Boolean(r.has_content),
    illustrationUrls: r.illustration_urls ? JSON.parse(r.illustration_urls) : [],
  }));
}

async function saveIllustrationUrls(subtopicId, urls) {
  await query(
    'UPDATE subtopics SET illustration_urls = $1 WHERE id = $2',
    [JSON.stringify(urls), subtopicId]
  );
}

module.exports = {
  claimSubtopic,
  listAllSubtopicsForGuide,
  findOrCreateSubtopic,
  findSubtopicContext,
  findSubtopicForUser,
  getGuidesWithPendingWork,
  getPendingSubtopicsForGuide,
  getSubtopicProgressForUser,
  initSubtopicsForGuide,
  listSubtopicStatusesForGuide,
  listSubtopicsForTopic,
  saveIllustrationUrls,
  resetAllDevelopingOnStartup,
  resetFailedSubtopicsForGuide,
  resetStaleLocks,
  saveSubtopicContentHtml,
  setDevStatus,
  updateSubtopicProgress,
};
