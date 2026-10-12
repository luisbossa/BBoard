const pool = require("../db/pool");
const env = require("../config/env");
const HttpError = require("../utils/httpError");
const orderService = require("./orderService");

/* ============================================================
   ONVO PAY — consulta (solo lectura) de pagos con tarjeta.
   La tienda crea el PaymentIntent y guarda su id en el pedido;
   el panel lo consulta para confirmar pagos cuyo webhook no llegó
   y para cancelar los pedidos abandonados.
   Montos en la unidad mínima: ₡1 = 100.
============================================================ */
const API = "https://api.onvopay.com/v1";
const ABANDON_HOURS = 48;

async function request(path) {
  if (!env.onvoSecretKey) {
    throw new HttpError(500, "Falta ONVOPAY_SECRET_KEY para consultar ONVO");
  }
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${env.onvoSecretKey}` },
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, `ONVO respondió ${response.status}: ${data.message || "error"}`);
  }
  return data;
}

const getIntent = (id) => request(`/payment-intents/${encodeURIComponent(id)}`);

/* Listado paginado (GET /v1/payment-intents/account). Devuelve
   { data: [...], meta: { cursorNext } }. Lo usa el script de conciliación. */
const listIntents = ({ startingAfter, since } = {}) => {
  const params = new URLSearchParams({ limit: "100" });
  if (startingAfter) params.set("startingAfter", startingAfter);
  if (since) params.set("createdAt[gte]", new Date(since).toISOString());
  return request(`/payment-intents/account?${params}`);
};

// ¿El intent corresponde a este pedido y cobró exactamente su total?
const isPaidFor = (intent, order) =>
  intent?.status === "succeeded" &&
  Number(intent.metadata?.orderId) === Number(order.id) &&
  Number(intent.amount) === Math.round(Number(order.total) * 100);

/* Verifica un pedido con tarjeta pendiente contra ONVO.
   Devuelve { status: "paid" | "pending" | "no-intent", intentStatus } */
async function verifyCardOrder(orderId, user, { notifyStore = true } = {}) {
  const order = await orderService.getById(orderId);

  if (order.paymentMethod !== "card") throw new HttpError(400, "Este pedido no es con tarjeta");
  if (order.status !== "pending") return { status: order.status, intentStatus: null };
  if (!order.paymentIntentId) return { status: "no-intent", intentStatus: null };

  const intent = await getIntent(order.paymentIntentId);
  if (isPaidFor(intent, order)) {
    await orderService.updateStatus(order.id, "paid", user, {
      reason: "Pago con tarjeta confirmado en ONVO",
      notifyStore,
    });
    return { status: "paid", intentStatus: intent.status };
  }
  return { status: "pending", intentStatus: intent.status };
}

/* Pedidos con tarjeta pendientes por más de 48 h: si ONVO los cobró se
   marcan pagados; si no, se cancelan (el cliente abandonó el pago). */
async function expireAbandonedCardOrders() {
  const { rows } = await pool.query(
    `SELECT id FROM orders
     WHERE payment_method = 'card' AND status = 'pending'
       AND created_at < now() - interval '${ABANDON_HOURS} hours'
     ORDER BY id`,
  );

  const summary = { checked: rows.length, paid: 0, cancelled: 0, skipped: 0, errors: 0 };

  for (const { id } of rows) {
    try {
      const result = await verifyCardOrder(id, null);
      if (result.status === "paid") {
        summary.paid++;
      } else if (result.status === "no-intent" || result.intentStatus === "processing") {
        // Solo se cancela lo que ONVO confirma como no pagado. Sin intent no hay
        // forma de verificarlo (p. ej. pedidos antiguos): queda para revisión manual.
        // "processing": ONVO aún lo procesa, se revisa en la próxima ejecución.
        summary.skipped++;
      } else if (result.status === "pending") {
        await orderService.updateStatus(id, "cancelled", null, {
          reason: `Pago con tarjeta no completado en ${ABANDON_HOURS} h`,
        });
        summary.cancelled++;
      }
    } catch (err) {
      // Si ONVO no responde, no se cancela: se reintenta en la próxima ejecución.
      summary.errors++;
      console.error(`EXPIRE CARD ORDER ${id}:`, err.message);
    }
  }
  return summary;
}

module.exports = { getIntent, listIntents, isPaidFor, verifyCardOrder, expireAbandonedCardOrders, ABANDON_HOURS };
