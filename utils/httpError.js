// Error con código HTTP: los servicios lo lanzan y el errorHandler lo responde.
// Su mensaje está pensado para el usuario, así que se muestra tal cual
// (a diferencia de un error inesperado, que se oculta tras un mensaje genérico).
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

module.exports = HttpError;
