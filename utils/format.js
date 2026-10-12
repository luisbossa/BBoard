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
  status,
  payment,
  storeImage,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PRODUCT_TYPE,
  ROLE,
};
