// dashboardController.js
const pool = require("../db/pool");
const dashboardService = require("../services/dashboardService");
const notificationService = require("../services/notificationService");
const webhookService = require("../services/webhookService");

exports.dashboard = async (req, res, next) => {
  try {
    const [products, dashboardStats, orderTickets, recentOrdersTable] =
      await Promise.all([
        dashboardService.getLatestProducts(),
        dashboardService.getOrderStats(),
        dashboardService.getRecentOrders(),
        dashboardService.getRecentOrdersTable(),
      ]);

    // Aquí podrías hacer algo con el req.user si es necesario:
    const user = req.user; // Información del usuario autenticado

    res.render("main", {
      title: "Dashboard",
      products,
      dashboardStats,
      orderTickets,
      recentOrdersTable,
      user, // Pasamos la información del usuario al frontend si lo necesitas
    });
  } catch (err) {
    next(err);
  }
};

exports.adminOrders = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `
      UPDATE orders
      SET
        status = 'paid',
        paid_at = NOW()
      WHERE id = $1
        AND status = 'pending'
      `,
      [id],
    );

    if (rowCount === 0) {
      return res.status(400).json({
        ok: false,
        message: "El pedido no existe o ya fue aprobado",
      });
    }

    await notificationService.createActivity(req.user?.id || 1, "order_paid", {
      orderId: id,
    });

    await webhookService.notifySinpePaid(id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
