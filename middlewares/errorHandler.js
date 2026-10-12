/* ============================================================
   404 y errores. Se responde según lo que pidió el cliente:
   - navegador enviando un formulario (POST) → vuelve a la página
     con un aviso (flash), nunca JSON
   - API / fetch (Accept: application/json o rutas /api/) → JSON
   - navegador pidiendo una página (GET) → vista error.ejs
============================================================ */
// Los navegadores siempre envían "Accept: text/html" al navegar o enviar un
// formulario; cualquier otro cliente (fetch, webhooks, curl) recibe JSON.
const wantsJson = (req) =>
  req.originalUrl.includes("/api/") ||
  !req.get("accept")?.includes("text/html") ||
  Boolean(req.is("application/json"));

function respond(req, res, status, message) {
  if (wantsJson(req)) {
    return res.status(status).json({ ok: false, message });
  }

  // Formulario: de vuelta a la página donde estaba, con el aviso.
  if (req.method !== "GET" && res.flash) {
    res.flash("error", message);
    return res.redirect(req.get("referer") || "/dashboard");
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

  // Errores propios (HttpError) muestran su mensaje; los inesperados, uno genérico.
  const message = tooLarge
    ? "La imagen supera el tamaño máximo (4 MB)."
    : err.expose
      ? err.message
      : "Ocurrió un error inesperado. Intenta de nuevo.";

  respond(req, res, status, message);
};
