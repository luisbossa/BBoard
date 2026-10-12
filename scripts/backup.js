/* ============================================================
   RESPALDO — copia todas las tablas de `public` a un JSON en
   backups/<fecha>.json (carpeta ignorada por git).
   Uso: npm run backup
============================================================ */
const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

(async () => {
  const { rows: tables } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );

  const dump = { createdAt: new Date().toISOString(), tables: {} };

  for (const { table_name: table } of tables) {
    const { rows } = await pool.query(`SELECT * FROM "${table}"`);
    dump.tables[table] = rows;
    console.log(`${table}: ${rows.length}`);
  }

  const dir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${dump.createdAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(dump, null, 2));

  console.log(`\nRespaldo guardado en ${file}`);
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
