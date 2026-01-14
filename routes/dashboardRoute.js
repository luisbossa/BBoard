const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
// Importa el middleware de autenticación
const authenticateToken = require("../middlewares/auth");

// Ruta protegida para el Dashboard (solo usuarios autenticados)
router.get("/", authenticateToken, dashboardController.dashboard);

module.exports = router;
