/* ============================================================
   SEED DEL CATÁLOGO — copia data/catalog.js y data/collections.js
   de la tienda a las tablas products*, collections*.
   - Por defecto solo inserta productos nuevos (no pisa ediciones
     hechas desde el panel). --force sobrescribe los existentes.
   - Al final enlaza order_items.product_id por nombre.
   Uso: npm run seed:catalog [-- --force]
   Ruta de la tienda: STORE_DIR (por defecto ../100puntadas Node)
============================================================ */
const path = require("path");
const pool = require("../db/pool");

const STORE_DIR = path.resolve(
  process.env.STORE_DIR || path.join(__dirname, "..", "..", "100puntadas Node"),
);
const force = process.argv.includes("--force");

const catalog = require(path.join(STORE_DIR, "data", "catalog.js"));
const collections = require(path.join(STORE_DIR, "data", "collections.js"));

async function upsertProduct(client, slug, p) {
  const values = [
    slug,
    p.name,
    p.productType,
    p.price,
    p.oldPrice ?? null,
    p.discount ?? 0,
    p.currency || "₡",
    p.description ?? null,
    p.description2 ?? null,
    p.images[0],
    p.stock ?? null,
  ];

  const { rows } = await client.query(
    `INSERT INTO products
       (slug, name, product_type, price, old_price, discount, currency,
        description, description2, main_image, stock)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (slug) DO ${
       force
         ? `UPDATE SET name=$2, product_type=$3, price=$4, old_price=$5, discount=$6,
            currency=$7, description=$8, description2=$9, main_image=$10, stock=$11`
         : "NOTHING"
     }
     RETURNING id`,
    values,
  );

  if (!rows.length) return null; // ya existía y no se fuerza

  const id = rows[0].id;
  await client.query("DELETE FROM product_images WHERE product_id = $1", [id]);
  await client.query("DELETE FROM product_sizes WHERE product_id = $1", [id]);
  await client.query("DELETE FROM product_styles WHERE product_id = $1", [id]);

  for (const [i, image] of p.images.entries()) {
    await client.query(
      "INSERT INTO product_images (product_id, image, position) VALUES ($1,$2,$3)",
      [id, image, i + 1],
    );
  }
  for (const [i, size] of (p.sizes || []).entries()) {
    await client.query(
      "INSERT INTO product_sizes (product_id, size, position) VALUES ($1,$2,$3)",
      [id, size, i + 1],
    );
  }
  for (const [i, style] of (p.styles || []).entries()) {
    await client.query(
      "INSERT INTO product_styles (product_id, label, image, position) VALUES ($1,$2,$3,$4)",
      [id, style.label, style.img ?? null, i + 1],
    );
  }
  return id;
}

(async () => {
  const result = await pool.transaction(async (client) => {
    let inserted = 0;
    for (const [slug, product] of Object.entries(catalog)) {
      if (await upsertProduct(client, slug, product)) inserted++;
    }

    for (const [i, col] of collections.entries()) {
      const { rows } = await client.query(
        `INSERT INTO collections (slug, name, position) VALUES ($1,$2,$3)
         ON CONFLICT (slug) DO ${force ? "UPDATE SET name=$2, position=$3" : "UPDATE SET slug = EXCLUDED.slug"}
         RETURNING id`,
        [col.id, col.title, i + 1],
      );
      const collectionId = rows[0].id;

      for (const [j, slug] of col.products.entries()) {
        await client.query(
          `INSERT INTO collection_products (collection_id, product_id, position)
           SELECT $1, id, $3 FROM products WHERE slug = $2
           ON CONFLICT (collection_id, product_id) DO ${force ? "UPDATE SET position = EXCLUDED.position" : "NOTHING"}`,
          [collectionId, slug, j + 1],
        );
      }
    }

    // Enlaza los ítems históricos con su producto (por nombre).
    const linked = await client.query(
      `UPDATE order_items oi SET product_id = p.id
       FROM products p
       WHERE oi.product_id IS NULL AND upper(trim(oi.product_name)) = upper(p.name)`,
    );

    return { inserted, linked: linked.rowCount };
  });

  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM products) products,
            (SELECT count(*) FROM product_images) images,
            (SELECT count(*) FROM collections) collections,
            (SELECT count(*) FROM collection_products) collection_products,
            (SELECT count(*) FROM order_items WHERE product_id IS NULL) items_sin_producto`,
  );

  console.log(`Productos procesados: ${result.inserted} (de ${Object.keys(catalog).length} en catalog.js)`);
  console.log(`Ítems de pedidos enlazados: ${result.linked}`);
  console.log(rows[0]);
  await pool.end();
})().catch(async (err) => {
  console.error("SEED FALLIDO:", err.message);
  await pool.end();
  process.exit(1);
});
