const jwt = require("jsonwebtoken");
const env = require("../config/env");
const userService = require("../services/userService");

/* ============================================================
   AUTENTICACIÓN (JWT en cookie httpOnly)
   En cada petición se recarga el usuario desde la DB: así un
   usuario desactivado pierde el acceso de inmediato y las vistas
   siempre tienen su nombre/rol actualizados.
============================================================ */
const COOKIE = "auth_token";
const SHORT_SESSION = 2 * 60 * 60; // 2 h
const LONG_SESSION = 7 * 24 * 60 * 60; // 7 días

const wantsJson = (req) =>
  req.originalUrl.includes("/api/") || req.get("accept")?.includes("application/json");

function signIn(res, user, remember) {
  const maxAge = remember ? LONG_SESSION : SHORT_SESSION;
  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: maxAge,
  });

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: maxAge * 1000,
  });
}

function signOut(res) {
  res.clearCookie(COOKIE);
}

async function requireAuth(req, res, next) {
  const deny = () => {
    signOut(res);
    return wantsJson(req)
      ? res.status(401).json({ ok: false, message: "Sesión expirada" })
      : res.redirect("/");
  };

  const token = req.cookies[COOKIE];
  if (!token) return deny();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return deny();
  }

  try {
    // `userId` es el formato de los tokens anteriores.
    const user = await userService.findActiveById(payload.sub ?? payload.userId);
    if (!user) return deny();

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Permite el paso solo a los roles indicados.
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (roles.includes(req.user?.role)) return next();

    if (wantsJson(req)) {
      return res.status(403).json({ ok: false, message: "No tienes permiso" });
    }
    res.status(403).render("error", {
      title: "Sin permiso",
      status: 403,
      message: "Tu usuario no tiene permiso para esta acción.",
    });
  };

// admin y manager operan la tienda; "user" es solo lectura.
const canEdit = requireRole("admin", "manager");

module.exports = { requireAuth, requireRole, canEdit, signIn, signOut, COOKIE };
