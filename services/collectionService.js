const pool = require("../db/pool");
const HttpError = require("../utils/httpError");
const activityService = require("./activityService");
const { slugify } = require("./productService");

/* ============================================================
   COLECCIONES — las secciones de la home de 100puntadas y su menú.
   - collections.position: orden de las secciones en la home.
   - collection_products.position: orden de los productos en cada una.
   - slug: ancla del menú de la tienda (/#slug).
   La tienda las lee de la base (utils/catalog.js, caché de 30 s):
   solo muestra colecciones activas, con productos activos.
============================================================ */
const asArray = (value) => (value === undefined ? [] : [].concat(value));

async function list() {
  const { rows } = await pool.query(
    `SELECT c.id, c.slug, c.name, c.position, c.active,
            count(p.id)::int AS products,
            count(p.id) FILTER (WHERE p.active)::int AS visible
     FROM collections c
     LEFT JOIN collection_products cp ON cp.collection_id = c.id
     LEFT JOIN products p ON p.id = cp.product_id
     GROUP BY c.id
     ORDER BY c.position, c.id`,
  );
  return rows;
}

async function getById(id) {
  if (!/^\d+$/.test(String(id))) throw new HttpError(404, "Colección no encontrada");

  const { rows } = await pool.query("SELECT * FROM collections WHERE id = $1", [id]);
  if (!rows[0]) throw new HttpError(404, "Colección no encontrada");

  const [{ rows: products }, { rows: available }] = await Promise.all([
    pool.query(
      `SELECT p.id, p.name, p.main_image, p.active, p.stock
       FROM collection_products cp JOIN products p ON p.id = cp.product_id
       WHERE cp.collection_id = $1
       ORDER BY cp.position, p.name`,
      [id],
    ),
    pool.query(
      `SELECT p.id, p.name, p.main_image, p.active, p.stock
       FROM products p
       WHERE NOT EXISTS (
         SELECT 1 FROM collection_products cp WHERE cp.collection_id = $1 AND cp.product_id = p.id
       )
       ORDER BY p.active DESC, p.name`,
      [id],
    ),
  ]);

  return { ...rows[0], products, available };
}

// Para "Nueva colección": todos los productos están disponibles.
async function allProducts() {
  const { rows } = await pool.query(
    "SELECT id, name, main_image, active, stock FROM products ORDER BY active DESC, name",
  );
  return rows;
}

function parseForm(body) {
  const name = body.name?.trim();
  if (!name) throw new HttpError(400, "El nombre es obligatorio");
  if (name.length > 120) throw new HttpError(400, "El nombre es demasiado largo");

  const slug = slugify(body.slug || name);
  if (!slug) throw new HttpError(400, "Slug inválido");

  // Orden recibido del formulario; sin repetidos.
  const productIds = [...new Set(asArray(body.product_ids).map(Number).filter(Number.isInteger))];

  return { name, slug, active: body.active === "1", productIds };
}

const slugTaken = (err) =>
  err.code === "23505" && err.constraint === "collections_slug_key"
    ? new HttpError(409, "Ya existe una colección con ese slug")
    : err;

async function save(id, body, user) {
  const data = parseForm(body);
  const previous = id ? await getById(id) : null;

  try {
    return await pool.transaction(async (client) => {
      const { rows } = previous
        ? await client.query(
            "UPDATE collections SET name = $2, slug = $3, active = $4 WHERE id = $1 RETURNING id",
            [previous.id, data.name, data.slug, data.active],
          )
        : await client.query(
            `INSERT INTO collections (name, slug, active, position)
             VALUES ($1, $2, $3, (SELECT COALESCE(MAX(position), 0) + 1 FROM collections))
             RETURNING id`,
            [data.name, data.slug, data.active],
          );
      const collectionId = rows[0].id;

      // Productos en el orden elegido (los que ya no existen se ignoran).
      await client.query("DELETE FROM collection_products WHERE collection_id = $1", [collectionId]);
      if (data.productIds.length) {
        await client.query(
          `INSERT INTO collection_products (collection_id, product_id, position)
           SELECT $1, p.id, ids.ord
           FROM unnest($2::int[]) WITH ORDINALITY AS ids(id, ord)
           JOIN products p ON p.id = ids.id`,
          [collectionId, data.productIds],
        );
      }

      await activityService.log(
        user.id,
        previous ? "collection_updated" : "collection_created",
        { collectionId, name: data.name, products: data.productIds.length },
        client,
      );
      return collectionId;
    });
  } catch (err) {
    throw slugTaken(err);
  }
}

// Sube o baja una sección en la home (intercambia posición con la vecina).
async function move(id, direction, user) {
  if (!["up", "down"].includes(direction)) throw new HttpError(400, "Dirección inválida");

  await pool.transaction(async (client) => {
    // Normaliza posiciones 1..n por si hay huecos o empates.
    await client.query(
      `UPDATE collections c SET position = o.n
       FROM (SELECT id, row_number() OVER (ORDER BY position, id) AS n FROM collections) o
       WHERE o.id = c.id`,
    );
    const { rows } = await client.query("SELECT id, position, name FROM collections ORDER BY position");
    const index = rows.findIndex((r) => r.id === Number(id));
    if (index < 0) throw new HttpError(404, "Colección no encontrada");

    const other = rows[direction === "up" ? index - 1 : index + 1];
    if (!other) return; // ya está en el extremo

    await client.query("UPDATE collections SET position = $2 WHERE id = $1", [rows[index].id, other.position]);
    await client.query("UPDATE collections SET position = $2 WHERE id = $1", [other.id, rows[index].position]);
    await activityService.log(
      user.id,
      "collection_reordered",
      { collectionId: rows[index].id, name: rows[index].name, direction },
      client,
    );
  });
}

async function setActive(id, active, user) {
  const { rows } = await pool.query(
    "UPDATE collections SET active = $2 WHERE id = $1 RETURNING name",
    [id, active],
  );
  if (!rows[0]) throw new HttpError(404, "Colección no encontrada");
  await activityService.log(user.id, active ? "collection_activated" : "collection_deactivated", {
    collectionId: Number(id),
    name: rows[0].name,
  });
}

// Borra la sección; los productos siguen existiendo (collection_products cae en cascada).
async function remove(id, user) {
  const collection = await getById(id);
  await pool.query("DELETE FROM collections WHERE id = $1", [collection.id]);
  await activityService.log(user.id, "collection_deleted", {
    collectionId: collection.id,
    name: collection.name,
  });
  return collection;
}

module.exports = { list, getById, allProducts, save, move, setActive, remove };
