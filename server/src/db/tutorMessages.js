const { query, getAll } = require('./index');
const { tutorMessageId } = require('../utils/ids');

function toMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function listTutorMessages(userId, subtopicId) {
  const rows = await getAll(
    `SELECT id, role, content, created_at FROM tutor_messages
     WHERE user_id = $1 AND subtopic_id = $2
     ORDER BY created_at ASC, id ASC`,
    [userId, subtopicId]
  );
  return rows.map(toMessage);
}

async function appendTutorMessage({ userId, subtopicId, role, content }) {
  const id = tutorMessageId();
  await query(
    `INSERT INTO tutor_messages (id, user_id, subtopic_id, role, content)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, subtopicId, role, content]
  );
  return id;
}

async function clearTutorMessages(userId, subtopicId) {
  await query(
    'DELETE FROM tutor_messages WHERE user_id = $1 AND subtopic_id = $2',
    [userId, subtopicId]
  );
}

module.exports = {
  listTutorMessages,
  appendTutorMessage,
  clearTutorMessages,
};
