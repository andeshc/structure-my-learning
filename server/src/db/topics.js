import { db } from './index.js';
import { touchGuide } from './guides.js';

function serializeTopic(topic) {
  return topic
    ? {
        ...topic,
        isCompleted: Boolean(topic.isCompleted),
        hasContent: Boolean(topic.hasContent)
      }
    : null;
}

export function listTopicsForGuide(guideId) {
  return db.prepare(
    `SELECT
       id,
       guide_id AS guideId,
       position,
       title,
       description,
       is_completed AS isCompleted,
       content_markdown IS NOT NULL AS hasContent,
       completed_at AS completedAt,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM topics
     WHERE guide_id = ?
     ORDER BY position`
  ).all(guideId).map(serializeTopic);
}

export function findTopicForUser(topicId, userId) {
  return serializeTopic(db.prepare(
    `SELECT
       t.id,
       t.guide_id AS guideId,
       t.position,
       t.title,
       t.description,
       t.content_markdown AS contentMarkdown,
       t.is_completed AS isCompleted,
       t.content_markdown IS NOT NULL AS hasContent,
       t.completed_at AS completedAt,
       t.created_at AS createdAt,
       t.updated_at AS updatedAt,
       g.title AS guideTitle,
       g.prompt AS guidePrompt
     FROM topics t
     JOIN guides g ON g.id = t.guide_id
     WHERE t.id = ? AND g.user_id = ?`
  ).get(topicId, userId));
}

export function saveTopicContent(topicId, guideId, contentMarkdown) {
  db.prepare(
    `UPDATE topics
     SET content_markdown = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(contentMarkdown, topicId);
  touchGuide(guideId);
}

export function updateTopicProgress(topicId, userId, isCompleted) {
  const topic = findTopicForUser(topicId, userId);

  if (!topic) {
    return null;
  }

  db.prepare(
    `UPDATE topics
     SET is_completed = @isCompleted,
         completed_at = CASE WHEN @isCompleted = 1 THEN datetime('now') ELSE NULL END,
         updated_at = datetime('now')
     WHERE id = @topicId`
  ).run({ topicId, isCompleted: isCompleted ? 1 : 0 });
  touchGuide(topic.guideId);

  return findTopicForUser(topicId, userId);
}
