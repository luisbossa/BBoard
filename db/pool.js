const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME,
});

// (async () => {
//   try {
//     const client = await pool.connect();
//     const res = await client.query("SELECT NOW()");
//     console.log("✅ PostgreSQL conectado:", res.rows[0]);
//     client.release();
//   } catch (err) {
//     console.error("❌ Error conectando a PostgreSQL:", err.message);
//   }
// })();

module.exports = pool;

