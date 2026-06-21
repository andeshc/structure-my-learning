const { query, getOne, getAll, withTransaction } = require('./index');
const ids = require('../utils/ids');

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
    completedSubtopicCount: Number(row.completed_subtopic_count || 0),
    isAdopted: Boolean(row.is_adopted),
    ownerName: row.owner_name || null,
    shareToken: row.share_token || null,
    isPublic: Boolean(row.is_public),
    clarifications: row.clarifications ?? null,
    freeText: row.free_text ?? null,
    collections: Array.isArray(row.collections) ? row.collections : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Per-user subtopic completion count subquery. userParam is a SQL placeholder string like '$1'.
function subtopicProgressCount(userParam) {
  return `(
    SELECT COUNT(*) FROM subtopics s2
    JOIN topics t2 ON t2.id = s2.topic_id
    WHERE t2.guide_id = g.id
    AND EXISTS (
      SELECT 1 FROM subtopic_progress sp
      WHERE sp.subtopic_id = s2.id AND sp.user_id = ${userParam} AND sp.is_completed = true
    )
  ) AS completed_subtopic_count`;
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

async function createPendingGuide({ id, userId, prompt, learningLevel, coverage, clarifications, freeText }) {
  await query(
    `INSERT INTO guides (id, user_id, title, prompt, learning_level, coverage, clarifications, free_text, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
    [id, userId, prompt.slice(0, 90), prompt, learningLevel, coverage,
     clarifications ? JSON.stringify(clarifications) : null, freeText ?? null]
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

async function replaceGuideTopics({ guideId, outlineJson, topics }) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM topics WHERE guide_id = $1', [guideId]);
    await client.query(
      'UPDATE guides SET outline_json = $1, updated_at = NOW() WHERE id = $2',
      [outlineJson, guideId]
    );
    for (const topic of topics) {
      await client.query(
        'INSERT INTO topics (id, guide_id, position, title, description) VALUES ($1, $2, $3, $4, $5)',
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
  const collectionsSub = `(
    SELECT COALESCE(
      json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY cg.position),
      '[]'::json
    )
    FROM collection_guides cg
    JOIN collections c ON c.id = cg.collection_id AND c.user_id = $1
    WHERE cg.guide_id = g.id
  ) AS collections`;

  const rows = await getAll(
    `SELECT g.*, u.name AS owner_name, false AS is_adopted,
       COUNT(DISTINCT t.id) AS topic_count,
       ${subtopicProgressCount('$1')},
       ${collectionsSub}
     FROM guides g
     JOIN users u ON u.id = g.user_id
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.user_id = $1
     GROUP BY g.id, u.name

     UNION ALL

     SELECT g.*, u.name AS owner_name, true AS is_adopted,
       COUNT(DISTINCT t.id) AS topic_count,
       ${subtopicProgressCount('$1')},
       ${collectionsSub}
     FROM guides g
     LEFT JOIN users u ON u.id = g.user_id
     LEFT JOIN topics t ON t.guide_id = g.id
     JOIN guide_adoptions ga ON ga.guide_id = g.id AND ga.user_id = $1
     GROUP BY g.id, u.name

     ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map(toGuide);
}

async function findGuideForUser(guideId, userId) {
  return toGuide(await getOne(
    `SELECT g.*, u.name AS owner_name,
       CASE WHEN g.user_id = $2 THEN false ELSE true END AS is_adopted,
       COUNT(DISTINCT t.id) AS topic_count,
       ${subtopicProgressCount('$2')}
     FROM guides g
     LEFT JOIN users u ON u.id = g.user_id
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.id = $1
       AND (g.user_id = $2 OR EXISTS (
         SELECT 1 FROM guide_adoptions WHERE guide_id = $1 AND user_id = $2
       ))
     GROUP BY g.id, u.name`,
    [guideId, userId]
  ));
}

async function findOwnedGuideForUser(guideId, userId) {
  return toGuide(await getOne(
    `SELECT g.*, u.name AS owner_name, false AS is_adopted,
       COUNT(DISTINCT t.id) AS topic_count,
       ${subtopicProgressCount('$2')}
     FROM guides g
     JOIN users u ON u.id = g.user_id
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.id = $1 AND g.user_id = $2
     GROUP BY g.id, u.name`,
    [guideId, userId]
  ));
}

async function deleteGuideForUser(guideId, userId) {
  return query('DELETE FROM guides WHERE id = $1 AND user_id = $2', [guideId, userId]);
}

async function touchGuide(guideId) {
  await query(`UPDATE guides SET updated_at = NOW() WHERE id = $1`, [guideId]);
}

async function enableSharing(guideId, userId) {
  const guide = await findGuideForUser(guideId, userId);
  if (!guide) return null;
  if (guide.shareToken) return guide.shareToken;
  // Only the original owner can generate a new token
  if (guide.isAdopted) return null;
  const token = ids.shareToken();
  await query('UPDATE guides SET share_token = $1 WHERE id = $2', [token, guideId]);
  return token;
}

async function findGuideByShareToken(token) {
  const row = await getOne(
    `SELECT g.*, u.name AS owner_name, COUNT(t.id) AS topic_count
     FROM guides g
     LEFT JOIN users u ON u.id = g.user_id
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.share_token = $1
     GROUP BY g.id, u.name`,
    [token]
  );
  if (!row) return null;
  return { ...toGuide(row), ownerName: row.owner_name };
}

async function adoptGuide(userId, guideId, shareToken) {
  await query(
    `INSERT INTO guide_adoptions (user_id, guide_id, share_token)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userId, guideId, shareToken]
  );
}

async function getExistingAdoption(userId, guideId) {
  return getOne(
    `SELECT guide_id FROM guide_adoptions WHERE user_id = $1 AND guide_id = $2`,
    [userId, guideId]
  );
}

async function removeAdoption(userId, guideId) {
  const result = await query(
    `DELETE FROM guide_adoptions WHERE user_id = $1 AND guide_id = $2`,
    [userId, guideId]
  );
  return result.rowCount;
}

async function tombstoneGuide(guideId, userId) {
  await query(
    `UPDATE guides SET user_id = NULL, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [guideId, userId]
  );
}

async function getAdoptionCount(guideId) {
  const row = await getOne(
    `SELECT COUNT(*) AS count FROM guide_adoptions WHERE guide_id = $1`,
    [guideId]
  );
  return Number(row?.count ?? 0);
}

async function cleanupTombstonedGuide(guideId) {
  await query(
    `DELETE FROM guides WHERE id = $1 AND user_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM guide_adoptions WHERE guide_id = $1)`,
    [guideId]
  );
}

async function setGuidePublic(guideId, userId, isPublic) {
  const guide = await findOwnedGuideForUser(guideId, userId);
  if (!guide) return null;
  if (isPublic && !guide.shareToken) {
    const token = ids.shareToken();
    await query(
      `UPDATE guides SET share_token = $1, is_public = true, updated_at = NOW() WHERE id = $2`,
      [token, guideId]
    );
    return { isPublic: true, shareToken: token };
  }
  await query(
    `UPDATE guides SET is_public = $1, updated_at = NOW() WHERE id = $2`,
    [isPublic, guideId]
  );
  return { isPublic, shareToken: guide.shareToken };
}

async function listPublicGuides(viewerUserId, limit, offset) {
  const rows = await getAll(
    `SELECT g.id, g.title, g.illustration_path, g.share_token, g.user_id,
            u.name AS owner_name,
            COUNT(DISTINCT t.id) AS topic_count,
            EXISTS(
              SELECT 1 FROM guide_adoptions
              WHERE guide_id = g.id AND user_id = $1
            ) AS viewer_has_adopted
     FROM guides g
     JOIN users u ON u.id = g.user_id
     LEFT JOIN topics t ON t.guide_id = g.id
     WHERE g.is_public = true
       AND g.share_token IS NOT NULL
       AND g.user_id IS NOT NULL
     GROUP BY g.id, u.name
     ORDER BY g.updated_at DESC
     LIMIT $2 OFFSET $3`,
    [viewerUserId, limit, offset]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    illustrationUrl: r.illustration_path || null,
    shareToken: r.share_token,
    userId: r.user_id,
    ownerName: r.owner_name,
    topicCount: Number(r.topic_count || 0),
    viewerHasAdopted: Boolean(r.viewer_has_adopted),
  }));
}

