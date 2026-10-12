// Servidor local para desarrollo (en Vercel se usa api/index.js).
const env = require("./config/env");
const app = require("./app");

app.listen(env.port, () => {
  console.log(`Panel en http://localhost:${env.port}`);
});
