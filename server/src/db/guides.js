const { query, getOne, getAll, withTransaction } = require('./index');

function toGuide(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    prompt: row.prompt,
    learningLevel: row.learning_level,
    coverage: row.coverage || 'balanced',
    status: row.status || 'ready',
    needsReview: Boolean(row.needs_review),
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
      ELSE ROUND(((SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(t.id))::numeric)
    END AS progress_percentage,
    (SELECT COUNT(*) FROM subtopics s JOIN topics t2 ON s.topic_id = t2.id WHERE t2.guide_id = g.id AND s.is_completed = 1) AS completed_subtopic_count
  `;
}

async function createGuideWithTopics({ guide, topics }) {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO guides (id, user_id, title, prompt, learning_level, coverage, outline_json, illustration_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [guide.id, guide.userId, guide.title, guide.prompt, guide.learningLevel, guide.coverage || 'balanced', guide.outlineJson, guide.illustrationPath]
    );
    for (const topic of topics) {
      await client.query(
        `INSERT INTO topics (id, guide_id, position, title, description) VALUES ($1, $2, $3, $4, $5)`,
        [topic.id, topic.guideId, topic.position, topic.title, topic.description]
      );
    }
  });
}

async function createPendingGuide({ id, userId, prompt, learningLevel, coverage }) {
  await query(
    `INSERT INTO guides (id, user_id, title, prompt, learning_level, coverage, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [id, userId, prompt.slice(0, 90), prompt, learningLevel, coverage]
  );
}

async function completeGuide({ id, title, outlineJson, illustrationPath, topics }) {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE guides SET title = $1, outline_json = $2, illustration_path = $3,
          status = 'ready', updated_at = NOW() WHERE id = $4`,
      [title, outlineJson, illustrationPath, id]
    );
    for (const topic of topics) {
      await client.query(
        `INSERT INTO topics (id, guide_id, position, title, description) VALUES ($1, $2, $3, $4, $5)`,
        [topic.id, topic.guideId, topic.position, topic.title, topic.description]
      );
    }
  });
}

async function updatePartialOutline(id, outlineJson) {
  await query(
    `UPDATE guides SET outline_json = $1, updated_at = NOW() WHERE id = $2`,
    [outlineJson, id]
  );
}

async function setNeedsReview(id, value) {
  await query(
    `UPDATE guides SET needs_review = $1, updated_at = NOW() WHERE id = $2`,
    [value, id]
  );
}

async function appendSectionsToGuide({ id, outlineJson, topics }) {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE guides SET outline_json = $1, updated_at = NOW() WHERE id = $2`,
      [outlineJson, id]
    );
    for (const topic of topics) {
      await client.query(
        `INSERT INTO topics (id, guide_id, position, title, description) VALUES ($1, $2, $3, $4, $5)`,
        [topic.id, topic.guideId, topic.position, topic.title, topic.description]
      );
    }
  });
}

async function setGuideIllustration(id, illustrationPath) {
  await query(
    `UPDATE guides SET illustration_path = $1, updated_at = NOW() WHERE id = $2`,
    [illustrationPath, id]
  );
}

async function markGuideFailed(id) {
  await query(`UPDATE guides SET status = 'failed', updated_at = NOW() WHERE id = $1`, [id]);
}

async function listGuidesForUser(userId) {
  const rows = await getAll(
    `SELECT g.*, ${progressSelect()}
     FROM guides g
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.user_id = $1
     GROUP BY g.id
     ORDER BY g.updated_at DESC`,
    [userId]
  );
  return rows.map(toGuide);
}

async function findGuideForUser(guideId, userId) {
  return toGuide(await getOne(
    `SELECT g.*, ${progressSelect()}
     FROM guides g
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.id = $1 AND g.user_id = $2
     GROUP BY g.id`,
    [guideId, userId]
  ));
}

async function deleteGuideForUser(guideId, userId) {
  return query('DELETE FROM guides WHERE id = $1 AND user_id = $2', [guideId, userId]);
}

async function touchGuide(guideId) {
  await query(`UPDATE guides SET updated_at = NOW() WHERE id = $1`, [guideId]);
}

module.exports = {
  appendSectionsToGuide,
  completeGuide,
  updatePartialOutline,
  setNeedsReview,
  createGuideWithTopics,
  createPendingGuide,
  deleteGuideForUser,
  findGuideForUser,
  listGuidesForUser,
  markGuideFailed,
  setGuideIllustration,
  touchGuide,
};
