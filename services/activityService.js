const pool = require("../db/pool");

/* ============================================================
   BITÁCORA (tabla user_activity): quién hizo qué en el panel.
   `db` permite registrar dentro de una transacción en curso.
============================================================ */
async function log(userId, action, metadata = {}, db = pool) {
  await db.query(
    "INSERT INTO user_activity (user_id, action, metadata) VALUES ($1, $2, $3)",
    [userId, action, JSON.stringify(metadata)],
  );
}

async function recent(limit = 30) {
  const { rows } = await pool.query(
    `SELECT a.id, a.action, a.metadata, a.created_at, COALESCE(u.full_name, 'Sistema') AS full_name
     FROM user_activity a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

module.exports = { log, recent };
