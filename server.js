// Servidor local para desarrollo (en Vercel se usa api/index.js).
const env = require("./config/env");
const app = require("./app");

app.listen(env.port, () => {
  console.log(`Panel en http://localhost:${env.port}`);

  // Aviso en desarrollo: un ícono nuevo que no está en config/icons.json se vería como texto.
  const missing = require("./scripts/icons").missingStaticIcons();
  if (missing.length) {
    console.warn(`⚠ Íconos sin incluir en la fuente: ${missing.join(", ")}. Ejecuta npm run icons.`);
  }
});
