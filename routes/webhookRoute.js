const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.post("/onvopay", async (req, res) => {
  try {
    const event = req.body;

    if (event.type === "payment-intent.succeeded") {
      const orderId = event.data.metadata.orderId;

      await pool.query(
        `
        UPDATE orders
        SET status = 'paid',
            paid_at = NOW()
        WHERE id = $1
        `,
        [orderId],
      );

      console.log("Orden actualizada:", orderId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
