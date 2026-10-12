/* ============================================================
   FORMATO Y CATÁLOGOS DE ESTADOS — usado por servicios y vistas
   (expuesto en las vistas como `fmt`).
============================================================ */
const TIME_ZONE = "America/Costa_Rica";

// 30000 → "₡30.000"
const money = (amount) =>
  `₡${String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-CR", { timeZone: TIME_ZONE })
    : "—";

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("es-CR", {
        timeZone: TIME_ZONE,
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

// Para <input type="date">: "2026-10-11"
const isoDay = (value) =>
  value ? new Date(value).toLocaleDateString("en-CA", { timeZone: TIME_ZONE }) : "";

// "sábado, 11 de octubre"
const longDate = (value = new Date()) =>
  new Date(value).toLocaleDateString("es-CR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

// "hace 3 días" (tiempo relativo en español)
const RELATIVE = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];
const ago = (value) => {
  if (!value) return "—";
  const seconds = (new Date(value) - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return "hace un momento";
};

// Saludo según la hora en Costa Rica.
const greeting = () => {
  const hour = Number(
    new Date().toLocaleString("en-US", { timeZone: TIME_ZONE, hour: "numeric", hour12: false }),
  );
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
};

// Variación contra el periodo anterior: { label, trend: "up" | "down" | "flat" }
const delta = (current, previous) => {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (!before) return now ? { label: "Nuevo", trend: "up" } : { label: "Sin cambios", trend: "flat" };
  const change = Math.round(((now - before) / before) * 100);
  if (!change) return { label: "Igual", trend: "flat" };
  return { label: `${change > 0 ? "+" : ""}${change}%`, trend: change > 0 ? "up" : "down" };
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const ORDER_STATUS = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const PAYMENT_METHOD = {
  sinpe: "SINPE",
  card: "Tarjeta",
};

const PRODUCT_TYPE = {
  bikini: "Bikini",
  "one-piece": "Enterizo",
  crochet: "Tejido",
  set: "Set de playa",
};

const ROLE = {
  admin: "Administrador",
  manager: "Gestor",
  user: "Solo lectura",
};

// Bitácora (user_activity.action) → texto
const ACTIVITY = {
  order_paid: "marcó como pagado el pedido",
  order_shipped: "marcó como enviado el pedido",
  order_delivered: "marcó como entregado el pedido",
  order_cancelled: "canceló el pedido",
  order_notes: "actualizó las notas del pedido",
  product_created: "creó el producto",
  product_updated: "editó el producto",
  product_deleted: "eliminó el producto",
  product_activated: "mostró el producto",
  product_deactivated: "ocultó el producto",
  user_created: "creó un usuario",
  user_updated: "editó un usuario",
  user_activated: "activó un usuario",
  user_deactivated: "desactivó un usuario",
};

const status = (value) => ORDER_STATUS[value] || value || "—";
const payment = (value) => PAYMENT_METHOD[value] || value || "—";

// Las imágenes del catálogo son rutas de la tienda (/images/...) y se sirven
// a través del panel (/media/images/...), ver routes/mediaRoute.js.
// Las subidas desde el panel ya son URLs absolutas de Vercel Blob.
const storeImage = (src) => {
  if (!src) return "/images/user-default.webp";
  if (/^https?:\/\//.test(src)) return src;
  return `/media${src.startsWith("/") ? "" : "/"}${src}`;
};

module.exports = {
  money,
  date,
  dateTime,
  isoDay,
  longDate,
  ago,
  greeting,
  delta,
  plural,
  status,
  payment,
  storeImage,
  ACTIVITY,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PRODUCT_TYPE,
  ROLE,
};
