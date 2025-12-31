const pool = require("../db/pool");

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
      icon: "shopping_bag", // Material Symbols Rounded
    },
    {
      title: "Ingresos totales",
      value: `₡${Number(stats.total_revenue).toLocaleString()}`,
      icon: "insights",
    },
    {
      title: "Pedidos pendientes",
      value: stats.pending_orders,
      icon: "schedule",
    },
    {
      title: "Pedidos pagados",
      value: stats.paid_orders,
      icon: "check_circle",
    },
  ];
}

// Productos más vendidos / en tendencia
async function getLatestProducts(limit = 10) {
  const { rows } = await pool.query(
    `
    SELECT
      oi.product_name AS name,
      MAX(oi.image) AS image,
      SUM(oi.quantity)::int AS units_sold,
      MAX(o.created_at) AS last_sale
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    GROUP BY oi.product_name
    ORDER BY units_sold DESC
    LIMIT $1
    `,
    [limit]
  );

  return rows.map((p) => ({
    name: p.name,
    image: p.image || "/images/default.PNG",
    unitsSold: p.units_sold,
    lastSale: p.last_sale,
  }));
}

// Pedidos 3 columnas tickets
async function getRecentOrders(limit = 10) {
  const { rows } = await pool.query(
    `
    SELECT
    o.id,
    o.order_number,
    COALESCE(u.full_name, o.full_name) AS client,
    o.email,
    o.phone,
    o.national_id,
    o.created_at,
    o.status,
    o.payment_method,
    o.shipping,
    o.total AS order_total,

    -- total de artículos
    COALESCE(SUM(oi.quantity), 0) AS total_items,

    o.province_name,
    o.canton_name,
    o.district_name,
    o.neighborhood,
    o.address,

    json_agg(
      json_build_object(
        'productName', oi.product_name,
        'image', oi.image,
        'price', oi.price,
        'quantity', oi.quantity,
        'topSize', oi.top_size,
        'bottomSize', oi.bottom_size,
        'bottomStyle', oi.bottom_style,
        'size', oi.size,
        'color', oi.color
      )
    ) FILTER (WHERE oi.id IS NOT NULL) AS items

  FROM orders o
  LEFT JOIN users u ON u.id = o.user_id
  LEFT JOIN order_items oi ON oi.order_id = o.id

  GROUP BY o.id, u.full_name
  ORDER BY o.created_at DESC
  LIMIT $1;
      `,
    [limit]
  );

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    client: o.client,
    email: o.email,
    phone: o.phone,
    nationalId: o.national_id,
    date: o.created_at,
    status: o.status,
    paymentMethod: o.payment_method,
    shippingCost: o.shipping,

    totalItems: Number(o.total_items),
    orderTotal: Number(o.order_total),

    province: o.province_name,
    canton: o.canton_name,
    district: o.district_name,
    neighborhood: o.neighborhood,
    address: o.address,
    items: o.items || [],
  }));
}

async function getRecentOrdersTable(limit = 10) {
  const { rows } = await pool.query(
    `
    SELECT
      o.id,
      o.order_number,
      o.email,
      o.phone,
      COALESCE(u.full_name, o.full_name) AS client_name,
      o.created_at,
      o.status,
      o.total,
      o.payment_method,
      COALESCE(SUM(oi.quantity), 0) AS total_items
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id, u.full_name
    ORDER BY o.created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    client: o.client_name,
    email: o.email,
    phone: o.phone,
    date: o.created_at,
    orderStatus: o.status,
    total: `₡${Number(o.total).toLocaleString()}`,
    totalItems: Number(o.total_items),
    paymentMethod:
      o.payment_method === "sinpe"
        ? "SINPE"
        : o.payment_method === "card"
        ? "Tarjeta"
        : o.payment_method || "—",
  }));
}

module.exports = {
  getLatestProducts,
  getOrderStats,
  getRecentOrders,
  getRecentOrdersTable,
};
