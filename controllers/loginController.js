const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Verificar si el correo existe
    const result = await pool.query(
      "SELECT * FROM public.users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }

    // Comparar las contraseñas (bcrypt ya se encarga de comparar el hash con el texto plano)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }

    // Crear el JWT (token) con los datos del usuario
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET, // La clave secreta obtenida del archivo .env
      { expiresIn: "1h" } // Expira en 1 hora
    );

    // Redirigir al dashboard con el token
    res.cookie("auth_token", token, { httpOnly: true });  // Guarda el token en una cookie (opcional)
    return res.redirect("/dashboard"); // Redirigir al usuario al dashboard
  } catch (err) {
    next(err);
  }
};
