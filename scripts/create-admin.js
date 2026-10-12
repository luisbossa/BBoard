/* ============================================================
   CREAR / RESTABLECER UN ADMINISTRADOR desde la terminal
   (útil si nadie puede entrar al panel).
   Uso: npm run create-admin -- <usuario> <contraseña> ["Nombre"] [correo]
   Si el usuario existe: le pone la contraseña, rol admin y lo activa.
============================================================ */
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");

const [username, password, fullName = "Administrador", email = null] = process.argv.slice(2);

(async () => {
  if (!username || !password || password.length < 8) {
    console.error('Uso: npm run create-admin -- <usuario> <contraseña (mín. 8)> ["Nombre"] [correo]');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (username, full_name, email, role, password, active)
     VALUES ($1, $2, $3, 'admin', $4, true)
     ON CONFLICT (username) DO UPDATE
       SET password = EXCLUDED.password, role = 'admin', active = true,
           email = COALESCE(EXCLUDED.email, users.email)
     RETURNING id, (xmax = 0) AS created`,
    [username, fullName, email, hash],
  );

  console.log(`${rows[0].created ? "Creado" : "Actualizado"} el administrador "${username}" (id ${rows[0].id}).`);
  await pool.end();
})().catch(async (err) => {
  console.error(err.message);
  await pool.end();
  process.exit(1);
});
