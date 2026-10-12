const pool = require("../db/pool");
const HttpError = require("../utils/httpError");
const activityService = require("./activityService");

/* ============================================================
   PROMOCIONES (campañas de descuento) — la tienda aplica la campaña
   vigente al leer el catálogo (100puntadas utils/campaign.js), sin
   modificar los precios base. Mismas reglas aquí para la vista previa.
   Fechas: días calendario de Costa Rica; "hasta el 30" incluye todo el 30
   (ends_at = 1.º del día siguiente a las 00:00, exclusivo).
============================================================ */
const TZ = "America/Costa_Rica";

const STATUS_SQL = `
  CASE
    WHEN NOT c.active THEN 'disabled'
    WHEN c.ends_at IS NOT NULL AND c.ends_at <= now() THEN 'finished'
    WHEN c.starts_at > now() THEN 'scheduled'
    ELSE 'running'
  END`;

const COLUMNS = `
  c.*, ${STATUS_SQL} AS status,
  to_char(c.starts_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS start_date,
  to_char((c.ends_at AT TIME ZONE '${TZ}') - interval '1 day', 'YYYY-MM-DD') AS end_date`;

const discountedPrice = (price, percent) => Math.round((price * (100 - percent)) / 100);

// Igual que la tienda: ¿qué precio tendría este producto con la campaña?
function applyTo(product, campaign) {
  const onSale = product.discount === 1 || (product.old_price && product.old_price > product.price);
  if (campaign.skip_on_sale && onSale) return { ...product, applies: false, final_price: product.price };
  return { ...product, applies: true, final_price: discountedPrice(product.price, campaign.percent) };
}

async function list() {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM campaigns c ORDER BY c.starts_at DESC`);
  return rows;
}

async function getById(id) {
  if (!/^\d+$/.test(String(id))) throw new HttpError(404, "Promoción no encontrada");
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM campaigns c WHERE c.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, "Promoción no encontrada");
  return rows[0];
}

// Campaña vigente o la próxima programada (aviso en Productos).
async function currentOrNext() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM campaigns c
     WHERE c.active AND (c.ends_at IS NULL OR c.ends_at > now())
     ORDER BY c.starts_at LIMIT 1`,
  );
  return rows[0] || null;
}

// Vista previa: cómo quedan los precios de los productos visibles.
async function preview(campaign) {
  const { rows } = await pool.query(
    `SELECT id, name, main_image, price, old_price, discount FROM products WHERE active ORDER BY name`,
  );
  const items = rows.map((p) => applyTo(p, campaign));
  return {
    items,
    affected: items.filter((i) => i.applies).length,
    skipped: items.filter((i) => !i.applies).length,
  };
}

function parseForm(body) {
  const name = body.name?.trim();
  if (!name) throw new HttpError(400, "El nombre es obligatorio");

  const percent = Number(body.percent);
  if (!Number.isInteger(percent) || percent < 1 || percent > 90) {
    throw new HttpError(400, "El descuento debe ser un número entero entre 1 y 90");
  }

  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");
  if (!isDate(body.start_date)) throw new HttpError(400, "Fecha de inicio inválida");
  const endDate = body.no_end === "1" ? null : body.end_date;
  if (endDate !== null && !isDate(endDate)) throw new HttpError(400, "Fecha de fin inválida");
  if (endDate && endDate < body.start_date) throw new HttpError(400, "La fecha de fin es anterior a la de inicio");

  return {
    name,
    percent,
    startDate: body.start_date,
    endDate,
    bannerText: body.banner_text?.trim().slice(0, 160) || null,
    skipOnSale: body.skip_on_sale === "1",
    suspendBundle: body.suspend_bundle_promo === "1",
    active: body.active === "1",
  };
}

async function save(id, body, user) {
  const data = parseForm(body);
  const previous = id ? await getById(id) : null;

  return pool.transaction(async (client) => {
    // Dos campañas activas no pueden coincidir en el tiempo (la tienda aplica solo una).
    if (data.active) {
      const { rows: overlap } = await client.query(
        `SELECT name FROM campaigns
         WHERE active AND id <> COALESCE($1, 0)
           AND starts_at < COALESCE(($3::date + 1)::timestamp AT TIME ZONE '${TZ}', 'infinity')
           AND COALESCE(ends_at, 'infinity') > ($2::date)::timestamp AT TIME ZONE '${TZ}'
         LIMIT 1`,
        [previous?.id ?? null, data.startDate, data.endDate],
      );
      if (overlap[0]) {
        throw new HttpError(409, `Las fechas coinciden con la promoción activa "${overlap[0].name}".`);
      }
    }

    const values = [
      data.name, data.percent, data.startDate, data.endDate,
      data.bannerText, data.skipOnSale, data.suspendBundle, data.active,
    ];
    const dates = `($3::date)::timestamp AT TIME ZONE '${TZ}',
                   CASE WHEN $4::date IS NULL THEN NULL ELSE ($4::date + 1)::timestamp AT TIME ZONE '${TZ}' END`;

    const { rows } = previous
      ? await client.query(
          `UPDATE campaigns SET name = $1, percent = $2,
             (starts_at, ends_at) = (SELECT ${dates}),
             banner_text = $5, skip_on_sale = $6, suspend_bundle_promo = $7, active = $8
           WHERE id = $9 RETURNING id`,
          [...values, previous.id],
        )
      : await client.query(
          `INSERT INTO campaigns (name, percent, starts_at, ends_at, banner_text, skip_on_sale, suspend_bundle_promo, active)
           VALUES ($1, $2, ${dates}, $5, $6, $7, $8) RETURNING id`,
          values,
        );

    await activityService.log(
      user.id,
      previous ? "campaign_updated" : "campaign_created",
      { campaignId: rows[0].id, name: data.name, percent: data.percent },
      client,
    );
    return rows[0].id;
  });
}

async function setActive(id, active, user) {
  const campaign = await getById(id);
  if (active) {
    // Reutiliza la validación de solapamiento.
    return save(id, {
      name: campaign.name, percent: String(campaign.percent),
      start_date: campaign.start_date, end_date: campaign.end_date, no_end: campaign.ends_at ? "0" : "1",
      banner_text: campaign.banner_text, skip_on_sale: campaign.skip_on_sale ? "1" : "0",
      suspend_bundle_promo: campaign.suspend_bundle_promo ? "1" : "0", active: "1",
    }, user);
  }
  await pool.query("UPDATE campaigns SET active = false WHERE id = $1", [campaign.id]);
  await activityService.log(user.id, "campaign_deactivated", { campaignId: campaign.id, name: campaign.name });
}

async function remove(id, user) {
  const campaign = await getById(id);
  await pool.query("DELETE FROM campaigns WHERE id = $1", [campaign.id]);
  await activityService.log(user.id, "campaign_deleted", { campaignId: campaign.id, name: campaign.name });
  return campaign;
}

module.exports = { list, getById, currentOrNext, preview, applyTo, save, setActive, remove };
