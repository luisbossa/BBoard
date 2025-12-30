const dashboardService = require("../services/dashboardService");

exports.dashboard = async (req, res, next) => {
  try {
    const [
      products,
      dashboardStats,
      orderTickets,
      recentOrdersTable // 👈 NUEVO
    ] = await Promise.all([
      dashboardService.getLatestProducts(),
      dashboardService.getOrderStats(),
      dashboardService.getRecentOrders(),       // tickets
      dashboardService.getRecentOrdersTable(),  // tabla
    ]);

    res.render("index", {
      title: "Dashboard",
      products,
      dashboardStats,
      orderTickets,
      recentOrdersTable,
    });
  } catch (err) {
    next(err);
  }
};
