const env = require("../config/env");
const userService = require("../services/userService");
const mailer = require("../utils/mailer");
const { signIn, signOut, COOKIE } = require("../middlewares/auth");

const RESET_SENT = "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.";

exports.loginPage = (req, res) => {
  // Con sesión iniciada no tiene sentido ver el login.
  if (req.cookies[COOKIE]) return res.redirect("/dashboard");
  res.render("auth/login", { layout: false, error: null, username: "" });
};

exports.login = async (req, res) => {
  const { username, password, remember } = req.body;
  const user = await userService.authenticate(username, password);

  if (!user) {
    return res.status(401).render("auth/login", {
      layout: false,
      error: "Usuario o contraseña incorrectos",
      username: typeof username === "string" ? username : "",
    });
  }

  signIn(res, user, Boolean(remember));
  res.redirect("/dashboard");
};

exports.logout = (req, res) => {
  signOut(res);
  res.redirect("/");
};

/* ---------- Recuperación de contraseña ---------- */
exports.resetRequestPage = (req, res) => {
  res.render("auth/reset-request", { layout: false, message: null, error: null });
};

exports.resetRequest = async (req, res) => {
  const result = await userService.createResetToken(req.body.email).catch(() => null);

  if (result) {
    const url = `${env.appUrl}/reset/${result.token}`;
    try {
      await mailer.send({
        to: result.user.email,
        subject: "Restablece tu contraseña · Panel 100Puntadas",
        html: `<p>Hola <strong>${result.user.full_name}</strong>,</p>
               <p>Haz clic en el enlace para crear una nueva contraseña:</p>
               <p><a href="${url}">${url}</a></p>
               <p>El enlace caduca en 1 hora. Si no lo pediste, ignora este correo.</p>`,
      });
    } catch (err) {
      console.error("RESET MAIL ERROR:", err.message);
      return res.render("auth/reset-request", {
        layout: false,
        message: null,
        error: "No se pudo enviar el correo. Intenta más tarde.",
      });
    }
  }

  // Misma respuesta exista o no el correo (no revela usuarios).
  res.render("auth/reset-request", { layout: false, message: RESET_SENT, error: null });
};

exports.resetPage = async (req, res) => {
  const user = await userService.findByResetToken(req.params.token);
  res.render("auth/reset-new", {
    layout: false,
    token: req.params.token,
    invalid: !user,
    error: null,
  });
};

exports.resetSubmit = async (req, res) => {
  const { token } = req.params;
  const { password, confirm } = req.body;
  const user = await userService.findByResetToken(token);

  const fail = (error) =>
    res.status(400).render("auth/reset-new", { layout: false, token, invalid: !user, error });

  if (!user) return fail(null);
  if (password !== confirm) return fail("Las contraseñas no coinciden");

  try {
    await userService.setPassword(user.id, password);
  } catch (err) {
    if (err.status === 400) return fail(err.message);
    throw err;
  }

  res.render("auth/login", {
    layout: false,
    error: null,
    success: "Contraseña actualizada. Ya puedes iniciar sesión.",
    username: "",
  });
};
