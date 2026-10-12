const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../controllers/authController");

const router = express.Router();

// Frena ataques de fuerza bruta al login y al envío de correos.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    auth.renderAuth(
      res,
      req.path.startsWith("/reset") ? "resetRequest" : "login",
      { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
      429,
    ),
});

router.get("/", auth.loginPage);
router.post("/", limiter, auth.login);
router.get("/logout", auth.logout);

router.get("/reset", auth.resetRequestPage);
router.post("/reset", limiter, auth.resetRequest);
router.get("/reset/:token", auth.resetPage);
router.post("/reset/:token", limiter, auth.resetSubmit);

// Enlace antiguo del login.
router.get("/reset-password", (req, res) => res.redirect(301, "/reset"));

module.exports = router;
