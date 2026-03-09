const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

// const { Pool } = require("pg");

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE,
//   port: process.env.DB_PORT,
//   ssl: false
// });

// module.exports = pool;

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





