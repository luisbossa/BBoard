const { Pool } = require("pg");
const env = require("../config/env");

/* ============================================================
   CONEXIÓN A POSTGRESQL (misma base que la tienda 100Puntadas)
   - Producción: Neon (requiere SSL).
   - Desarrollo: PostgreSQL local (sin SSL).
   Se decide por la URL; DATABASE_SSL=true/false lo fuerza.
============================================================ */
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(env.databaseUrl);
const useSSL = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === "true"
  : !isLocal;

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  // En Vercel cada función abre su propio pool: pocas conexiones y que se liberen rápido.
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("POSTGRES POOL ERROR:", err.message);
});

// Ejecuta fn(client) dentro de una transacción.
pool.transaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

module.exports = pool;
