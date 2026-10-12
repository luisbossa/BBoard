/* ============================================================
   CONCILIACIÓN CON ONVO — una sola vez, para los pedidos con
   tarjeta anteriores a que la tienda guardara el payment_intent_id
   (y a que el webhook de ONVO funcionara).
   - Recorre los PaymentIntents de ONVO y los empareja por metadata.orderId.
   - Guarda el payment_intent_id en cada pedido.
   - Los que ONVO cobró (monto exacto) pasan a "pagado" SIN enviar correo
     (son compras antiguas; el cliente ya fue atendido o se le avisa a mano).
   Uso: npm run reconcile-onvo -- --dry-run   (solo reporte)
        npm run reconcile-onvo                (aplica)
============================================================ */
const pool = require("../db/pool");
const onvoService = require("../services/onvoService");
const orderService = require("../services/orderService");

const dryRun = process.argv.includes("--dry-run");

(async () => {
  const { rows: orders } = await pool.query(
    `SELECT id, order_number, total, status, created_at, payment_intent_id
     FROM orders WHERE payment_method = 'card' ORDER BY id`,
  );
  if (!orders.length) {
    console.log("No hay pedidos con tarjeta.");
    return pool.end();
  }

  // Todos los intents desde el primer pedido con tarjeta.
  const since = orders[0].created_at;
  const intentsByOrder = new Map();
  let cursor;
  let pages = 0;
  do {
    const page = await onvoService.listIntents({ startingAfter: cursor, since });
    for (const intent of page.data || []) {
      const orderId = Number(intent.metadata?.orderId);
      if (!orderId) continue;
      // Si hay varios intents para un pedido, prevalece el cobrado.
      const current = intentsByOrder.get(orderId);
      if (!current || intent.status === "succeeded") intentsByOrder.set(orderId, intent);
    }
    cursor = page.meta?.cursorNext;
    pages++;
  } while (cursor && pages < 50);

  const report = [];
  for (const order of orders) {
    const intent = intentsByOrder.get(order.id);
    const paidInOnvo = onvoService.isPaidFor(intent, order);
    let action = "—";

    if (intent && !order.payment_intent_id) {
      action = "guardar id";
      if (!dryRun) {
        await pool.query("UPDATE orders SET payment_intent_id = $2 WHERE id = $1", [order.id, intent.id]);
      }
    }
    if (paidInOnvo && order.status === "pending") {
      action = "MARCAR PAGADO";
      if (!dryRun) {
        await orderService.updateStatus(order.id, "paid", null, {
          reason: "Conciliación con ONVO",
          notifyStore: false,
        });
      }
    }

    report.push({
      pedido: order.order_number,
      estado: order.status,
      total: order.total,
      onvo: intent ? intent.status : "sin intent",
      monto_onvo: intent ? intent.amount / 100 : null,
      accion: action,
    });
  }

  console.table(report);
  console.log(`Intents leídos de ONVO: ${intentsByOrder.size} pedidos con intent (${pages} página(s)).`);
  console.log(dryRun ? "\nDRY RUN: no se guardó nada." : "\nConciliación aplicada.");
  await pool.end();
})().catch(async (err) => {
  console.error("CONCILIACIÓN FALLIDA:", err.message);
  await pool.end();
  process.exit(1);
});
