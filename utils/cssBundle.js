const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ============================================================
   CSS DEL PANEL EN UN SOLO ARCHIVO — junta y minifica las hojas
   comunes (en este orden) y se sirve como /css/panel.css?v=<hash>.
   Una sola petición bloqueante en lugar de 8. En producción se arma
   una vez al arrancar; en desarrollo, en cada petición.
============================================================ */
const DIR = path.join(__dirname, "..", "public", "css");
const FILES = [
  "global.css",
  "style.css",
  "header.css",
  "sidebar.css",
  "grid.css",
  "cards.css",
  "main-table.css",
  "admin.css",
];

// Minificación conservadora: solo quita comentarios y espacios que no cambian el significado.
function minify(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/:\s+/g, ":")
    .replace(/;}/g, "}")
    .trim();
}

function build() {
  const css = FILES.map((file) => minify(fs.readFileSync(path.join(DIR, file), "utf8"))).join("\n");
  const hash = crypto.createHash("sha1").update(css).digest("hex").slice(0, 10);
  return { css, hash };
}

let cached = null;
const isProduction = process.env.NODE_ENV === "production";

function get() {
  if (!isProduction) return build();
  cached ??= build();
  return cached;
}

module.exports = { get, FILES };
