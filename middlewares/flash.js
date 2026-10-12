/* ============================================================
   MENSAJES FLASH sin sesión de servidor (compatible con Vercel):
   res.flash("success", "Guardado") deja una cookie corta que se
   muestra y borra en la siguiente página.
============================================================ */
const COOKIE = "flash";

module.exports = (req, res, next) => {
  const raw = req.cookies[COOKIE];
  res.locals.flash = null;

  if (raw) {
    try {
      res.locals.flash = JSON.parse(raw);
    } catch {
      /* cookie corrupta: se ignora */
    }
    res.clearCookie(COOKIE);
  }

  res.flash = (type, message) => {
    res.cookie(COOKIE, JSON.stringify({ type, message }), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 1000,
    });
  };

  next();
};
