const dashboardService = require("../services/dashboardService");
const orderService = require("../services/orderService");
const notificationService = require("../services/notificationService");
const activityService = require("../services/activityService");

exports.index = async (req, res) => {
  const [stats, monthly, bestSellers, toCollect, toShip, recent, activity] = await Promise.all([
    dashboardService.getStats(),
    dashboardService.getMonthly(12),
    dashboardService.getBestSellers(5),
    // "Por atender": lo más antiguo primero (es lo más urgente).
    orderService.list({ status: "pending", limit: 6, sort: "oldest" }),
    orderService.list({ status: "paid", limit: 6, sort: "oldest" }),
    orderService.list({ limit: 8 }),
    activityService.recent(6),
  ]);

  res.render("dashboard", {
    title: "Panel",
    stats,
    monthly,
    bestSellers,
    toCollect: toCollect.orders,
    toShip: toShip.orders,
    recentOrders: recent.orders,
    activity,
  });
};

exports.notifications = async (req, res) => {
  const [notifications, activity] = await Promise.all([
    notificationService.getNotifications(50),
    activityService.recent(30),
  ]);
  res.render("notifications", { title: "Notificaciones", notifications, activity });
};

exports.notificationsApi = async (req, res) => {
  res.json(await notificationService.getNotifications(10));
};
