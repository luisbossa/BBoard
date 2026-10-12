const crypto = require("crypto");
const express = require("express");
const env = require("../config/env");
const onvoService = require("../services/onvoService");

/* ============================================================
   TAREAS PROGRAMADAS (Vercel Cron, ver vercel.json)
   Vercel envía "Authorization: Bearer <CRON_SECRET>".
============================================================ */
const router = express.Router();

function requireCronSecret(req, res, next) {
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  const received = Buffer.from(req.get("authorization") || "");
  const ok =
    env.cronSecret &&
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);

  if (!ok) return res.status(401).json({ ok: false, message: "No autorizado" });
  next();
}

// Diario: pedidos con tarjeta sin pagar por más de 48 h → pagado (si ONVO cobró) o cancelado.
router.get("/expire-card-orders", requireCronSecret, async (req, res) => {
  const summary = await onvoService.expireAbandonedCardOrders();
  console.log("CRON expire-card-orders:", summary);
  res.json({ ok: true, ...summary });
});

module.exports = router;
