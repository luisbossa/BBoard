const pool = require("../db/pool");

async function getNotifications(limit = 15) {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      order_number,
      status,
      total,
      payment_method,
      created_at,
      paid_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return rows.map((o) => {
    let type = "order_created";
    let message = `Nueva orden #${o.order_number}`;

    if (o.status === "paid") {
      type = "order_paid";
      message = `Pago confirmado #${o.order_number}`;
    }

    if (o.status === "completed") {
      type = "order_completed";
      message = `Pedido completado #${o.order_number}`;
    }

    return {
      id: o.id,
      type,
      message,
      created_at: o.created_at,
      metadata: {
        total: o.total,
        paymentMethod: o.payment_method,
      },
    };
  });
}

async function createActivity(userId, action, metadata = {}) {
  await pool.query(
    `
    INSERT INTO user_activity (user_id, action, metadata, created_at)
    VALUES ($1, $2, $3, NOW())
    `,
    [userId, action, JSON.stringify(metadata)]
  );
}

module.exports = {
  getNotifications,
  createActivity, 
};
