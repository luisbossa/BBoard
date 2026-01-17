const pool = require("../db/pool");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Mostrar formulario de reset
exports.showResetForm = (req, res) => {
  res.render("reset-password");
};

// Enviar enlace de recuperación
exports.sendResetLink = async (req, res, next) => {
  try {
    const { username } = req.body; // aquí es mejor usar email

    // Buscar usuario por email
    const result = await pool.query(
      "SELECT * FROM public.users WHERE email = $1",
      [username] // en tu form "username" es en realidad el email
    );
    const user = result.rows[0];

    if (!user) {
      return res.render("reset-password", {
        message: "Si existe, te enviamos un enlace al correo.",
      });
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString("hex");
    const expireAt = new Date(Date.now() + 3600 * 1000); // 1 hora

    // Guardar token en DB
    await pool.query(
      "UPDATE public.users SET reset_token = $1, reset_token_expire = $2 WHERE id = $3",
      [token, expireAt, user.id]
    );

    // Generar enlace de reset
    const resetUrl = `${req.protocol}://${req.get("host")}/reset/${token}`;

    // Crear cuenta Ethereal para pruebas
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Soporte BBoard" <no-reply@bboard.com>',
      to: user.email,
      subject: "Restablece tu contraseña",
      html: `<p>Hola <strong>${user.full_name}</strong>, haz clic en el enlace para restablecer tu contraseña:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>El enlace expira en 1 hora.</p>`,
    });

    console.log(
      "URL de prueba (Ethereal):",
      nodemailer.getTestMessageUrl(info)
    );

    res.render("reset-password", {
      message: "Si existe, te enviamos un enlace al correo.",
    });
  } catch (err) {
    next(err);
  }
};

// Mostrar formulario para nueva contraseña
exports.showNewPasswordForm = async (req, res, next) => {
  const { token } = req.params;

  const result = await pool.query(
    "SELECT * FROM public.users WHERE reset_token = $1 AND reset_token_expire > NOW()",
    [token]
  );

  if (!result.rows[0]) {
    return res.send("Token inválido o expirado.");
  }

  res.render("reset-password-new", { token });
};

// Actualizar contraseña
exports.updatePassword = async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  const result = await pool.query(
    "SELECT * FROM public.users WHERE reset_token = $1 AND reset_token_expire > NOW()",
    [token]
  );
  const user = result.rows[0];

  if (!user) {
    return res.send("Token inválido o expirado.");
  }

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    "UPDATE public.users SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE id = $2",
    [hashed, user.id]
  );

  res.send(
    "Contraseña actualizada. Puedes <a href='/'>iniciar sesión</a> ahora."
  );
};
