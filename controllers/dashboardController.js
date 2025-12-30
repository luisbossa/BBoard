const dashboardService = require("../services/dashboardService");

exports.dashboard = async (req, res, next) => {
  try {
    const [
      products,
      dashboardStats,
      orderTickets,
      recentOrdersTable 
    ] = await Promise.all([
      dashboardService.getLatestProducts(),
      dashboardService.getOrderStats(),
      dashboardService.getRecentOrders(),       
      dashboardService.getRecentOrdersTable(), 
    ]);

    res.render("main", {
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
