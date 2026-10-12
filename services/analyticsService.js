const pool = require("../db/pool");

/* ============================================================
   ANALÍTICAS — todo calculado desde Neon.
   "Venta" = pedido cobrado (paid, shipped o delivered).
   Las fechas se agrupan en hora de Costa Rica.
============================================================ */
const PAID = "('paid', 'shipped', 'delivered')";
const TZ = "America/Costa_Rica";
const RANGES = [7, 30, 90, 365];

const normalizeRange = (days) => (RANGES.includes(Number(days)) ? Number(days) : 30);

async function getSummary(days) {
  const range = normalizeRange(days);
  const since = `now() - interval '${range} days'`;
  const bucket = range > 90 ? "week" : "day";

  const [summary, daily, methods, provinces, products, statuses] = await Promise.all([
    pool.query(`
      SELECT count(*) FILTER (WHERE status IN ${PAID})::int AS sales,
             COALESCE(SUM(total) FILTER (WHERE status IN ${PAID}), 0)::int AS revenue,
             COALESCE(ROUND(AVG(total) FILTER (WHERE status IN ${PAID})), 0)::int AS avg_ticket,
             count(*)::int AS orders,
             count(DISTINCT lower(email))::int AS customers
      FROM orders WHERE created_at >= ${since}`),

    // Serie completa (periodos sin ventas = 0). Más de 90 días: por semana.
    pool.query(`
      SELECT to_char(b.start, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(o.total), 0)::int AS revenue,
             count(o.id)::int AS sales
      FROM generate_series(
             date_trunc('${bucket}', (now() AT TIME ZONE '${TZ}') - interval '${range - 1} days'),
             (now() AT TIME ZONE '${TZ}'),
             interval '1 ${bucket}') AS b(start)
      LEFT JOIN orders o
        ON date_trunc('${bucket}', o.created_at AT TIME ZONE '${TZ}') = b.start
       AND o.status IN ${PAID}
       AND o.created_at >= ${since}
      GROUP BY b.start ORDER BY b.start`),

    pool.query(`
      SELECT COALESCE(payment_method, 'otro') AS method,
             count(*)::int AS sales, SUM(total)::int AS revenue
      FROM orders WHERE status IN ${PAID} AND created_at >= ${since}
      GROUP BY 1 ORDER BY revenue DESC`),

    pool.query(`
      SELECT province_name AS province, count(*)::int AS sales, SUM(total)::int AS revenue
      FROM orders WHERE status IN ${PAID} AND created_at >= ${since}
      GROUP BY 1 ORDER BY sales DESC, revenue DESC LIMIT 7`),

    pool.query(`
      SELECT oi.product_name AS name, SUM(oi.quantity)::int AS units,
             SUM(oi.quantity * oi.price)::int AS revenue
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.status IN ${PAID} AND o.created_at >= ${since}
      GROUP BY 1 ORDER BY units DESC, revenue DESC LIMIT 10`),

    pool.query(`
      SELECT status, count(*)::int AS count
      FROM orders WHERE created_at >= ${since}
      GROUP BY 1`),
  ]);

  return {
    range,
    ranges: RANGES,
    bucket,
    summary: summary.rows[0],
    daily: daily.rows,
    methods: methods.rows,
    provinces: provinces.rows,
    products: products.rows,
    statuses: statuses.rows,
  };
}

module.exports = { getSummary, RANGES };
