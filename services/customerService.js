const pool = require("../db/pool");
const HttpError = require("../utils/httpError");

/* ============================================================
   CLIENTES — la tienda no tiene cuentas de cliente: se agrupan
   los pedidos por correo (en minúsculas). Solo cuentan como
   gasto los pedidos cobrados (paid, shipped, delivered).
============================================================ */
const PAID = "('paid', 'shipped', 'delivered')";
const PAGE_SIZE = 25;

const SORTS = {
  recent: "last_order DESC",
  spent: "total_spent DESC",
  orders: "orders_count DESC",
  name: "full_name ASC",
};

async function list({ q, sort, page } = {}) {
  const current = Math.max(1, Number.parseInt(page, 10) || 1);
  const term = typeof q === "string" ? q.trim() : "";
  const params = term ? [term] : [];
  const having = term
    ? `HAVING lower(o.email) ILIKE '%' || $1 || '%'
         OR (array_agg(o.full_name ORDER BY o.created_at DESC))[1] ILIKE '%' || $1 || '%'
         OR (array_agg(o.phone ORDER BY o.created_at DESC))[1] ILIKE '%' || $1 || '%'`
    : "";

  const base = `
    SELECT lower(o.email) AS email,
           (array_agg(o.full_name ORDER BY o.created_at DESC))[1] AS full_name,
           (array_agg(o.phone ORDER BY o.created_at DESC))[1] AS phone,
           (array_agg(o.province_name ORDER BY o.created_at DESC))[1] AS province,
           count(*)::int AS orders_count,
           count(*) FILTER (WHERE o.status IN ${PAID})::int AS paid_count,
           COALESCE(SUM(o.total) FILTER (WHERE o.status IN ${PAID}), 0)::int AS total_spent,
           MIN(o.created_at) AS first_order,
           MAX(o.created_at) AS last_order
    FROM orders o
    GROUP BY lower(o.email)
    ${having}`;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `${base} ORDER BY ${SORTS[sort] || SORTS.recent}
       LIMIT ${PAGE_SIZE} OFFSET ${(current - 1) * PAGE_SIZE}`,
      params,
    ),
    pool.query(`SELECT count(*)::int AS total FROM (${base}) c`, params),
  ]);

  const total = countRows[0].total;
  return {
    customers: rows,
    pagination: { page: current, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total },
  };
}

async function getByEmail(email) {
  const { rows } = await pool.query(
    `SELECT lower(o.email) AS email,
            (array_agg(o.full_name ORDER BY o.created_at DESC))[1] AS full_name,
            (array_agg(o.phone ORDER BY o.created_at DESC))[1] AS phone,
            (array_agg(o.national_id ORDER BY o.created_at DESC))[1] AS national_id,
            (array_agg(concat_ws(', ', o.province_name, o.canton_name, o.district_name)
               ORDER BY o.created_at DESC))[1] AS location,
            (array_agg(o.address ORDER BY o.created_at DESC))[1] AS address,
            count(*)::int AS orders_count,
            count(*) FILTER (WHERE o.status IN ${PAID})::int AS paid_count,
            COALESCE(SUM(o.total) FILTER (WHERE o.status IN ${PAID}), 0)::int AS total_spent,
            MIN(o.created_at) AS first_order,
            MAX(o.created_at) AS last_order
     FROM orders o
     WHERE lower(o.email) = lower($1)
     GROUP BY lower(o.email)`,
    [email],
  );
  if (!rows[0]) throw new HttpError(404, "Cliente no encontrado");
  return rows[0];
}

module.exports = { list, getByEmail };
