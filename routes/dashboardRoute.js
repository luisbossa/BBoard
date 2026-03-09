const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authenticateToken = require("../middlewares/auth");
const notificationService = require("../services/notificationService");

router.get("/", authenticateToken, dashboardController.dashboard);
router.put(
  "/orders/:id/approve",
  authenticateToken,
  dashboardController.adminOrders,
);

router.get("/api/notifications", authenticateToken, async (req, res, next) => {
  try {
    const notifications = await notificationService.getNotifications(10);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.get("/notifications", authenticateToken, async (req, res, next) => {
  try {
    const notifications = await notificationService.getNotifications(50);

    res.render("notifications", {
      user: req.user,
      notifications,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics", authenticateToken, (req, res) => {
  res.render("analytics", {
    user: req.user,
  });
});

router.get("/profile", authenticateToken, (req, res) => {
  res.render("profile", {
    title: "Perfil",
    user: req.user,
  });
});

router.get("/settings", authenticateToken, (req, res) => {
  res.render("settings", {
    user: req.user,
  });
});

router.get("/billing", authenticateToken, (req, res) => {
  res.render("billing", {
    user: req.user,
  });
});

router.get("/products", authenticateToken, (req, res) => {
  res.render("products", {
    user: req.user,
  });
});

router.get("/messages", authenticateToken, (req, res) => {
  res.render("messages", {
    user: req.user,
  });
});

module.exports = router;
