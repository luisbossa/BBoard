const env = require("./config/env");
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const expressLayouts = require("express-ejs-layouts");

const flash = require("./middlewares/flash");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const fmt = require("./utils/format");

const app = express();

// Vercel está detrás de un proxy: necesario para la IP real (rate limit) y cookies secure.
app.set("trust proxy", 1);

app.use(
  helmet({
    // Las vistas usan scripts inline y CDNs (ApexCharts, Google Fonts).
    contentSecurityPolicy: false,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));

/* ---------- Vistas ---------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/layout");
// Cada vista declara sus <link>/<script>; el layout los ubica en <head> y al final del <body>.
app.set("layout extractStyles", true);
app.set("layout extractScripts", true);

/* ---------- Archivos estáticos ----------
   CSS/JS se piden con ?v=<versión> (helper asset()): caché de un año
   y cada deploy cambia la versión. */
const ASSET_VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 8);

app.use((req, res, next) => {
  if (/^\/(css|js|images)\//.test(req.path)) {
    res.set(
      "Cache-Control",
      req.query.v ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    );
  }
  next();
});
app.use(express.static(path.join(__dirname, "public"), { cacheControl: false }));

/* ---------- Helpers disponibles en todas las vistas ---------- */
app.locals.asset = (file) => `${file}?v=${ASSET_VERSION}`;
app.locals.fmt = fmt;
app.locals.storeUrl = env.storeUrl;
app.locals.storeWhatsapp = env.storeWhatsapp;

app.use(flash);
app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.originalUrl = req.originalUrl;
  res.locals.currentUser = null;
  res.locals.title = "";
  next();
});

/* ---------- Rutas ---------- */
app.use("/media", require("./routes/mediaRoute"));
app.use("/api/cron", require("./routes/cronRoute"));
app.use("/", require("./routes/authRoute"));
app.use("/dashboard", require("./routes/dashboardRoute"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