async function incrementGuideCost(guideId, tokensIn, tokensOut, costUsd) {
  await query(
    `UPDATE guides SET tokens_in = tokens_in + $1, tokens_out = tokens_out + $2, cost_usd = cost_usd + $3 WHERE id = $4`,
    [tokensIn, tokensOut, costUsd, guideId]
  );
}

async function incrementGuidesCreatedCount(userId) {
  await query(
    `UPDATE users SET guides_created_count = guides_created_count + 1 WHERE id = $1`,
    [userId]
  );
}

async function getGuidesCreatedCount(userId) {
  const row = await getOne(`SELECT guides_created_count FROM users WHERE id = $1`, [userId]);
  return Number(row?.guides_created_count ?? 0);
}

module.exports = {
  toGuide,
  appendSectionsToGuide,
  replaceGuideTopics,
  setGuidePublic,
  listPublicGuides,
  completeGuide,
  updatePartialOutline,
  setNeedsReview,
  createGuideWithTopics,
  createPendingGuide,
  deleteGuideForUser,
  enableSharing,
  findGuideByShareToken,
  findGuideForUser,
  findOwnedGuideForUser,
  adoptGuide,
  getExistingAdoption,
  removeAdoption,
  tombstoneGuide,
  getAdoptionCount,
  cleanupTombstonedGuide,
  incrementGuideCost,
  incrementGuidesCreatedCount,
  getGuidesCreatedCount,
  listGuidesForUser,
  markGuideFailed,
  setGuideIllustration,
  touchGuide,
};
