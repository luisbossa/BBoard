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

/* ---------- Línea de tiempo (página Actividad) ----------
   Une la bitácora del panel (user_activity) con los pedidos que
   llegan desde la tienda (orders.created_at → "order_received"). */
const TZ = "America/Costa_Rica";
const FEED_PAGE = 40;

const EVENTS = `
  SELECT 'a' || a.id AS key, a.created_at AS at, a.action, a.metadata,
         a.user_id, u.full_name AS actor
  FROM user_activity a
  LEFT JOIN users u ON u.id = a.user_id
  UNION ALL
  SELECT 'o' || o.id, o.created_at, 'order_received',
         jsonb_build_object('orderId', o.id, 'orderNumber', o.order_number, 'client', o.full_name,
                            'total', o.total, 'method', o.payment_method),
         NULL, NULL
  FROM orders o`;

// Filtros de la página: Todo · Pedidos · Catálogo · Equipo · Sistema
const FILTERS = {
  all: "TRUE",
  orders: "action LIKE 'order%'",
  catalog: "(action LIKE 'product%' OR action LIKE 'collection%' OR action LIKE 'campaign%')",
  team: "user_id IS NOT NULL",
  system: "user_id IS NULL AND action <> 'order_received'",
};

async function feed({ type, page } = {}) {
  const filter = Object.hasOwn(FILTERS, type) ? type : "all";
  const current = Math.max(1, Number.parseInt(page, 10) || 1);

  const [{ rows: items }, { rows: [counts] }, { rows: [today] }] = await Promise.all([
    pool.query(
      `SELECT * FROM (${EVENTS}) e WHERE ${FILTERS[filter]}
       ORDER BY at DESC LIMIT ${FEED_PAGE + 1} OFFSET ${(current - 1) * FEED_PAGE}`,
    ),
    pool.query(
      `SELECT ${Object.entries(FILTERS)
        .map(([key, sql]) => `count(*) FILTER (WHERE ${sql})::int AS ${key}`)
        .join(", ")}
       FROM (${EVENTS}) e`,
    ),
    // Resumen de hoy (día calendario de Costa Rica).
    pool.query(
      `SELECT count(*) FILTER (WHERE action = 'order_received')::int AS received,
              count(*) FILTER (WHERE action = 'order_paid')::int AS paid,
              count(*) FILTER (WHERE action = 'order_shipped')::int AS shipped,
              count(*) FILTER (WHERE user_id IS NOT NULL)::int AS team
       FROM (${EVENTS}) e
       WHERE (at AT TIME ZONE '${TZ}')::date = (now() AT TIME ZONE '${TZ}')::date`,
    ),
  ]);

  return {
    filter,
    items: items.slice(0, FEED_PAGE),
    hasMore: items.length > FEED_PAGE,
    page: current,
    counts,
    today,
  };
}

module.exports = { log, recent, feed, FILTERS };
