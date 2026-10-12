/* ============================================================
   ÍCONOS — genera config/icons.json con los íconos de Material
   Symbols que usa el panel. Las vistas piden a Google Fonts solo
   esos (icon_names): ~27 KB en lugar de ~1,3 MB de la familia completa.
   Detecta: texto dentro de .material-symbols-rounded / .icon y todo
   string literal que sea un nombre de ícono válido (íconos dinámicos).
   Uso: npm run icons   (volver a correrlo al usar un ícono nuevo)
============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIRS = ["views", "public/js", "utils", "services", "controllers"];
const OUT = path.join(ROOT, "config", "icons.json");
const CODEPOINTS =
  "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/" +
  "MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints";

function sourceFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ejs|js)$/.test(entry.name)) files.push(full);
    }
  };
  DIRS.forEach((d) => walk(path.join(ROOT, d)));
  return files;
}

// Íconos escritos directamente en el HTML (<span class="...material-symbols-rounded">nombre</span>).
function staticIcons(source) {
  const found = new Set();
  // Cualquier elemento cuya clase incluya "icon" o "material-symbols-rounded" (p. ej. "field__icon icon").
  for (const m of source.matchAll(/class="[^"]*\b(?:icon|material-symbols-rounded)\b[^"]*"[^>]*>\s*([a-z0-9_]+)\s*</g)) {
    found.add(m[1]);
  }
  return found;
}

// Usado por server.js en desarrollo: avisa si una vista usa un ícono que no está en icons.json.
function missingStaticIcons() {
  const known = new Set(require(OUT).names);
  const missing = new Set();
  for (const file of sourceFiles()) {
    for (const icon of staticIcons(fs.readFileSync(file, "utf8"))) {
      if (!known.has(icon)) missing.add(icon);
    }
  }
  return [...missing];
}

async function generate() {
  const res = await fetch(CODEPOINTS);
  if (!res.ok) throw new Error(`No se pudo descargar la lista de íconos (${res.status})`);
  const valid = new Set((await res.text()).split("\n").map((l) => l.split(" ")[0]).filter(Boolean));

  const used = new Set();
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, "utf8");
    staticIcons(source).forEach((icon) => valid.has(icon) && used.add(icon));
    for (const m of source.matchAll(/["'`]([a-z][a-z0-9_]{2,})["'`]/g)) {
      if (valid.has(m[1])) used.add(m[1]);
    }
  }

  // Google exige el orden alfabético en icon_names.
  const names = [...used].sort();
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), names }, null, 2) + "\n");
  console.log(`${names.length} íconos → config/icons.json`);
}

if (require.main === module) {
  generate().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { missingStaticIcons };
