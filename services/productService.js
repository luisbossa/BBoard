const pool = require("../db/pool");
const HttpError = require("../utils/httpError");
const activityService = require("./activityService");
const blobService = require("./blobService");

/* ============================================================
   PRODUCTOS (products + product_images/sizes/styles + colecciones)
   - stock NULL = bajo pedido, 0 = agotado, >0 = unidades.
   - discount 1 = "oferta especial" (no aplica la promo 2x15%).
   - main_image siempre es la primera imagen de la galería.
============================================================ */
const TYPES = ["bikini", "one-piece", "crochet", "set"];
const SIZES = ["XS", "S", "M", "L", "XL"];
const PAGE_SIZE = 25;

const asArray = (value) => (value === undefined ? [] : [].concat(value));

const slugify = (text) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const toInt = (value, field, { required = false } = {}) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    if (required) throw new HttpError(400, `${field} es obligatorio`);
    return null;
  }
  const n = Number(String(value).replace(/[.\s₡]/g, ""));
  if (!Number.isInteger(n) || n < 0) throw new HttpError(400, `${field} inválido`);
  return n;
};

async function list({ q, type, status, page } = {}) {
  const current = Math.max(1, Number.parseInt(page, 10) || 1);
  const where = [];
  const params = [];

  if (q?.trim()) {
    params.push(q.trim());
    where.push(`(p.name ILIKE '%' || $${params.length} || '%' OR p.slug ILIKE '%' || $${params.length} || '%')`);
  }
  if (TYPES.includes(type)) {
    params.push(type);
    where.push(`p.product_type = $${params.length}`);
  }
  if (status === "active") where.push("p.active");
  if (status === "inactive") where.push("NOT p.active");
  if (status === "soldout") where.push("p.stock = 0");

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT p.id, p.slug, p.name, p.product_type, p.price, p.old_price, p.discount,
              p.main_image, p.stock, p.active, p.updated_at,
              COALESCE(s.units, 0)::int AS units_sold
       FROM products p
       LEFT JOIN (
         SELECT oi.product_id, SUM(oi.quantity) AS units
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status IN ('paid', 'shipped', 'delivered')
         GROUP BY oi.product_id
       ) s ON s.product_id = p.id
       ${clause}
       ORDER BY p.active DESC, p.name
       LIMIT ${PAGE_SIZE} OFFSET ${(current - 1) * PAGE_SIZE}`,
      params,
    ),
    pool.query(`SELECT count(*)::int AS total FROM products p ${clause}`, params),
  ]);

  const total = countRows[0].total;
  return {
    products: rows,
    pagination: { page: current, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total },
  };
}

async function getById(id) {
  if (!/^\d+$/.test(String(id))) throw new HttpError(404, "Producto no encontrado");

  const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
  if (!rows[0]) throw new HttpError(404, "Producto no encontrado");

  const [images, sizes, styles, collections] = await Promise.all([
    pool.query("SELECT image FROM product_images WHERE product_id = $1 ORDER BY position", [id]),
    pool.query("SELECT size FROM product_sizes WHERE product_id = $1 ORDER BY position", [id]),
    pool.query("SELECT label, image FROM product_styles WHERE product_id = $1 ORDER BY position", [id]),
    pool.query("SELECT collection_id FROM collection_products WHERE product_id = $1", [id]),
  ]);

  return {
    ...rows[0],
    images: images.rows.map((r) => r.image),
    sizes: sizes.rows.map((r) => r.size),
    styles: styles.rows,
    collectionIds: collections.rows.map((r) => r.collection_id),
  };
}

async function listCollections() {
  const { rows } = await pool.query(
    `SELECT c.id, c.slug, c.name, count(cp.product_id)::int AS products
     FROM collections c LEFT JOIN collection_products cp ON cp.collection_id = c.id
     GROUP BY c.id ORDER BY c.position`,
  );
  return rows;
}

// Valida y normaliza lo que llega del formulario.
function parseForm(body, uploadedUrls) {
  const name = body.name?.trim();
  if (!name) throw new HttpError(400, "El nombre es obligatorio");
  if (!TYPES.includes(body.product_type)) throw new HttpError(400, "Tipo de producto inválido");

  const slug = slugify(body.slug || name);
  if (!slug) throw new HttpError(400, "Slug inválido");

  const images = [...asArray(body.images).filter(Boolean), ...uploadedUrls];
  if (!images.length) throw new HttpError(400, "Agrega al menos una imagen");

  const price = toInt(body.price, "Precio", { required: true });
  const oldPrice = toInt(body.old_price, "Precio anterior");
  if (oldPrice !== null && oldPrice <= price) {
    throw new HttpError(400, "El precio anterior debe ser mayor al precio actual");
  }

  const styleLabels = asArray(body.style_label);
  const styleImages = asArray(body.style_image);
  const styles =
    body.product_type === "bikini"
      ? styleLabels
          .map((label, i) => ({ label: label.trim().toUpperCase(), image: styleImages[i]?.trim() || null }))
          .filter((s) => s.label)
      : [];

  return {
    slug,
    name: name.toUpperCase(),
    productType: body.product_type,
    price,
    oldPrice,
    discount: body.discount === "1" || oldPrice !== null ? 1 : 0,
    description: body.description?.trim() || null,
    description2: body.description2?.trim() || null,
    stock: body.stock_mode === "unlimited" ? null : toInt(body.stock, "Stock", { required: true }),
    active: body.active === "1",
    images,
    sizes: asArray(body.sizes).filter((s) => SIZES.includes(s)),
    styles,
    collectionIds: asArray(body.collections).map(Number).filter(Number.isInteger),
  };
}

async function saveChildren(client, productId, data) {
  await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);
  await client.query("DELETE FROM product_sizes WHERE product_id = $1", [productId]);
  await client.query("DELETE FROM product_styles WHERE product_id = $1", [productId]);

  for (const [i, image] of data.images.entries()) {
    await client.query(
      "INSERT INTO product_images (product_id, image, position) VALUES ($1, $2, $3)",
      [productId, image, i + 1],
    );
  }
  for (const [i, size] of data.sizes.entries()) {
    await client.query(
      "INSERT INTO product_sizes (product_id, size, position) VALUES ($1, $2, $3)",
      [productId, size, i + 1],
    );
  }
  for (const [i, style] of data.styles.entries()) {
    await client.query(
      "INSERT INTO product_styles (product_id, label, image, position) VALUES ($1, $2, $3, $4)",
      [productId, style.label, style.image, i + 1],
    );
  }

  // Colecciones: se agrega al final de las nuevas y se quita de las desmarcadas.
  await client.query(
    "DELETE FROM collection_products WHERE product_id = $1 AND NOT (collection_id = ANY($2::int[]))",
    [productId, data.collectionIds],
  );
  for (const collectionId of data.collectionIds) {
    await client.query(
      `INSERT INTO collection_products (collection_id, product_id, position)
       SELECT $1, $2, COALESCE(MAX(position), 0) + 1 FROM collection_products WHERE collection_id = $1
       ON CONFLICT (collection_id, product_id) DO NOTHING`,
      [collectionId, productId],
    );
  }
}

const slugTaken = (err) =>
  err.code === "23505" && err.constraint === "products_slug_key"
    ? new HttpError(409, "Ya existe un producto con ese slug")
    : err;

async function save(id, body, uploadedUrls, user) {
  const data = parseForm(body, uploadedUrls);
  const previous = id ? await getById(id) : null;

  const values = [
    data.slug, data.name, data.productType, data.price, data.oldPrice, data.discount,
    data.description, data.description2, data.images[0], data.stock, data.active,
  ];

  let productId;
  try {
    productId = await pool.transaction(async (client) => {
      const { rows } = previous
        ? await client.query(
            `UPDATE products SET slug=$1, name=$2, product_type=$3, price=$4, old_price=$5,
               discount=$6, description=$7, description2=$8, main_image=$9, stock=$10, active=$11
             WHERE id = $12 RETURNING id`,
            [...values, previous.id],
          )
        : await client.query(
            `INSERT INTO products (slug, name, product_type, price, old_price, discount,
               description, description2, main_image, stock, active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            values,
          );

      await saveChildren(client, rows[0].id, data);

      // Las URLs viejas siguen funcionando: la tienda redirige el slug anterior.
      await client.query("DELETE FROM product_slug_redirects WHERE old_slug = $1", [data.slug]);
      if (previous && previous.slug !== data.slug) {
        await client.query(
          `INSERT INTO product_slug_redirects (old_slug, product_id) VALUES ($1, $2)
           ON CONFLICT (old_slug) DO UPDATE SET product_id = EXCLUDED.product_id`,
          [previous.slug, previous.id],
        );
      }
      await activityService.log(
        user.id,
        previous ? "product_updated" : "product_created",
        { productId: rows[0].id, name: data.name },
        client,
      );
      return rows[0].id;
    });
  } catch (err) {
    // Si falla, se borran las imágenes recién subidas para no dejar basura en Blob.
    await Promise.all(uploadedUrls.map(blobService.remove));
    throw slugTaken(err);
  }

  // Imágenes de Blob que se quitaron de la galería.
  if (previous) {
    const removed = previous.images.filter((img) => !data.images.includes(img));
    await Promise.all(removed.map(blobService.remove));
  }

  return productId;
}

async function setActive(id, active, user) {
  const { rows } = await pool.query(
    "UPDATE products SET active = $2 WHERE id = $1 RETURNING name",
    [id, active],
  );
  if (!rows[0]) throw new HttpError(404, "Producto no encontrado");
  await activityService.log(user.id, active ? "product_activated" : "product_deactivated", {
    productId: Number(id),
    name: rows[0].name,
  });
}

// Con ventas se desactiva (conserva el historial); sin ventas se borra.
async function remove(id, user) {
  const product = await getById(id);
  const { rows } = await pool.query(
    "SELECT count(*)::int AS n FROM order_items WHERE product_id = $1",
    [product.id],
  );

  if (rows[0].n > 0) {
    await setActive(product.id, false, user);
    return { deleted: false };
  }

  await pool.query("DELETE FROM products WHERE id = $1", [product.id]);
  await activityService.log(user.id, "product_deleted", { productId: product.id, name: product.name });
  await Promise.all(product.images.map(blobService.remove));
  return { deleted: true };
}

module.exports = {
  TYPES,
  SIZES,
  slugify,
  list,
  getById,
  listCollections,
  save,
  setActive,
  remove,
};
