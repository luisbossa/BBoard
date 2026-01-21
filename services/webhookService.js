async function notifySinpePaid(orderId) {
  try {
    const response = await fetch(
      process.env.STORE_WEBHOOK_URL + "/webhooks/sinpe-paid",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": process.env.WEBHOOK_SECRET,
        },
        body: JSON.stringify({ orderId }),
      },
    );

    if (!response.ok) {
      console.error("Webhook SINPE falló:", response.status);
    }
  } catch (err) {
    console.error("Webhook SINPE error:", err.message);
  }
}

module.exports = { notifySinpePaid };
