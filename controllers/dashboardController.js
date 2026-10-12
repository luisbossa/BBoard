const dashboardService = require("../services/dashboardService");
const orderService = require("../services/orderService");
const notificationService = require("../services/notificationService");
const activityService = require("../services/activityService");

exports.index = async (req, res) => {
  const [stats, bestSellers, tickets, recent] = await Promise.all([
    dashboardService.getStats(),
    dashboardService.getBestSellers(),
    // Lo que hay que preparar: pendientes y pagados sin enviar.
    orderService.listWithItems({ limit: 6, statuses: ["pending", "paid"] }),
    orderService.list({ limit: 10 }),
  ]);

  res.render("dashboard", {
    title: "Panel",
    stats,
    bestSellers,
    tickets,
    recentOrders: recent.orders,
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
