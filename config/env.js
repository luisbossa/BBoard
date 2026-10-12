/* ============================================================
   VARIABLES DE ENTORNO
   Un solo lugar para leerlas y validarlas. Si falta una
   obligatoria, la app no arranca (mejor que fallar a medias).
============================================================ */
require("dotenv").config({ quiet: true });

const REQUIRED = ["DATABASE_URL", "JWT_SECRET"];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
}

const trimSlash = (url) => (url || "").replace(/\/+$/, "");

module.exports = {
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 3001,

  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,

  // URL pública de este panel (enlaces en correos de recuperación).
  appUrl: trimSlash(process.env.APP_URL) || "http://localhost:3001",

  // Tienda 100Puntadas: imágenes con ruta relativa y webhook SINPE.
  storeUrl:
    trimSlash(process.env.STORE_URL || process.env.STORE_WEBHOOK_URL) ||
    "https://100puntadas.vercel.app",
  // WhatsApp de la tienda (hojas de pedido), formato internacional.
  storeWhatsapp: process.env.STORE_WHATSAPP || "50687925172",
  sinpeWebhookSecret:
    process.env.SINPE_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "",

  // ONVO Pay (solo lectura desde el panel: verificar pagos con tarjeta).
  onvoSecretKey: process.env.ONVOPAY_SECRET_KEY || "",
  // Vercel Cron envía "Authorization: Bearer <CRON_SECRET>".
  cronSecret: process.env.CRON_SECRET || "",

  blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",

  mail: {
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || "",
  },
};
