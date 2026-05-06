import { db } from './index.js';

function progressExpression() {
  return `CASE
    WHEN COUNT(t.id) = 0 THEN 0
    ELSE ROUND((SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(t.id))
  END`;
}

export function createGuideWithTopics({ guide, topics }) {
  const transaction = db.transaction(() => {
    db.prepare(
      `INSERT INTO guides (id, user_id, title, prompt)
       VALUES (@id, @userId, @title, @prompt)`
    ).run(guide);

    const insertTopic = db.prepare(
      `INSERT INTO topics (id, guide_id, position, title, description)
       VALUES (@id, @guideId, @position, @title, @description)`
    );

    topics.forEach((topic) => insertTopic.run(topic));
  });

  transaction();
}

export function listGuidesForUser(userId) {
  return db.prepare(
    `SELECT
       g.id,
       g.title,
       g.prompt,
       COUNT(t.id) AS topicCount,
       SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) AS completedTopicCount,
       ${progressExpression()} AS progressPercentage,
       g.created_at AS createdAt,
       g.updated_at AS updatedAt
     FROM guides g
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.user_id = ?
     GROUP BY g.id
     ORDER BY g.updated_at DESC`
  ).all(userId).map((guide) => ({
    ...guide,
    topicCount: Number(guide.topicCount),
    completedTopicCount: Number(guide.completedTopicCount || 0),
    progressPercentage: Number(guide.progressPercentage || 0)
  }));
}

export function findGuideForUser(guideId, userId) {
  return db.prepare(
    `SELECT
       g.id,
       g.title,
       g.prompt,
       ${progressExpression()} AS progressPercentage,
       g.created_at AS createdAt,
       g.updated_at AS updatedAt
     FROM guides g
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.id = ? AND g.user_id = ?
     GROUP BY g.id`
  ).get(guideId, userId);
}

export function deleteGuideForUser(guideId, userId) {
  return db.prepare(
    `DELETE FROM guides
     WHERE id = ? AND user_id = ?`
  ).run(guideId, userId);
}

export function touchGuide(guideId) {
  db.prepare(
    `UPDATE guides
     SET updated_at = datetime('now')
     WHERE id = ?`
  ).run(guideId);
}
