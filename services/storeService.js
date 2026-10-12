const env = require("../config/env");

/* ============================================================
   INTEGRACIÓN CON LA TIENDA (100puntadas)
   Cuando un pedido pasa a "pagado" desde el panel (SINPE aprobado o
   tarjeta verificada en ONVO), avisa a la tienda para que envíe el
   correo de confirmación al cliente.
   La tienda valida el header X-Webhook-Secret = SINPE_WEBHOOK_SECRET.
============================================================ */
async function notifyOrderPaid(orderId) {
  if (!env.sinpeWebhookSecret) {
    console.warn("STORE WEBHOOK: falta SINPE_WEBHOOK_SECRET, no se avisa a la tienda");
    return false;
  }

  try {
    const response = await fetch(`${env.storeUrl}/webhooks/order-paid`, {
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

/* ---------- Imágenes de la tienda ----------
   Las fotos del catálogo están en el dominio de la tienda (/images/...).
   El panel las pide desde el servidor y las entrega desde su propio
   dominio: así no dependen de las cabeceras CORP de la tienda. */
const IMAGE_PATH = /^\/images\/[\w\-./]+\.(?:jpe?g|png|webp|avif|gif)$/i;

async function fetchImage(path) {
  if (!IMAGE_PATH.test(path) || path.includes("..")) return null;

  const response = await fetch(`${env.storeUrl}${path}`, {
    signal: AbortSignal.timeout(8000),
  });
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.startsWith("image/")) return null;

  return { type, body: Buffer.from(await response.arrayBuffer()) };
}

module.exports = { notifyOrderPaid, fetchImage };
