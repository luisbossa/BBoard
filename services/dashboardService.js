const pool = require("../db/pool");

// Traer últimos productos
async function getLatestProducts(limit = 10) {
  const { rows } = await pool.query(
    `
    SELECT
      oi.product_name AS name,
      oi.image,
      oi.price,
      oi.quantity,
      o.status AS category
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    ORDER BY o.created_at DESC
    LIMIT $1
  `,
    [limit]
  );

  return rows.map((p) => ({
    name: p.name,
    category: p.category,
    image: p.image || "/images/default.jpg",
    sales: `₡${p.price.toLocaleString()}`,
  }));
}

// Traer estadísticas generales de pedidos
async function getOrderStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_orders,
      COALESCE(SUM(total), 0) AS total_revenue,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
      COUNT(*) FILTER (WHERE paid_at IS NOT NULL)::int AS paid_orders
    FROM orders
  `);
  const stats = rows[0];

  return [
    {
      title: "Total de pedidos",
      value: stats.total_orders,
      icon: "bx-shopping-bag",
    },
    {
      title: "Ingresos totales",
      value: `₡${Number(stats.total_revenue).toLocaleString()}`,
      icon: "bx-line-chart",
    },
    {
      title: "Pedidos pendientes",
      value: stats.pending_orders,
      icon: "bx-time-five",
    },
    {
      title: "Pedidos pagados",
      value: stats.paid_orders,
      icon: "bx-check-circle",
    },
  ];
}

// Traer últimos pedidos como tickets
async function getRecentOrders(limit = 10) {
  const { rows } = await pool.query(
    `
    SELECT
      o.id AS order_id,
      o.email,
      o.created_at,
      o.status AS order_status,
      oi.product_name,
      oi.price,
      oi.quantity,
      oi.image
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    ORDER BY o.created_at DESC
    LIMIT $1
  `,
    [limit]
  );

  return rows.map((o) => ({
    id: o.order_id,
    client: o.email,
    date: o.created_at,
    status: o.order_status,
    product: o.product_name,
    quantity: o.quantity,
    price: `₡${o.price.toLocaleString()}`,
    total: `₡${(o.price * o.quantity).toLocaleString()}`,
    image: o.image || "/images/default.jpg",
  }));
}

// Traer pedidos recientes para la TABLA (estructura simple)
async function getRecentOrdersTable(limit = 10) {
  const { rows } = await pool.query(
    `
    SELECT
      o.id,
      o.email,
      o.created_at,
      o.status,
      o.total,
      o.paid_at
    FROM orders o
    ORDER BY o.created_at DESC
    LIMIT $1
  `,
    [limit]
  );

  return rows.map((o) => ({
    id: o.id,
    client: o.email,
    date: o.created_at,
    orderStatus: o.status,
    paymentStatus: o.paid_at ? "paid" : "pending",
    total: `₡${Number(o.total).toLocaleString()}`,
  }));
}


module.exports = {
  getLatestProducts,
  getOrderStats,
  getRecentOrders,      // tickets
  getRecentOrdersTable,
};
