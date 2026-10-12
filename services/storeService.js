const env = require("../config/env");

/* ============================================================
   INTEGRACIÓN CON LA TIENDA (100puntadas)
   Cuando el panel aprueba un pago SINPE, avisa a la tienda para
   que envíe el correo de confirmación al cliente.
   La tienda valida el header X-Webhook-Secret = SINPE_WEBHOOK_SECRET.
============================================================ */
async function notifySinpePaid(orderId) {
  if (!env.sinpeWebhookSecret) {
    console.warn("STORE WEBHOOK: falta SINPE_WEBHOOK_SECRET, no se avisa a la tienda");
    return false;
  }

  try {
    const response = await fetch(`${env.storeUrl}/webhooks/sinpe-paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": env.sinpeWebhookSecret,
      },
      body: JSON.stringify({ orderId }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("STORE WEBHOOK: respuesta", response.status);
      return false;
    }
    return true;
  } catch (err) {
    // El pago ya quedó aprobado; solo falló el correo al cliente.
    console.error("STORE WEBHOOK ERROR:", err.message);
    return false;
  }
}

module.exports = { notifySinpePaid };
