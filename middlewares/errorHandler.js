/* ============================================================
   404 y errores:
   - formulario HTML → vuelve a la página con un mensaje flash
   - API / fetch     → JSON { ok:false, message }
   - página          → vista error.ejs
============================================================ */
const isForm = (req) =>
  req.method !== "GET" &&
  Boolean(req.is("application/x-www-form-urlencoded", "multipart/form-data"));

const isJson = (req) =>
  req.originalUrl.includes("/api/") ||
  req.get("accept")?.includes("application/json") ||
  req.method !== "GET";

function respond(req, res, status, message) {
  if (isForm(req) && res.flash) {
    res.flash("error", message);
    return res.redirect(req.get("referer") || "/dashboard");
  }

  if (isJson(req)) {
    return res.status(status).json({ ok: false, message });
  }

  res.status(status).render("error", {
    layout: res.locals.currentUser ? "layouts/layout" : false,
    title: status === 404 ? "No encontrado" : "Error",
    status,
    message,
  });
}

exports.notFound = (req, res) => {
  respond(req, res, 404, "La página que buscas no existe.");
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  const tooLarge = err.code === "LIMIT_FILE_SIZE";
  const status = err.status || (tooLarge ? 413 : 500);

  if (status >= 500) console.error("ERROR:", err);

  const message = tooLarge
    ? "La imagen supera el tamaño máximo (4 MB)."
    : status >= 500
      ? "Ocurrió un error inesperado. Intenta de nuevo."
      : err.message;

  respond(req, res, status, message);
};
