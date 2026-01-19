const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authenticateToken = require("../middlewares/auth");
const notificationService = require("../services/notificationService");

router.get("/", authenticateToken, dashboardController.dashboard);
router.put(
  "/orders/:id/approve",
  authenticateToken,
  dashboardController.adminOrders
);

router.get("/notifications", async (req, res, next) => {
  try {
    const notifications =
      await notificationService.getNotifications(10);

    res.json(notifications);
  } catch (err) {
    next(err);
  }
});


module.exports = router;
