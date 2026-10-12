const pool = require("../db/pool");

/* ============================================================
   DASHBOARD — tarjetas de resumen y más vendidos.
   Los pedidos/tickets salen de orderService.
============================================================ */
const PAID = "('paid', 'shipped', 'delivered')";

async function getStats() {
  const { rows } = await pool.query(`
    SELECT
      count(*)::int AS total_orders,
      COALESCE(SUM(total) FILTER (WHERE status IN ${PAID}), 0)::int AS total_revenue,
      count(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
      count(*) FILTER (WHERE status = 'paid')::int AS to_ship_orders
    FROM orders
  `);
  return rows[0];
}

async function getBestSellers(limit = 8) {
  const { rows } = await pool.query(
    `SELECT oi.product_name AS name,
            COALESCE(p.main_image, MAX(oi.image)) AS image,
            p.id AS product_id,
            SUM(oi.quantity)::int AS units_sold,
            MAX(o.created_at) AS last_sale
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE o.status IN ${PAID}
     GROUP BY oi.product_name, p.id, p.main_image
     ORDER BY units_sold DESC, last_sale DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

module.exports = { getStats, getBestSellers };
