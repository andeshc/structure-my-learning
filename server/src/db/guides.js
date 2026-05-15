const db = require('./index');

function toGuide(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    prompt: row.prompt,
    ageLevel: row.age_level,
    status: row.status || 'ready',
    outline: row.outline_json ? JSON.parse(row.outline_json) : null,
    illustrationUrl: row.illustration_path || null,
    topicCount: Number(row.topic_count || 0),
    completedTopicCount: Number(row.completed_topic_count || 0),
    completedSubtopicCount: Number(row.completed_subtopic_count || 0),
    progressPercentage: Number(row.progress_percentage || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function progressSelect() {
  return `
    COUNT(t.id) AS topic_count,
    SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) AS completed_topic_count,
    CASE
      WHEN COUNT(t.id) = 0 THEN 0
      ELSE ROUND((SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(t.id))
    END AS progress_percentage,
    (SELECT COUNT(*) FROM subtopics s JOIN topics t2 ON s.topic_id = t2.id WHERE t2.guide_id = g.id AND s.is_completed = 1) AS completed_subtopic_count
  `;
}

function createGuideWithTopics({ guide, topics }) {
  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO guides (id, user_id, title, prompt, age_level, outline_json, illustration_path)
      VALUES (@id, @userId, @title, @prompt, @ageLevel, @outlineJson, @illustrationPath)
    `).run(guide);

    const insertTopic = db.prepare(`
      INSERT INTO topics (id, guide_id, position, title, description)
      VALUES (@id, @guideId, @position, @title, @description)
    `);

    topics.forEach((topic) => insertTopic.run(topic));
  });

  transaction();
}

function createPendingGuide({ id, userId, prompt, ageLevel }) {
  db.prepare(`
    INSERT INTO guides (id, user_id, title, prompt, age_level, status)
    VALUES (@id, @userId, @title, @prompt, @ageLevel, 'pending')
  `).run({ id, userId, title: prompt.slice(0, 90), prompt, ageLevel });
}

function completeGuide({ id, title, outlineJson, illustrationPath, topics }) {
  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE guides
      SET title = @title, outline_json = @outlineJson, illustration_path = @illustrationPath,
          status = 'ready', updated_at = datetime('now')
      WHERE id = @id
    `).run({ id, title, outlineJson, illustrationPath });

    const insertTopic = db.prepare(`
      INSERT INTO topics (id, guide_id, position, title, description)
      VALUES (@id, @guideId, @position, @title, @description)
    `);

    topics.forEach((topic) => insertTopic.run(topic));
  });

  transaction();
}

function setGuideIllustration(id, illustrationPath) {
  db.prepare(`UPDATE guides SET illustration_path = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(illustrationPath, id);
}

function markGuideFailed(id) {
  db.prepare(`UPDATE guides SET status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(id);
}

function listGuidesForUser(userId) {
  return db.prepare(`
    SELECT g.*, ${progressSelect()}
    FROM guides g
    LEFT JOIN topics t ON t.guide_id = g.id
    WHERE g.user_id = ?
    GROUP BY g.id
    ORDER BY g.updated_at DESC
  `).all(userId).map(toGuide);
}

function findGuideForUser(guideId, userId) {
  return toGuide(db.prepare(`
    SELECT g.*, ${progressSelect()}
    FROM guides g
    LEFT JOIN topics t ON t.guide_id = g.id
    WHERE g.id = ? AND g.user_id = ?
    GROUP BY g.id
  `).get(guideId, userId));
}

function deleteGuideForUser(guideId, userId) {
  return db.prepare('DELETE FROM guides WHERE id = ? AND user_id = ?').run(guideId, userId);
}

function touchGuide(guideId) {
  db.prepare("UPDATE guides SET updated_at = datetime('now') WHERE id = ?").run(guideId);
}

module.exports = {
  completeGuide,
  createGuideWithTopics,
  createPendingGuide,
  deleteGuideForUser,
  findGuideForUser,
  listGuidesForUser,
  markGuideFailed,
  setGuideIllustration,
  touchGuide,
};
