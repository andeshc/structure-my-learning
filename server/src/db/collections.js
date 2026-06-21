const { query, getOne, getAll, withTransaction } = require('./index');
const ids = require('../utils/ids');

// Per-user completed subtopic count for a guide, referenced via alias g.
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

// Per-guide subtopic totals + completed counts for the progress CTE.
function guideProgressCte(userParam) {
  return `
    guide_progress AS (
      SELECT g.id AS guide_id,
        COUNT(DISTINCT s.id) AS sub_total,
        COUNT(DISTINCT sp.subtopic_id) AS sub_completed
      FROM guides g
      JOIN topics t ON t.guide_id = g.id
      JOIN subtopics s ON s.topic_id = t.id
      LEFT JOIN subtopic_progress sp
        ON sp.subtopic_id = s.id AND sp.user_id = ${userParam} AND sp.is_completed = true
      GROUP BY g.id
    )
  `;
}

function toCollection(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    position: Number(row.position ?? 0),
    guideCount: Number(row.guide_count ?? 0),
    progressPct: Math.round(Number(row.progress_pct ?? 0)),
    previewUrls: Array.isArray(row.preview_urls) ? row.preview_urls : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listCollectionsForUser(userId) {
  const rows = await getAll(
    `WITH ${guideProgressCte('$1')}
     SELECT c.id, c.name, c.description, c.position, c.created_at, c.updated_at,
       COUNT(DISTINCT cg.guide_id) AS guide_count,
       COALESCE(AVG(
         CASE WHEN gp.sub_total > 0 THEN gp.sub_completed * 100.0 / gp.sub_total ELSE NULL END
       ), 0) AS progress_pct,
       (SELECT json_agg(ip) FROM (
         SELECT g.illustration_path AS ip
         FROM collection_guides cg2
         JOIN guides g ON g.id = cg2.guide_id
         WHERE cg2.collection_id = c.id
           AND g.illustration_path IS NOT NULL
         ORDER BY cg2.position
         LIMIT 3
       ) preview_sub) AS preview_urls
     FROM collections c
     LEFT JOIN collection_guides cg ON cg.collection_id = c.id
     LEFT JOIN guide_progress gp ON gp.guide_id = cg.guide_id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.position, c.created_at`,
    [userId]
  );
  return rows.map(toCollection);
}

async function createCollection({ userId, name, description }) {
  const id = ids.collectionId();
  await query(
    `INSERT INTO collections (id, user_id, name, description, position)
     VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(position), 0) + 1 FROM collections WHERE user_id = $2))`,
    [id, userId, name, description ?? null]
  );
  return findCollectionForUser(id, userId);
}

async function findCollectionForUser(collectionId, userId) {
  return toCollection(await getOne(
    `WITH ${guideProgressCte('$2')}
     SELECT c.id, c.name, c.description, c.position, c.created_at, c.updated_at,
       COUNT(DISTINCT cg.guide_id) AS guide_count,
       COALESCE(AVG(
         CASE WHEN gp.sub_total > 0 THEN gp.sub_completed * 100.0 / gp.sub_total ELSE NULL END
       ), 0) AS progress_pct
     FROM collections c
     LEFT JOIN collection_guides cg ON cg.collection_id = c.id
     LEFT JOIN guide_progress gp ON gp.guide_id = cg.guide_id
     WHERE c.id = $1 AND c.user_id = $2
     GROUP BY c.id`,
    [collectionId, userId]
  ));
}

async function updateCollection({ collectionId, userId, name, description }) {
  const existing = await findCollectionForUser(collectionId, userId);
  if (!existing) return null;
  const nextName = name ?? existing.name;
  const nextDescription = description === undefined ? existing.description : description;
  await query(
    `UPDATE collections SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4`,
    [nextName, nextDescription, collectionId, userId]
  );
  return findCollectionForUser(collectionId, userId);
}

async function deleteCollection(collectionId, userId) {
  const result = await query(
    'DELETE FROM collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  return result.rowCount > 0;
}

// Returns member guides with the same shape as guides.listGuidesForUser for reuse on the client.
async function listGuidesInCollection(collectionId, userId) {
  const collectionsSub = `(
    SELECT COALESCE(
      json_agg(json_build_object('id', c2.id, 'name', c2.name) ORDER BY cg2.position),
      '[]'::json
    )
    FROM collection_guides cg2
    JOIN collections c2 ON c2.id = cg2.collection_id AND c2.user_id = $2
    WHERE cg2.guide_id = g.id
  ) AS collections`;

  const rows = await getAll(
    `SELECT g.*, u.name AS owner_name,
        CASE WHEN g.user_id = $2 THEN false ELSE true END AS is_adopted,
        COUNT(DISTINCT t.id) AS topic_count,
        ${subtopicProgressCount('$2')},
        ${collectionsSub},
        cg.position AS collection_position
      FROM collection_guides cg
      JOIN guides g ON g.id = cg.guide_id
      LEFT JOIN users u ON u.id = g.user_id
      LEFT JOIN topics t ON t.guide_id = g.id
      WHERE cg.collection_id = $1
        AND EXISTS (SELECT 1 FROM collections WHERE id = $1 AND user_id = $2)
        AND (g.user_id = $2 OR EXISTS (
          SELECT 1 FROM guide_adoptions WHERE guide_id = g.id AND user_id = $2
        ))
      GROUP BY g.id, u.name, cg.position
      ORDER BY cg.position`,
    [collectionId, userId]
  );

  const { toGuide } = require('./guides');
  return rows.map((row) => ({
    ...toGuide(row),
    collectionPosition: Number(row.collection_position ?? 0),
  }));
}

// Verifies the guide is in the user's library (owned or adopted) before adding.
async function addGuideToCollection({ collectionId, userId, guideId }) {
  const owned = await getOne(
    'SELECT id FROM guides WHERE id = $1 AND user_id = $2',
    [guideId, userId]
  );
  const adopted = owned ? null : await getOne(
    'SELECT guide_id FROM guide_adoptions WHERE guide_id = $1 AND user_id = $2',
    [guideId, userId]
  );
  if (!owned && !adopted) return { added: false, reason: 'not_in_library' };

  const collection = await getOne(
    'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!collection) return { added: false, reason: 'collection_not_found' };

  await query(
    `INSERT INTO collection_guides (collection_id, guide_id, position)
     VALUES ($1, $2, (SELECT COALESCE(MAX(position), 0) + 1 FROM collection_guides WHERE collection_id = $1))
     ON CONFLICT DO NOTHING`,
    [collectionId, guideId]
  );
  return { added: true };
}

async function removeGuideFromCollection({ collectionId, userId, guideId }) {
  const result = await query(
    `DELETE FROM collection_guides
     WHERE collection_id = $1 AND guide_id = $2
       AND EXISTS (SELECT 1 FROM collections WHERE id = $1 AND user_id = $3)`,
    [collectionId, guideId, userId]
  );
  return result.rowCount > 0;
}

async function reorderGuides({ collectionId, userId, orderedGuideIds }) {
  await withTransaction(async (client) => {
    const owned = await client.query(
      'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
      [collectionId, userId]
    );
    if (owned.rowCount === 0) throw new Error('Collection not found.');

    for (let i = 0; i < orderedGuideIds.length; i += 1) {
      await client.query(
        'UPDATE collection_guides SET position = $1 WHERE collection_id = $2 AND guide_id = $3',
        [i, collectionId, orderedGuideIds[i]]
      );
    }
  });
}

async function setCollectionPositions({ userId, orderedCollectionIds }) {
  await withTransaction(async (client) => {
    for (let i = 0; i < orderedCollectionIds.length; i += 1) {
      await client.query(
        'UPDATE collections SET position = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [i, orderedCollectionIds[i], userId]
      );
    }
  });
}

// Returns the set of collection ids a guide belongs to for the current user (for the Add-to menu).
async function listCollectionIdsForGuide({ userId, guideId }) {
  const rows = await getAll(
    `SELECT c.id FROM collections c
     JOIN collection_guides cg ON cg.collection_id = c.id
     WHERE c.user_id = $1 AND cg.guide_id = $2`,
    [userId, guideId]
  );
  return rows.map((r) => r.id);
}

module.exports = {
  listCollectionsForUser,
  createCollection,
  findCollectionForUser,
  updateCollection,
  deleteCollection,
  listGuidesInCollection,
  addGuideToCollection,
  removeGuideFromCollection,
  reorderGuides,
  setCollectionPositions,
  listCollectionIdsForGuide,
};
