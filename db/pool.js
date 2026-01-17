const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

// (async () => {
//   try {
//     const client = await pool.connect();
//     const res = await client.query("SELECT NOW()");
//     console.log("PostgreSQL conectado:", res.rows[0]);
//     client.release();
//   } catch (err) {
//     console.error("Error conectando a PostgreSQL:", err.message);
//   }
// })();


