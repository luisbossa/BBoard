const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");
const env = require("../config/env");
const onvoService = require("./onvoService");

/* ============================================================
   ESTADO DE INTEGRACIONES — comprueba, sin modificar datos, que
   el panel, la tienda, ONVO, el correo y el cron estén bien
   configurados. Cada chequeo devuelve:
   { id, title, ok: true | false | null, detail, fix }
   (null = no se pudo determinar / no aplica)
============================================================ */
const TIMEOUT = 8000;

const result = (id, title, ok, detail, fix = null) => ({ id, title, ok, detail, fix: ok ? null : fix });

// POST a la tienda con el secreto compartido.
const storePost = (route) =>
  fetch(`${env.storeUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Secret": env.sinpeWebhookSecret },
    body: "{}",
    signal: AbortSignal.timeout(TIMEOUT),
  });

async function database() {
  const { rows } = await pool.query(
    "SELECT name, applied_at FROM schema_migrations ORDER BY name DESC LIMIT 1",
  );
  const files = fs.readdirSync(path.join(__dirname, "..", "db", "migrations")).filter((f) => f.endsWith(".sql")).sort();
  const latest = files[files.length - 1];
  const upToDate = rows[0]?.name === latest;
  return result(
    "database",
    "Base de datos (Neon)",
    upToDate,
    upToDate ? `Conectada · migración ${latest}` : `Conectada, pero falta aplicar migraciones (última aplicada: ${rows[0]?.name || "ninguna"}).`,
    "Ejecuta npm run migrate en el panel.",
  );
}

async function storeSecret() {
  if (!env.sinpeWebhookSecret) {
    return result("store-secret", "Panel → tienda (correo de pedidos)", false,
      "Falta SINPE_WEBHOOK_SECRET en el panel.",
      "Define SINPE_WEBHOOK_SECRET con el mismo valor en el panel y en la tienda (Vercel) y vuelve a desplegar ambos.");
  }
  // Sin orderId: con el secreto correcto la tienda responde 400 (y no hace nada).
  const res = await storePost("/webhooks/order-paid");
  if (res.status === 400) {
    return result("store-secret", "Panel → tienda (correo de pedidos)", true, `La tienda (${env.storeUrl}) acepta el secreto compartido.`);
  }
  if (res.status === 401) {
    return result("store-secret", "Panel → tienda (correo de pedidos)", false,
      "La tienda rechaza el secreto: falta SINPE_WEBHOOK_SECRET en la tienda o no es igual al del panel.",
      "Copia exactamente el mismo valor de SINPE_WEBHOOK_SECRET en ambos proyectos de Vercel y vuelve a desplegar la tienda.");
  }
  return result("store-secret", "Panel → tienda (correo de pedidos)", false,
    `Respuesta inesperada de la tienda (${res.status}).`,
    `Revisa STORE_URL (${env.storeUrl}) y que la tienda tenga desplegada la versión con /webhooks/order-paid.`);
}

async function storeHealth() {
  const res = await storePost("/webhooks/health");
  if (res.status !== 200) return null; // el chequeo anterior ya explica el problema del secreto
  return res.json();
}

function storeChecks(health) {
  if (!health) {
    const unknown = "No se pudo consultar la tienda (revisa el secreto compartido).";
    return [
      result("store-mail", "Tienda → correo a clientes (Gmail)", null, unknown),
      result("store-onvo-key", "Tienda → ONVO (cobros)", null, unknown),
    ];
  }
  return [
    result("store-mail", "Tienda → correo a clientes (Gmail)", health.mail.configured && health.mail.ok,
      !health.mail.configured ? "Faltan MAIL_USER / MAIL_PASS en la tienda."
        : health.mail.ok ? "Gmail acepta las credenciales." : `Gmail rechazó la conexión: ${health.mail.error}`,
      "Define MAIL_USER y MAIL_PASS (contraseña de aplicación de Google) en la tienda y vuelve a desplegarla."),
    result("store-onvo-key", "Tienda → ONVO (cobros)", health.onvoKey.configured,
      health.onvoKey.configured ? `Llave configurada (modo ${health.onvoKey.mode || "desconocido"}).` : "Falta ONVOPAY_SECRET_KEY en la tienda.",
      "Define ONVOPAY_SECRET_KEY en la tienda y vuelve a desplegarla."),
  ];
}

async function onvoWebhook() {
  // Sin header: 401 = la tienda tiene el secreto; 500 = le falta.
  const res = await fetch(`${env.storeUrl}/onvo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const ok = res.status === 401;
  return result("onvo-webhook", "ONVO → tienda (aviso de pagos con tarjeta)", ok,
    ok ? "La tienda tiene ONVOPAY_WEBHOOK_SECRET y valida los avisos de ONVO."
      : res.status === 500 ? "Falta ONVOPAY_WEBHOOK_SECRET en la tienda: los pagos con tarjeta no se marcan solos."
        : `Respuesta inesperada (${res.status}).`,
    `En ONVO crea el webhook hacia ${env.storeUrl}/onvo (eventos payment-intent.succeeded y payment-intent.failed), copia su secreto en ONVOPAY_WEBHOOK_SECRET de la tienda y vuelve a desplegarla.`);
}

