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
    res.status(429).render(req.path.startsWith("/reset") ? "auth/reset-request" : "auth/login", {
      layout: false,
      error: "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
      message: null,
      username: "",
    }),
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
