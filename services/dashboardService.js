const pool = require("../db/pool");

/* ============================================================
   DASHBOARD — indicadores del mes, serie de 12 meses, más
   vendidos y contadores del menú. Los meses son calendario de
   Costa Rica. Los pedidos/listas salen de orderService.
============================================================ */
const PAID = "('paid', 'shipped', 'delivered')";
const TZ = "America/Costa_Rica";
const NOW = `(now() AT TIME ZONE '${TZ}')`;
const LOCAL = `(created_at AT TIME ZONE '${TZ}')`;
const THIS_MONTH = `${LOCAL} >= date_trunc('month', ${NOW})`;
const LAST_MONTH = `${LOCAL} >= date_trunc('month', ${NOW}) - interval '1 month'
                    AND ${LOCAL} < date_trunc('month', ${NOW})`;

async function getStats() {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(total) FILTER (WHERE status IN ${PAID} AND ${THIS_MONTH}), 0)::int AS revenue_month,
      COALESCE(SUM(total) FILTER (WHERE status IN ${PAID} AND ${LAST_MONTH}), 0)::int AS revenue_prev,
      COALESCE(SUM(total) FILTER (WHERE status IN ${PAID}), 0)::int AS revenue_total,
      count(*) FILTER (WHERE ${THIS_MONTH})::int AS orders_month,
      count(*) FILTER (WHERE ${LAST_MONTH})::int AS orders_prev,
      count(*) FILTER (WHERE ${THIS_MONTH} AND status IN ${PAID})::int AS paid_month,
      count(*) FILTER (WHERE status = 'pending')::int AS pending,
      COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0)::int AS pending_amount,
      count(*) FILTER (WHERE status = 'paid')::int AS to_ship,
      MIN(paid_at) FILTER (WHERE status = 'paid') AS oldest_to_ship,
      count(*)::int AS total_orders
    FROM orders
  `);
  return rows[0];
}

// Pedidos recibidos vs cobrados por mes (últimos 12, incluidos los vacíos).
async function getMonthly(months = 12) {
  const { rows } = await pool.query(
    `SELECT to_char(m.month, 'YYYY-MM') AS month,
            count(o.id)::int AS orders,
            count(o.id) FILTER (WHERE o.status IN ${PAID})::int AS paid,
            COALESCE(SUM(o.total) FILTER (WHERE o.status IN ${PAID}), 0)::int AS revenue
     FROM generate_series(
            date_trunc('month', ${NOW}) - ($1::int - 1) * interval '1 month',
            date_trunc('month', ${NOW}),
            interval '1 month') AS m(month)
     LEFT JOIN orders o ON date_trunc('month', o.created_at AT TIME ZONE '${TZ}') = m.month
     GROUP BY m.month
     ORDER BY m.month`,
    [months],
  );
  return rows;
}

async function getBestSellers(limit = 5) {
  const { rows } = await pool.query(
    `SELECT oi.product_name AS name,
            COALESCE(p.main_image, MAX(oi.image)) AS image,
            p.id AS product_id,
            SUM(oi.quantity)::int AS units,
            SUM(oi.quantity * oi.price)::int AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE o.status IN ${PAID}
     GROUP BY oi.product_name, p.id, p.main_image
     ORDER BY units DESC, revenue DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

// Contadores para el menú lateral (se consultan en cada página del panel).
async function getNavCounts() {
  const { rows } = await pool.query(`
    SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending,
           count(*) FILTER (WHERE status = 'paid')::int AS to_ship
    FROM orders
  `);
  return rows[0];
}

module.exports = { getStats, getMonthly, getBestSellers, getNavCounts };