async function onvoKey() {
  if (!env.onvoSecretKey) {
    return result("onvo-key", "Panel → ONVO (verificar pagos)", false, "Falta ONVOPAY_SECRET_KEY en el panel.",
      "Define ONVOPAY_SECRET_KEY en el panel (la misma de la tienda) y vuelve a desplegarlo.");
  }
  const mode = env.onvoSecretKey.startsWith("onvo_live_") ? "producción" : env.onvoSecretKey.startsWith("onvo_test_") ? "pruebas" : "desconocido";
  await onvoService.request("/payment-intents/account?limit=1");
  return result("onvo-key", "Panel → ONVO (verificar pagos)", true, `ONVO acepta la llave (modo ${mode}).`);
}

async function cron() {
  const configured = Boolean(env.cronSecret);
  const { rows } = await pool.query(
    `SELECT max(created_at) AS last FROM user_activity
     WHERE user_id IS NULL AND metadata->>'reason' LIKE 'Pago con tarjeta no completado%'`,
  );
  const last = rows[0].last;
  return result("cron", "Cancelación automática (cron diario)", configured,
    configured
      ? `CRON_SECRET configurado. ${last ? `Última cancelación automática: ${new Date(last).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })}.` : "Todavía no ha cancelado ningún pedido."}`
      : "Falta CRON_SECRET: Vercel no podrá ejecutar la tarea diaria.",
    "Define CRON_SECRET (un valor aleatorio) en el panel y vuelve a desplegarlo.");
}

// Fotos de productos: se suben a Vercel Blob (sin token no se pueden crear productos con fotos nuevas).
async function blobStorage() {
  if (!env.blobToken) {
    return result("blob", "Fotos de productos (Vercel Blob)", false,
      "Falta BLOB_READ_WRITE_TOKEN: no se pueden subir fotos al crear o editar productos.",
      "En Vercel abre el proyecto del panel → Storage → crea (o conecta) un Blob store; Vercel agrega BLOB_READ_WRITE_TOKEN. Luego vuelve a desplegar.");
  }
  const { list } = require("@vercel/blob");
  await list({ limit: 1, token: env.blobToken });
  return result("blob", "Fotos de productos (Vercel Blob)", true, "Vercel Blob acepta el token: se pueden subir fotos.");
}

// Ejecuta un chequeo; si lanza error, lo muestra como fallo con su mensaje.
const safely = (id, title, fn, fix) =>
  fn().catch((err) => result(id, title, false, err.name === "TimeoutError" ? "Sin respuesta (tiempo agotado)." : err.message, fix));

async function runAll() {
  const [db, secret, webhook, key, cronCheck, blob] = await Promise.all([
    safely("database", "Base de datos (Neon)", database, "Revisa DATABASE_URL."),
    safely("store-secret", "Panel → tienda (correo de pedidos)", storeSecret, `Revisa STORE_URL (${env.storeUrl}).`),
    safely("onvo-webhook", "ONVO → tienda (aviso de pagos con tarjeta)", onvoWebhook, `Revisa STORE_URL (${env.storeUrl}).`),
    safely("onvo-key", "Panel → ONVO (verificar pagos)", onvoKey, "Revisa ONVOPAY_SECRET_KEY en el panel."),
    safely("cron", "Cancelación automática (cron diario)", cron, "Revisa la base de datos."),
    safely("blob", "Fotos de productos (Vercel Blob)", blobStorage, "Revisa BLOB_READ_WRITE_TOKEN (puede ser de otro proyecto o estar vencido)."),
  ]);
  const health = secret.ok ? await storeHealth().catch(() => null) : null;

  return [db, secret, ...storeChecks(health), webhook, key, cronCheck, blob];
}

module.exports = { runAll };
