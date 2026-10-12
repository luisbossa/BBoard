const env = require("../config/env");
const userService = require("../services/userService");
const mailer = require("../utils/mailer");
const { signIn, signOut, COOKIE } = require("../middlewares/auth");

const RESET_SENT = "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.";

/* Páginas de acceso: layout propio (layouts/auth) y valores por defecto
   para que cada vista reciba siempre las mismas variables. */
const VIEWS = {
  login: { view: "auth/login", title: "Iniciar sesión" },
  resetRequest: { view: "auth/reset-request", title: "Recuperar contraseña" },
  resetNew: { view: "auth/reset-new", title: "Nueva contraseña" },
};

function renderAuth(res, page, data = {}, status = 200) {
  const { view, title } = VIEWS[page];
  res.status(status).render(view, {
    layout: "layouts/auth",
    title,
    error: null,
    success: null,
    message: null,
    username: "",
    ...data,
  });
}

exports.renderAuth = renderAuth;

exports.loginPage = (req, res) => {
  // Con sesión iniciada no tiene sentido ver el login.
  if (req.cookies[COOKIE]) return res.redirect("/dashboard");
  renderAuth(res, "login");
};

exports.login = async (req, res) => {
  const { username, password, remember } = req.body;
  const user = await userService.authenticate(username, password);

  if (!user) {
    return renderAuth(
      res,
      "login",
      {
        error: "Usuario o contraseña incorrectos",
        username: typeof username === "string" ? username : "",
      },
      401,
    );
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
  renderAuth(res, "resetRequest");
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
      return renderAuth(res, "resetRequest", {
        error: "No se pudo enviar el correo. Intenta más tarde.",
      });
    }
  }

  // Misma respuesta exista o no el correo (no revela usuarios).
  renderAuth(res, "resetRequest", { message: RESET_SENT });
};

exports.resetPage = async (req, res) => {
  const user = await userService.findByResetToken(req.params.token);
  renderAuth(res, "resetNew", { token: req.params.token, invalid: !user });
};

exports.resetSubmit = async (req, res) => {
  const { token } = req.params;
  const { password, confirm } = req.body;
  const user = await userService.findByResetToken(token);

  const fail = (error) => renderAuth(res, "resetNew", { token, invalid: !user, error }, 400);

  if (!user) return fail(null);
  if (password !== confirm) return fail("Las contraseñas no coinciden");

  try {
    await userService.setPassword(user.id, password);
  } catch (err) {
    if (err.status === 400) return fail(err.message);
    throw err;
  }

  renderAuth(res, "login", { success: "Contraseña actualizada. Ya puedes iniciar sesión." });
};
