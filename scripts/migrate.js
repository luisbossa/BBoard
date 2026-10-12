/* ============================================================
   MIGRACIONES — aplica en orden los .sql de db/migrations que
   aún no estén en la tabla schema_migrations. Cada archivo corre
   en su propia transacción: si falla, no queda a medias.
   Uso: npm run migrate            (aplica pendientes)
        npm run migrate -- --status (solo lista)
        npm run migrate -- --dry-run (prueba y revierte)
============================================================ */
const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

const DIR = path.join(__dirname, "..", "db", "migrations");

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const pending = files.filter((f) => !applied.has(f));

  if (process.argv.includes("--status")) {
    files.forEach((f) => console.log(`${applied.has(f) ? "✔" : "·"} ${f}`));
    return pool.end();
  }

  // --dry-run: aplica todo en una transacción y la revierte (prueba segura).
  if (process.argv.includes("--dry-run")) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const file of pending) {
        await client.query(fs.readFileSync(path.join(DIR, file), "utf8"));
        console.log(`✔ ${file} (simulado)`);
      }
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    console.log("\nDry run OK: no se guardó ningún cambio.");
    return pool.end();
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(DIR, file), "utf8");
    await pool.transaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        file,
      ]);
    });
    console.log(`✔ ${file}`);
  }

  console.log(
    pending.length
      ? `\n${pending.length} migración(es) aplicada(s).`
      : "Sin migraciones pendientes.",
  );
  await pool.end();
})().catch(async (err) => {
  console.error("MIGRACIÓN FALLIDA:", err.message);
  await pool.end();
  process.exit(1);
});
