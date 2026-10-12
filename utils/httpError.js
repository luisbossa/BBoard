// Error con código HTTP: los servicios lo lanzan y el errorHandler lo responde.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
