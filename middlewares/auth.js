const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  // Obtén el token de las cookies (auth_token)
  const token = req.cookies.auth_token;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Acceso no autorizado. Token requerido." });
  }

  // Verifica el token con la clave secreta
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido o expirado." });
    }

    // Guarda la información del usuario en la solicitud para usarla en las rutas
    req.user = user;
    next(); // Si el token es válido, continúa con la siguiente función
  });
};

module.exports = authenticateToken;
