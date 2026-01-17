const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

exports.login = async (req, res, next) => {
  const { username, password, remember } = req.body; // extraemos remember directamente

  try {
    // Verificar si el username existe
    const result = await pool.query(
      "SELECT * FROM public.users WHERE username = $1",
      [username],
    );
    const user = result.rows[0];

    if (!user) {
      // Renderizamos login con error en lugar de JSON
      return res.render("login", {
        layout: false,
        error: "Usuario o contraseña incorrectos",
      });
    }

    // Comparar las contraseñas
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        layout: false,
        error: "Usuario o contraseña incorrectos",
      });
    }

    // Crear el token JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: remember ? "7d" : "2h" }, // 7 días si recuerda, 2 horas si no
    );

    // Guardar cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000,
    });

    return res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    return res.render("login", {
      layout: false,
      error: "Error al iniciar sesión. Intenta de nuevo.",
    });
  }
};

exports.resetPassword = (req, res) => {
  res.render("reset-password", { layout: false });
};
