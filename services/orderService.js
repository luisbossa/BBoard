const pool = require("../db/pool");
const HttpError = require("../utils/httpError");
const activityService = require("./activityService");
const storeService = require("./storeService");

/* ============================================================
   PEDIDOS
   Ciclo de vida: pending → paid → shipped → delivered
                  pending/paid → cancelled
   La tienda crea los pedidos (pending) y ONVO los marca paid;
   el panel aprueba SINPE y gestiona envío/entrega/cancelación.
============================================================ */
const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

const TRANSITIONS = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const TIMESTAMP = {
  paid: "paid_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
};

const PAGE_SIZE = 20;

const ITEMS_JSON = `
  COALESCE(
    json_agg(
      json_build_object(
        'productId', oi.product_id,
        'productName', oi.product_name,
        'image', oi.image,
        'price', oi.price,
        'quantity', oi.quantity,
        'topSize', oi.top_size,
        'bottomSize', oi.bottom_size,
        'bottomStyle', oi.bottom_style,
        'size', oi.size,
        'color', oi.color
      ) ORDER BY oi.id
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'
  ) AS items`;

const toOrder = (o) => ({
  id: o.id,
  orderNumber: o.order_number,
  client: o.full_name,
  email: o.email,
  phone: o.phone,
  nationalId: o.national_id,
  status: o.status,
  paymentMethod: o.payment_method,
  subtotal: Number(o.subtotal),
  discount: Number(o.discount),
  shipping: Number(o.shipping),
  total: Number(o.total),
  totalItems: Number(o.total_items || 0),
  province: o.province_name,
  canton: o.canton_name,
  district: o.district_name,
  neighborhood: o.neighborhood,
  address: o.address,
  addressDetails: o.address_details,
  trackingNumber: o.tracking_number,
  adminNotes: o.admin_notes,
  createdAt: o.created_at,
  paidAt: o.paid_at,
  shippedAt: o.shipped_at,
  deliveredAt: o.delivered_at,
  cancelledAt: o.cancelled_at,
  items: o.items || [],
  nextStatuses: TRANSITIONS[o.status] || [],
});

// Arma el WHERE de la lista a partir de los filtros de la URL.
function buildFilters({ status, method, q, from, to, email }) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replaceAll("?", `$${params.length}`));
  };

  if (STATUSES.includes(status)) add("o.status = ?", status);
  if (["sinpe", "card"].includes(method)) add("o.payment_method = ?", method);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from || "")) add("o.created_at >= ?::date", from);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to || "")) add("o.created_at < ?::date + 1", to);
  if (email) add("lower(o.email) = lower(?)", email);

  const term = typeof q === "string" ? q.trim().replace(/^#/, "") : "";
  if (term) {
    add(
      `(o.order_number::text = ? OR o.id::text = ?
        OR o.full_name ILIKE '%' || ? || '%' OR o.email ILIKE '%' || ? || '%'
        OR o.phone ILIKE '%' || ? || '%' OR o.national_id ILIKE '%' || ? || '%')`,
      term,
    );
  }

  return { where: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

async function list(filters = {}) {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Number(filters.limit) || PAGE_SIZE;
  const { where, params } = buildFilters(filters);

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT o.*, COALESCE(SUM(oi.quantity), 0) AS total_items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
    pool.query(`SELECT count(*)::int AS total FROM orders o ${where}`, params),
  ]);

  const total = countRows[0].total;
  return {
    orders: rows.map(toOrder),
    pagination: { page, pages: Math.max(1, Math.ceil(total / limit)), total },
  };
}

// Pedidos con sus ítems (tickets del dashboard / impresión).
async function listWithItems({ limit = 10, statuses } = {}) {
  const { rows } = await pool.query(
    `SELECT o.*, COALESCE(SUM(oi.quantity), 0) AS total_items, ${ITEMS_JSON}
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${statuses ? "WHERE o.status = ANY($2)" : ""}
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $1`,
    statuses ? [limit, statuses] : [limit],
  );
  return rows.map(toOrder);
}

async function getById(id) {
  if (!/^\d+$/.test(String(id))) throw new HttpError(404, "Pedido no encontrado");

  const { rows } = await pool.query(
    `SELECT o.*, COALESCE(SUM(oi.quantity), 0) AS total_items, ${ITEMS_JSON}
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id = $1
     GROUP BY o.id`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "Pedido no encontrado");

  const { rows: history } = await pool.query(
    `SELECT a.action, a.metadata, a.created_at, u.full_name
     FROM user_activity a JOIN users u ON u.id = a.user_id
     WHERE a.metadata->>'orderId' = $1::text
     ORDER BY a.created_at DESC`,
    [id],
  );

  return { ...toOrder(rows[0]), history };
}

/* Cambia el estado si la transición es válida. El UPDATE incluye
   el estado anterior en el WHERE: si otro usuario (o el webhook de
   ONVO) lo cambió entretanto, no se pisa. */
async function updateStatus(id, nextStatus, user, { trackingNumber } = {}) {
  const order = await getById(id);

  if (!order.nextStatuses.includes(nextStatus)) {
    throw new HttpError(
      409,
      `No se puede pasar de "${order.status}" a "${nextStatus}"`,
    );
  }

  await pool.transaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE orders
       SET status = $2, ${TIMESTAMP[nextStatus]} = now(),
           tracking_number = COALESCE($4, tracking_number)
       WHERE id = $1 AND status = $3`,
      [order.id, nextStatus, order.status, trackingNumber?.trim() || null],
    );
    if (!rowCount) throw new HttpError(409, "El pedido cambió mientras lo editabas. Recarga la página.");

    await activityService.log(
      user.id,
      `order_${nextStatus}`,
      { orderId: order.id, orderNumber: order.orderNumber, from: order.status },
      client,
    );
  });

  // Pago SINPE aprobado a mano → la tienda envía el correo al cliente.
  let customerNotified = null;
  if (nextStatus === "paid" && order.paymentMethod === "sinpe") {
    customerNotified = await storeService.notifySinpePaid(order.id);
  }

  return { from: order.status, to: nextStatus, customerNotified };
}

async function updateNotes(id, { adminNotes, trackingNumber }, user) {
  const { rowCount } = await pool.query(
    `UPDATE orders SET admin_notes = $2, tracking_number = $3 WHERE id = $1`,
    [id, adminNotes?.trim() || null, trackingNumber?.trim() || null],
  );
  if (!rowCount) throw new HttpError(404, "Pedido no encontrado");
  await activityService.log(user.id, "order_notes", { orderId: Number(id) });
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  list,
  listWithItems,
  getById,
  updateStatus,
  updateNotes,
};
