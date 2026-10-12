const pool = require("../db/pool");

/* ============================================================
   NOTIFICACIONES — se derivan de los pedidos (no hay tabla propia).
   El contador del header muestra lo que requiere acción:
   pedidos pendientes de pago y pagados sin enviar.
============================================================ */
const MESSAGES = {
  pending: "Nuevo pedido",
  paid: "Pago confirmado",
  shipped: "Pedido enviado",
  delivered: "Pedido entregado",
  cancelled: "Pedido cancelado",
};

const ICONS = {
  pending: "shopping_cart",
  paid: "payments",
  shipped: "local_shipping",
  delivered: "check_circle",
  cancelled: "cancel",
};

async function getNotifications(limit = 15) {
  const [{ rows }, { rows: counts }] = await Promise.all([
    pool.query(
      `SELECT id, order_number, status, total, payment_method,
              GREATEST(created_at, paid_at, shipped_at, delivered_at, cancelled_at) AS updated_at
       FROM orders
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit],
    ),
    pool.query(
      `SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending,
              count(*) FILTER (WHERE status = 'paid')::int AS to_ship
       FROM orders`,
    ),
  ]);

  return {
    actionable: counts[0].pending + counts[0].to_ship,
    counts: counts[0],
    items: rows.map((o) => ({
      orderId: o.id,
      type: o.status,
      icon: ICONS[o.status] || "receipt_long",
      message: `${MESSAGES[o.status] || "Pedido"} #${o.order_number ?? o.id}`,
      total: Number(o.total),
      paymentMethod: o.payment_method,
      date: o.updated_at,
    })),
  };
}

module.exports = { getNotifications };
