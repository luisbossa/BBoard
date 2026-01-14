// dashboardController.js
const dashboardService = require("../services/dashboardService");

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
