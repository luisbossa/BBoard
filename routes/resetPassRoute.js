// routes/resetPassRoute.js
const express = require("express");
const router = express.Router();
const resetController = require("../controllers/resetController");

// Página de formulario para pedir el reset
router.get("/", resetController.showResetForm);

// Enviar el enlace por email
router.post("/", resetController.sendResetLink);

// Página de cambio de contraseña con token
router.get("/:token", resetController.showNewPasswordForm);

// Actualizar la contraseña
router.post("/:token", resetController.updatePassword);

module.exports = router;
