const express = require("express");
const router = express.Router();

// Ruta de logout
router.get("/logout", (req, res) => {
  // Eliminar el token de la cookie
  res.clearCookie("auth_token");

  // Redirigir al usuario a la página de login
  res.redirect("/");
});

module.exports = router; // Asegúrate de exportarlo como un router
